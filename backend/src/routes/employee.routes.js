import { Router } from 'express';
import {
  list,
  getProfile,
  create,
  update,
  csvDryRun,
  csvCommit,
  exportCsv,
  registerFace,
  updateFace,
  deleteFace,
} from '../controllers/employee.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, list);
router.get('/export/csv', authenticate, requireRole('Admin', 'HR'), exportCsv);
router.post('/import/dry-run', authenticate, requireRole('Admin', 'HR'), csvDryRun);
router.post('/import/commit', authenticate, requireRole('Admin', 'HR'), csvCommit);
router.post('/:id/face-template', authenticate, requireRole('Admin', 'HR'), registerFace);
router.put('/:id/face-template', authenticate, requireRole('Admin', 'HR'), updateFace);
router.delete('/:id/face-template', authenticate, requireRole('Admin', 'HR'), deleteFace);

router.get('/:id', authenticate, getProfile);
router.post('/', authenticate, requireRole('Admin', 'HR'), create);
router.patch('/:id', authenticate, update); // Authorization checked inside service (self for Employee, any for Admin/HR)

export default router;
