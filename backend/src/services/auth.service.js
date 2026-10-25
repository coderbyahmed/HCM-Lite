import { User, Employee, Company } from '../models/index.js';
import { hashPassword, comparePassword, generateTokens, verifyRefreshToken } from '../utils/crypto.js';
import { logAudit } from './audit.service.js';

export const loginUser = async ({ email, password, ip = '127.0.0.1' }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  if (user.status === 'inactive') {
    const error = new Error('Your account has been deactivated. Please contact HR or Administrator.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const tokens = generateTokens(user);

  let linkedEmployee = null;
  if (user.employeeId) {
    linkedEmployee = await Employee.findById(user.employeeId);
  }

  const company = await Company.findOne({});

  await logAudit({
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    action: 'USER_LOGIN',
    entity: 'User',
    entityId: user._id,
    ip,
  });

  return {
    user: {
      _id: user._id,
      name: user.name || (linkedEmployee ? `${linkedEmployee.firstName} ${linkedEmployee.lastName}` : user.email),
      email: user.email,
      role: user.role,
      employeeId: user.employeeId || null,
      mustChangePassword: !!user.mustChangePassword,
      status: user.status,
    },
    employee: linkedEmployee,
    company: company
      ? {
          _id: company._id,
          name: company.name,
          settings: company.settings,
        }
      : null,
    tokens,
  };
};

export const refreshToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    const error = new Error('Refresh token is required.');
    error.statusCode = 400;
    throw error;
  }

  const decoded = verifyRefreshToken(incomingRefreshToken);
  const user = await User.findById(decoded.userId);

  if (!user || user.status === 'inactive') {
    const error = new Error('Invalid refresh token.');
    error.statusCode = 401;
    throw error;
  }

  return generateTokens(user);
};

export const changePassword = async ({ userId, oldPassword, newPassword, ip = '127.0.0.1' }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await comparePassword(oldPassword, user.password);
  if (!isMatch) {
    const error = new Error('Current password is incorrect.');
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error('New password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  const hashed = await hashPassword(newPassword);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        password: hashed,
        mustChangePassword: false,
      },
    }
  );

  await logAudit({
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    action: 'CHANGE_PASSWORD',
    entity: 'User',
    entityId: user._id,
    ip,
  });

  return { success: true, message: 'Password updated successfully.' };
};

export const createHRUser = async ({ name, email, password }, actingAdmin, ip) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const error = new Error('A user with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await hashPassword(password);
  const hrUser = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role: 'HR',
    status: 'active',
    mustChangePassword: true,
  });

  await logAudit({
    userId: actingAdmin._id,
    userEmail: actingAdmin.email,
    userRole: actingAdmin.role,
    action: 'CREATE_HR_USER',
    entity: 'User',
    entityId: hrUser._id,
    details: { email: normalizedEmail, name },
    ip,
  });

  return {
    _id: hrUser._id,
    name: hrUser.name,
    email: hrUser.email,
    role: hrUser.role,
    status: hrUser.status,
  };
};

export const toggleUserStatus = async (targetUserId, actingAdmin, ip) => {
  if (String(targetUserId) === String(actingAdmin._id)) {
    const error = new Error('You cannot deactivate your own administrative account.');
    error.statusCode = 400;
    throw error;
  }

  const target = await User.findById(targetUserId);
  if (!target) {
    const error = new Error('Target user not found.');
    error.statusCode = 404;
    throw error;
  }

  const newStatus = target.status === 'active' ? 'inactive' : 'active';
  await User.updateOne({ _id: target._id }, { $set: { status: newStatus } });

  await logAudit({
    userId: actingAdmin._id,
    userEmail: actingAdmin.email,
    userRole: actingAdmin.role,
    action: 'TOGGLE_USER_STATUS',
    entity: 'User',
    entityId: target._id,
    details: { newStatus },
    ip,
  });

  return { _id: target._id, status: newStatus };
};
