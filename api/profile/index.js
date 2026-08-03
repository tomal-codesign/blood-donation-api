// api/profile/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../supabase');

// ============================================
// GET - Get User Profile
// ============================================
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: profileError.message
      });
    }

    // Get donor info if donor
    let donorInfo = null;
    if (profile?.role === 'donor') {
      const { data: donor, error: donorError } = await supabase
        .from('donors')
        .select('*')
        .eq('id', userId)
        .single();

      if (!donorError) {
        donorInfo = donor;
      }
    }

    res.json({
      success: true,
      profile,
      donor: donorInfo
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// PUT - Update User Profile
// ============================================
router.put('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

const {
  full_name,
  phone,
  city,
  address,
  location_lat,
  location_lng,
  blood_group,
  weight,
  medical_conditions,
  division,
  district
} = req.body;

    // Update profile
const profileUpdates = {
  full_name,
  phone,
  city,
  address,
  location_lat,
  location_lng,
  division,
  district,
  updated_at: new Date().toISOString()
};

    // Remove undefined fields
    Object.keys(profileUpdates).forEach(key => {
      if (profileUpdates[key] === undefined) {
        delete profileUpdates[key];
      }
    });

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);

    if (profileError) {
      return res.status(400).json({
        success: false,
        message: profileError.message
      });
    }

    // Update donor info if donor
    if (blood_group || weight || medical_conditions !== undefined) {
      const donorUpdates = {
        blood_group,
        weight,
        medical_conditions,
        updated_at: new Date().toISOString()
      };

      Object.keys(donorUpdates).forEach(key => {
        if (donorUpdates[key] === undefined) {
          delete donorUpdates[key];
        }
      });

      await supabase
        .from('donors')
        .update(donorUpdates)
        .eq('id', userId);
    }

    // Get updated profile
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;