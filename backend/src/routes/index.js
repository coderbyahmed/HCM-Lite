import { Router } from 'express';
import authRoutes from './auth.routes.js';
import orgRoutes from './organization.routes.js';
import employeeRoutes from './employee.routes.js';
import attendanceRoutes from './attendance.routes.js';
import leaveRoutes from './leave.routes.js';
import payrollRoutes from './payroll.routes.js';
import analyticsRoutes from './analytics.routes.js';
import aiRoutes from './ai.routes.js';
import commsRoutes from './communication.routes.js';
import { getDbStatus } from '../database/db.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/organization', orgRoutes);
apiRouter.use('/employees', employeeRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/leave', leaveRoutes);
apiRouter.use('/payroll', payrollRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/communication', commsRoutes);

apiRouter.get('/health', (req, res) => {
  const database = getDbStatus();
  res.status(database.connected ? 200 : 503).json({
    status: database.connected ? 'healthy' : 'unavailable',
    timestamp: new Date().toISOString(),
    system: 'HCM Lite',
    database,
  });
});

export default apiRouter;
