const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, role, city, blood_group, location_lat, location_lng } = req.body;

    // Validate required fields
    if (!email || !password || !full_name || !phone || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create auth user in Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // Insert into profiles table
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name,
      phone,
      role,
      city,
      location_lat: location_lat || null,
      location_lng: location_lng || null,
    });

    if (profileError) return res.status(400).json({ error: profileError.message });

    // If donor, insert into donors table
    if (role === 'donor' && blood_group) {
      const { error: donorError } = await supabase.from('donors').insert({
        id: authData.user.id,
        blood_group,
        is_available: true,
        last_donation_date: null,
        total_donations: 0,
      });

      if (donorError) return res.status(400).json({ error: donorError.message });
    }

    res.status(201).json({
      message: 'Registered successfully',
      userId: authData.user.id,
      email: authData.user.email,
      role,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
