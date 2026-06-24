// api/admin/hospitals/index.js - Updated version

const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

// ============================================
// POST - Create new hospital (Updated)
// ============================================
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

    console.log('Creating hospital:', { email, full_name, phone, city });

    // Validate required fields
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
        city,
        address: address || '',
        registration_number: registration_number || '',
        blood_bank_license: blood_bank_license || '',
        verified: verified || false
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({ 
        success: false, 
        message: authError.message 
      });
    }

    // Prepare profile data - only include columns that exist
    const profileData = {
      id: authData.user.id,
      full_name,
      phone,
      role: 'hospital',
      city,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Only add these fields if they exist in the table
    // Check if columns exist first (you can skip if not sure)
    if (address) profileData.address = address;
    if (registration_number) profileData.registration_number = registration_number;
    if (blood_bank_license) profileData.blood_bank_license = blood_bank_license;
    if (verified !== undefined) profileData.verified = verified;

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      console.error('Profile error:', profileError);
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

      const { error: inventoryError } = await supabase
        .from('blood_inventory')
        .insert(inventoryItems);

      if (inventoryError) {
        console.error('Inventory error:', inventoryError);
        // Don't fail, just log
      }
    }

    console.log('✅ Hospital created:', authData.user.id);

    res.json({
      success: true,
      message: 'Hospital created successfully',
      userId: authData.user.id,
      hospital: {
        id: authData.user.id,
        email,
        full_name,
        phone,
        city,
        verified: verified || false
      }
    });

  } catch (error) {
    console.error('Create hospital error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ============================================
// GET - Get all hospitals
// ============================================
router.get('/', async (req, res) => {
  try {
    const { data: hospitals, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'hospital')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({
      success: true,
      hospitals: hospitals || []
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// GET - Get single hospital by ID
// ============================================
router.get('/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;

    const { data: hospital, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', hospitalId)
      .eq('role', 'hospital')
      .single();

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({
      success: true,
      hospital
    });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// PATCH - Verify/Unverify hospital
// ============================================
router.patch('/:hospitalId/verify', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { verified } = req.body;

    if (verified === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verified status required' 
      });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        verified,
        updated_at: new Date().toISOString()
      })
      .eq('id', hospitalId)
      .eq('role', 'hospital');

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({
      success: true,
      message: `Hospital ${verified ? 'verified' : 'unverified'} successfully`
    });
  } catch (error) {
    console.error('Verify hospital error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// DELETE - Delete hospital
// ============================================
router.delete('/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;

    // Check if hospital exists
    const { data: hospital, error: checkError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', hospitalId)
      .eq('role', 'hospital')
      .single();

    if (checkError || !hospital) {
      return res.status(404).json({ 
        success: false, 
        message: 'Hospital not found' 
      });
    }

    // Delete from donors table (if any)
    await supabase
      .from('donors')
      .delete()
      .eq('id', hospitalId);

    // Delete from blood_inventory
    await supabase
      .from('blood_inventory')
      .delete()
      .eq('hospital_id', hospitalId);

    // Delete from profiles
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', hospitalId);

    if (deleteError) {
      return res.status(400).json({ 
        success: false, 
        error: deleteError.message 
      });
    }

    // Delete from auth
    await supabase.auth.admin.deleteUser(hospitalId);

    res.json({
      success: true,
      message: 'Hospital deleted successfully'
    });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;