import {
  getEmployeesList,
  getEmployee360Profile,
  createEmployee,
  updateEmployee,
  validateCsvImport,
  executeCsvImport,
} from '../services/employee.service.js';
import { Employee, Department, Designation } from '../models/index.js';
import { stringify } from 'csv-stringify/sync';
import {
  deleteEmployeeFaceTemplate,
  saveEmployeeFaceTemplate,
} from '../services/face.service.js';

export const list = async (req, res, next) => {
  try {
    const { page, limit, search, departmentId, status, sortBy, sortOrder } = req.query;
    const result = await getEmployeesList({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      departmentId,
      status,
      sortBy,
      sortOrder,
      actingUser: req.user,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await getEmployee360Profile(id, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const result = await createEmployee(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: 'Employee created successfully.', data: result });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await updateEmployee(id, req.body, req.user, req.ip);
    res.json({ success: true, message: 'Employee updated successfully.', employee: result });
  } catch (err) {
    next(err);
  }
};

export const registerFace = async (req, res, next) => {
  try {
    const result = await saveEmployeeFaceTemplate({
      employeeId: req.params.id,
      descriptors: req.body.descriptors,
      consentConfirmed: req.body.consentConfirmed,
      actingUser: req.user,
      ip: req.ip,
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const updateFace = async (req, res, next) => {
  try {
    const result = await saveEmployeeFaceTemplate({
      employeeId: req.params.id,
      descriptors: req.body.descriptors,
      consentConfirmed: req.body.consentConfirmed,
      actingUser: req.user,
      ip: req.ip,
      replace: true,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const deleteFace = async (req, res, next) => {
  try {
    const result = await deleteEmployeeFaceTemplate({
      employeeId: req.params.id,
      actingUser: req.user,
      ip: req.ip,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const csvDryRun = async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Array of rows is required.' });
    }
    const report = await validateCsvImport(rows);
    res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
};

export const csvCommit = async (req, res, next) => {
  try {
    const { validRows } = req.body;
    if (!Array.isArray(validRows) || validRows.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid rows provided to commit.' });
    }
    const results = await executeCsvImport(validRows, req.user, req.ip);
    res.json({
      success: true,
      message: `Successfully imported ${results.length} employees.`,
      count: results.length,
      employees: results.map((r) => r.employee),
    });
  } catch (err) {
    next(err);
  }
};

export const exportCsv = async (req, res, next) => {
  try {
    const employees = await Employee.find({});
    const departments = await Department.find({});
    const designations = await Designation.find({});
    const deptMap = Object.fromEntries(departments.map((d) => [d._id, d.name]));
    const desMap = Object.fromEntries(designations.map((d) => [d._id, d.title]));

    const data = employees.map((e) => ({
      'Employee Code': e.employeeCode,
      'First Name': e.firstName,
      'Last Name': e.lastName,
      'Email': e.email,
      'Phone': e.phone || '',
      'Department': deptMap[e.departmentId] || 'Unassigned',
      'Designation': desMap[e.designationId] || 'Unassigned',
      'Employment Status': e.employmentStatus,
      'Joining Date': e.joiningDate,
      'Basic Salary': e.salaryStructure?.basicSalary || 0,
      'HRA Allowance': e.salaryStructure?.hraAllowance || 0,
      'Medical Allowance': e.salaryStructure?.medicalAllowance || 0,
      'Gross Salary': e.salaryStructure?.grossSalary || 0,
    }));

    const csvOutput = stringify(data, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hcm_employees.csv"');
    res.send(csvOutput);
  } catch (err) {
    next(err);
  }
};
