import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { config } from '../config/env.js';
import { Employee, FaceTemplate } from '../models/index.js';
import { logAudit } from './audit.service.js';

export const FACE_DESCRIPTOR_LENGTH = 128;
export const FACE_CAPTURE_COUNT = 3;
export const FACE_MODEL_VERSION = 'vladmandic-face-api-1.7.15-face-recognition-128d';

const getEncryptionKey = () => {
  if (!/^[\da-f]{64}$/i.test(config.face.encryptionKey)) {
    const err = new Error('Face registration is unavailable until FACE_ENCRYPTION_KEY is configured.');
    err.statusCode = 503;
    throw err;
  }
  return Buffer.from(config.face.encryptionKey, 'hex');
};

export const validateFaceDescriptor = (descriptor) => {
  if (
    !Array.isArray(descriptor) ||
    descriptor.length !== FACE_DESCRIPTOR_LENGTH ||
    descriptor.some((value) => typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1)
  ) {
    const err = new Error('A valid 128-value face descriptor is required.');
    err.statusCode = 422;
    throw err;
  }
  return descriptor;
};

export const faceDescriptorDistance = (left, right) => {
  validateFaceDescriptor(left);
  validateFaceDescriptor(right);
  return Math.sqrt(left.reduce((sum, value, index) => sum + (value - right[index]) ** 2, 0));
};

const averageDescriptors = (descriptors) => {
  if (!Array.isArray(descriptors) || descriptors.length !== FACE_CAPTURE_COUNT) {
    const err = new Error(`Exactly ${FACE_CAPTURE_COUNT} face captures are required.`);
    err.statusCode = 422;
    throw err;
  }

  const validated = descriptors.map(validateFaceDescriptor);
  for (let i = 0; i < validated.length; i += 1) {
    for (let j = i + 1; j < validated.length; j += 1) {
      if (faceDescriptorDistance(validated[i], validated[j]) > config.face.matchThreshold) {
        const err = new Error('Face captures did not consistently match. Please retake the registration.');
        err.statusCode = 422;
        throw err;
      }
    }
  }

  return validated[0].map(
    (_, index) => validated.reduce((sum, descriptor) => sum + descriptor[index], 0) / validated.length
  );
};

const encryptDescriptor = (descriptor) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(descriptor), 'utf8'),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
};

const decryptDescriptor = (template) => {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(template.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(template.authTag, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(template.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  return validateFaceDescriptor(JSON.parse(plaintext));
};

export const getFaceRegistrationStatuses = async (employeeIds) => {
  const templates = await FaceTemplate.find({ employeeId: { $in: employeeIds } }).select('employeeId');
  return new Set(templates.map((template) => String(template.employeeId)));
};

export const saveEmployeeFaceTemplate = async ({
  employeeId,
  descriptors,
  consentConfirmed,
  actingUser,
  ip,
  replace = false,
}) => {
  getEncryptionKey();
  if (consentConfirmed !== true) {
    const err = new Error('Employee consent must be confirmed before face registration.');
    err.statusCode = 400;
    throw err;
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }
  if (employee.employmentStatus === 'Terminated' || employee.employmentStatus === 'Resigned') {
    const err = new Error('Face attendance cannot be registered for an inactive employee.');
    err.statusCode = 409;
    throw err;
  }

  const descriptor = averageDescriptors(descriptors);
  const encrypted = encryptDescriptor(descriptor);
  const existing = await FaceTemplate.findOne({ employeeId });

  if (replace && !existing) {
    const err = new Error('No face registration exists to update.');
    err.statusCode = 404;
    throw err;
  }
  if (!replace && existing) {
    const err = new Error('This employee already has a face registration. Use explicit re-enrollment to replace it.');
    err.statusCode = 409;
    throw err;
  }

  const consentedAt = new Date();
  if (replace) {
    await FaceTemplate.updateOne(
      { employeeId },
      {
        $set: {
          ...encrypted,
          modelVersion: FACE_MODEL_VERSION,
          registeredBy: actingUser._id,
          consentedAt,
        },
      }
    );
  } else {
    await FaceTemplate.create({
      employeeId,
      ...encrypted,
      modelVersion: FACE_MODEL_VERSION,
      registeredBy: actingUser._id,
      consentedAt,
    });
  }

  await logAudit({
    userId: actingUser._id,
    userEmail: actingUser.email,
    userRole: actingUser.role,
    action: replace ? 'UPDATE_EMPLOYEE_FACE_TEMPLATE' : 'REGISTER_EMPLOYEE_FACE_TEMPLATE',
    entity: 'FaceTemplate',
    entityId: employeeId,
    details: { modelVersion: FACE_MODEL_VERSION, consentConfirmed: true },
    ip,
  });

  return { employeeId: String(employeeId), faceRegistered: true, consentedAt };
};

export const deleteEmployeeFaceTemplate = async ({ employeeId, actingUser, ip }) => {
  const result = await FaceTemplate.deleteOne({ employeeId });
  if (!result.deletedCount) {
    const err = new Error('No face registration exists for this employee.');
    err.statusCode = 404;
    throw err;
  }

  await logAudit({
    userId: actingUser._id,
    userEmail: actingUser.email,
    userRole: actingUser.role,
    action: 'DELETE_EMPLOYEE_FACE_TEMPLATE',
    entity: 'FaceTemplate',
    entityId: employeeId,
    details: null,
    ip,
  });

  return { employeeId: String(employeeId), faceRegistered: false };
};

export const verifyEmployeeFace = async (employeeId, descriptor) => {
  const capturedDescriptor = validateFaceDescriptor(descriptor);
  const employee = await Employee.findById(employeeId);
  if (!employee || employee.employmentStatus === 'Terminated' || employee.employmentStatus === 'Resigned') {
    const err = new Error('Face attendance is unavailable for this employee account.');
    err.statusCode = 403;
    throw err;
  }
  const template = await FaceTemplate.findOne({ employeeId }).select(
    '+ciphertext +iv +authTag'
  );
  if (!template) {
    const err = new Error('Face attendance is not registered for this employee.');
    err.statusCode = 409;
    throw err;
  }

  const registeredDescriptor = decryptDescriptor(template);
  const distance = faceDescriptorDistance(registeredDescriptor, capturedDescriptor);
  if (distance > config.face.matchThreshold) {
    const err = new Error('Face verification failed. The captured face did not match your registration.');
    err.statusCode = 422;
    throw err;
  }
  return true;
};
