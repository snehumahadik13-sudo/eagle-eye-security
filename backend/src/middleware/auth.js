import { supabaseAdmin } from '../config/supabaseAdmin.js';

/**
 * Protects admin routes. Expects: Authorization: Bearer <supabase-access-token>
 * The token is the JWT the admin dashboard received from Supabase Auth after
 * signing in. We verify it with Supabase, then confirm the user id exists in
 * the `admins` table before allowing the request through.
 */
export async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token.' });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    const { data: adminRow, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('id, email, name')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (adminError) {
      return res.status(500).json({ error: 'Could not verify admin status.' });
    }
    if (!adminRow) {
      return res.status(403).json({ error: 'This account is not an admin.' });
    }

    req.admin = adminRow;
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ error: 'Authentication check failed.' });
  }
}
