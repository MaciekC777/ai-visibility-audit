import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch user plan
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', data.user.id)
      .single();

    (req as any).userId = data.user.id;
    (req as any).userPlan = sub?.plan ?? 'free';
    next();
  } catch (err) {
    logger.error('Auth middleware error', { err });
    res.status(500).json({ error: 'Internal server error' });
  }
}
