// api/auth/add-role/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

router.post('/add-role', async (req, res) => {
  try {
    const { user_id, role } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Check if user is admin
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!userRoles?.some(r => r.role === 'admin')) {
      return res.status(403).json({ error: 'Only admin can add roles' });
    }

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user_id)
      .eq('role', role)
      .maybeSingle();

    if (existingRole) {
      return res.status(400).json({ error: 'Role already exists for this user' });
    }

    // Add role
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user_id,
        role: role
      });

    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }

    res.json({
      success: true,
      message: `Role ${role} added successfully`
    });
  } catch (error) {
    console.error('Add role error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;