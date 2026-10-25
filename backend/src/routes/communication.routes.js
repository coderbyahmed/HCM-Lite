import { Router } from 'express';
import {
  listAnnouncements,
  createAnnouncement,
  listNotifications,
} from '../controllers/communication.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/announcements', authenticate, listAnnouncements);
router.post('/announcements', authenticate, requireRole('Admin', 'HR'), createAnnouncement);
router.get('/notifications', authenticate, listNotifications);

export default router;
