import { Router } from 'express';
import { handleAiChat, getExecutiveSummary } from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/chat', authenticate, handleAiChat);
router.get('/executive-summary', authenticate, getExecutiveSummary);

export default router;
