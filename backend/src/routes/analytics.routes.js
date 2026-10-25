import { Router } from 'express';
import {
  getAdminMetrics,
  getHrMetrics,
  getEmployeeMetrics,
  getAudits,
} from '../controllers/analytics.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/admin', authenticate, requireRole('Admin'), getAdminMetrics);
router.get('/hr', authenticate, requireRole('Admin', 'HR'), getHrMetrics);
router.get('/employee', authenticate, getEmployeeMetrics);
router.get('/audits', authenticate, requireRole('Admin'), getAudits); // Admin only can view audit logs

export default router;
