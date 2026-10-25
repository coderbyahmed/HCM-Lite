import { Router } from 'express';
import {
  apply,
  cancel,
  getMyBalance,
  calculateDaysPreview,
  list,
  review,
} from '../controllers/leave.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/apply', authenticate, apply);
router.patch('/:id/cancel', authenticate, cancel);
router.get('/my-balance', authenticate, getMyBalance);
router.get('/calculate-days', authenticate, calculateDaysPreview);
router.get('/', authenticate, list);
router.patch('/:id/review', authenticate, requireRole('Admin', 'HR'), review);

export default router;
