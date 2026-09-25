import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// The admin dashboard signs in directly against Supabase Auth using the
// public anon key (that is what the anon key is for) and receives a JWT.
// This route just lets the dashboard confirm "yes, this token is a valid
// logged-in admin" right after login and on page load.
router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

export default router;
