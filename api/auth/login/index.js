// api/auth/login/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('Login auth error:', error);
      return res.status(401).json({ error: error.message });
    }

    if (!data || !data.user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, city, location_lat, location_lng, phone')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Fetch donor info if role is donor
    let donorInfo = null;
    if (profile.role === 'donor') {
      const { data: donor } = await supabase
        .from('donors')
        .select('blood_group, is_available, total_donations')
        .eq('id', data.user.id)
        .single();
      donorInfo = donor;
    }

    // Prepare user response
    const userResponse = {
      id: data.user.id,
      email: data.user.email,
      role: profile.role,
      full_name: profile.full_name,
      phone: profile.phone,
      city: profile.city,
      location_lat: profile.location_lat,
      location_lng: profile.location_lng,
    };

    // Add donor info if available
    if (donorInfo) {
      userResponse.blood_group = donorInfo.blood_group;
      userResponse.is_available = donorInfo.is_available;
      userResponse.total_donations = donorInfo.total_donations;
    }

    console.log('Login successful for user:', userResponse.email, 'Role:', userResponse.role);

    res.json({
      token: data.session.access_token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;