import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getBoard,
  getMyAttendance,
  createCorrection,
  listCorrections,
  reviewCorrection,
} from '../controllers/attendance.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/check-in', authenticate, checkIn);
router.post('/check-out', authenticate, checkOut);
router.get('/board', authenticate, requireRole('Admin', 'HR'), getBoard);
router.get('/my-records', authenticate, getMyAttendance);

router.post('/corrections', authenticate, createCorrection);
router.get('/corrections', authenticate, listCorrections);
router.patch('/corrections/:id/review', authenticate, requireRole('Admin', 'HR'), reviewCorrection);

export default router;
