// api/divisions/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../supabase');

// ============================================
// GET /debug - Debug endpoint to check database connection
// ============================================
router.get('/debug', async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'NOT SET';
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

    const { data, error } = await supabase
      .from('divisions')
      .select('id, name');

    res.json({
      success: true,
      supabase_project_ref: projectRef,
      supabase_url: supabaseUrl,
      divisions_count: data ? data.length : 0,
      query_error: error ? error.message : null,
      divisions: data || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET / - List all divisions
// ============================================
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('divisions')
      .select('id, name')
      .order('name');

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, divisions: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET /:divisionName/districts - List districts for a division
// ============================================
router.get('/:divisionName/districts', async (req, res) => {
  try {
    const { divisionName } = req.params;

    const { data: division, error: divisionError } = await supabase
      .from('divisions')
      .select('id')
      .eq('name', divisionName)
      .maybeSingle();

    if (divisionError) {
      return res.status(400).json({ success: false, error: divisionError.message });
    }
    if (!division) {
      return res.status(404).json({ success: false, error: 'Division not found' });
    }

    const { data: districts, error: districtsError } = await supabase
      .from('districts')
      .select('id, name')
      .eq('division_id', division.id)
      .order('name');

    if (districtsError) {
      return res.status(400).json({ success: false, error: districtsError.message });
    }

    res.json({ success: true, districts: districts || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
