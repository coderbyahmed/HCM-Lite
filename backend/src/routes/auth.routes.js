import { Router } from 'express';
import {
  checkSetupStatus,
  setupFirstRun,
  login,
  refresh,
  logout,
  changeUserPassword,
  getMe,
  listUsers,
  createHR,
  toggleStatus,
} from '../controllers/auth.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/setup/status', checkSetupStatus);
router.post('/setup/first-run', setupFirstRun);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changeUserPassword);

// Admin-only user management
router.get('/users', authenticate, requireRole('Admin'), listUsers);
router.post('/users/hr', authenticate, requireRole('Admin'), createHR);
router.patch('/users/:userId/toggle-status', authenticate, requireRole('Admin'), toggleStatus);

export default router;
