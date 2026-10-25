import { Router } from 'express';
import {
  generateDraft,
  finalize,
  list,
  getById,
  getPayslip,
} from '../controllers/payroll.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/generate-draft', authenticate, requireRole('Admin', 'HR'), generateDraft);
router.patch('/:id/finalize', authenticate, requireRole('Admin'), finalize); // Admin only can finalize
router.get('/', authenticate, list);
router.get('/:id', authenticate, requireRole('Admin', 'HR'), getById);
router.get('/:payrollId/payslips/:employeeId', authenticate, getPayslip);

export default router;
