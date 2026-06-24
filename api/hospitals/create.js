// api/admin/hospitals/create.js
const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');
const bcrypt = require('bcryptjs');

router.post('/create', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      full_name, 
      phone, 
      city, 
      address,
      registration_number,
      blood_bank_license,
      verified,
      role 
    } = req.body;

    // Validate
    if (!email || !password || !full_name || !phone || !city) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone,
        role: 'hospital',
        city
      }
    });

    if (authError) {
      return res.status(400).json({ 
        success: false, 
        message: authError.message 
      });
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name,
        phone,
        role: 'hospital',
        city,
        address,
        registration_number,
        blood_bank_license,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ 
        success: false, 
        message: profileError.message 
      });
    }

    // If verified, create inventory entries
    if (verified) {
      const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const inventoryItems = bloodGroups.map(bg => ({
        hospital_id: authData.user.id,
        blood_group: bg,
        units_available: 0,
        updated_at: new Date().toISOString()
      }));

      await supabase
        .from('blood_inventory')
        .insert(inventoryItems);
    }

    res.json({
      success: true,
      message: 'Hospital created successfully',
      userId: authData.user.id
    });

  } catch (error) {
    console.error('Create hospital error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;