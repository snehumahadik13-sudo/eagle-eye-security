import { Router } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// PUBLIC: all settings, flattened into a single object { key: value }
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('website_settings').select('key, value');
  if (error) return res.status(500).json({ error: error.message });
  const flattened = Object.fromEntries(data.map((row) => [row.key, row.value]));
  res.json(flattened);
});

// ADMIN: raw rows, for editing in the dashboard
router.get('/admin/all', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('website_settings')
    .select('*')
    .order('key', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ADMIN: upsert a single setting
router.put('/:key', requireAdmin, async (req, res) => {
  if (req.body.value === undefined) {
    return res.status(400).json({ error: 'Body must include "value".' });
  }
  const { data, error } = await supabaseAdmin
    .from('website_settings')
    .upsert({ key: req.params.key, value: req.body.value })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
