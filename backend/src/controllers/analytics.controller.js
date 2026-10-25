import {
  getAdminDashboardData,
  getHrDashboardData,
  getEmployeeDashboardData,
} from '../services/analytics.service.js';
import { getAuditLogs } from '../services/audit.service.js';

export const getAdminMetrics = async (req, res, next) => {
  try {
    const data = await getAdminDashboardData();
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const getHrMetrics = async (req, res, next) => {
  try {
    const data = await getHrDashboardData();
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const getEmployeeMetrics = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No linked employee record for this user.' });
    }
    const data = await getEmployeeDashboardData(employeeId);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const getAudits = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const result = await getAuditLogs(limit, page);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};
