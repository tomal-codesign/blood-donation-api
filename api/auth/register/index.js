// api/auth/register/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, role, city, blood_group, location_lat, location_lng } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!full_name) missingFields.push('full_name');
    if (!phone) missingFields.push('phone');
    if (!role) missingFields.push('role');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missing: missingFields 
      });
    }

    // Validate role
    const validRoles = ['donor', 'patient', 'hospital', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be donor, patient, hospital, or admin' });
    }

    // For donor, blood_group is required
    if (role === 'donor' && !blood_group) {
      return res.status(400).json({ error: 'Blood group is required for donors' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', email) // This won't work correctly, need better check
      .maybeSingle();

    // Create auth user in Supabase with user_metadata
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone,
        role,
        city
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    if (!authData || !authData.user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Insert into profiles table with proper error handling
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name,
        phone,
        role,
        city,
        location_lat: location_lat || null,
        location_lng: location_lng || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile insert error:', profileError);
      // Rollback - delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ 
        error: 'Failed to create profile', 
        details: profileError.message 
      });
    }

    // If donor, insert into donors table
    if (role === 'donor' && blood_group) {
      const { error: donorError } = await supabase
        .from('donors')
        .insert({
          id: authData.user.id,
          blood_group,
          is_available: true,
          last_donation_date: null,
          total_donations: 0,
          created_at: new Date().toISOString()
        });

      if (donorError) {
        console.error('Donor insert error:', donorError);
        // Don't rollback profile, but log error
        // The user can still login, just missing donor info
      }
    }

    res.status(201).json({
      message: 'Registered successfully',
      userId: authData.user.id,
      email: authData.user.email,
      role: role,
      redirectTo: '/login'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;