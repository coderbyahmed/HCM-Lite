import { getCompanyProfile, updateCompanySettings } from '../services/organization.service.js';
import { Department, Designation } from '../models/index.js';
import { logAudit } from '../services/audit.service.js';

export const getProfile = async (req, res, next) => {
  try {
    const profile = await getCompanyProfile();
    res.json({ success: true, company: profile });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const updated = await updateCompanySettings(req.body, req.user, req.ip);
    res.json({ success: true, company: updated });
  } catch (err) {
    next(err);
  }
};

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({});
    res.json({ success: true, departments });
  } catch (err) {
    next(err);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required.' });

    const dept = await Department.create({ name: name.trim(), description: description?.trim() || '' });
    await logAudit({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'CREATE_DEPARTMENT',
      entity: 'Department',
      entityId: dept._id,
      details: { name },
      ip: req.ip,
    });

    res.status(201).json({ success: true, department: dept });
  } catch (err) {
    next(err);
  }
};

export const getDesignations = async (req, res, next) => {
  try {
    const designations = await Designation.find({});
    res.json({ success: true, designations });
  } catch (err) {
    next(err);
  }
};

export const createDesignation = async (req, res, next) => {
  try {
    const { title, departmentId, description } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Designation title is required.' });

    const des = await Designation.create({
      title: title.trim(),
      departmentId: departmentId || null,
      description: description?.trim() || '',
    });

    await logAudit({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'CREATE_DESIGNATION',
      entity: 'Designation',
      entityId: des._id,
      details: { title },
      ip: req.ip,
    });

    res.status(201).json({ success: true, designation: des });
  } catch (err) {
    next(err);
  }
};
