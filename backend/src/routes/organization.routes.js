import { Router } from 'express';
import {
  getProfile,
  updateSettings,
  getDepartments,
  createDepartment,
  getDesignations,
  createDesignation,
} from '../controllers/organization.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/profile', authenticate, getProfile);
router.patch('/settings', authenticate, requireRole('Admin'), updateSettings);

router.get('/departments', authenticate, getDepartments);
router.post('/departments', authenticate, requireRole('Admin'), createDepartment);

router.get('/designations', authenticate, getDesignations);
router.post('/designations', authenticate, requireRole('Admin'), createDesignation);

export default router;
