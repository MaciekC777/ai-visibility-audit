import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/verify', authMiddleware, (req: Request, res: Response) => {
  res.json({
    userId: (req as any).userId,
    plan: (req as any).userPlan,
  });
});

export default router;
