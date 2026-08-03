// api/admin/profile/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

// ============================================
// GET - Get Admin Profile
// ============================================
router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authorization required' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token format' 
      });
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid session' 
      });
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(400).json({ 
        success: false, 
        error: profileError.message 
      });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// PUT - Update Admin Profile
// ============================================
router.put('/', async (req, res) => {
  try {
    const { user_id, full_name, phone, division, district } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authorization required' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token format' 
      });
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid session' 
      });
    }

    if (!user_id || user_id !== user.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized to update this profile' 
      });
    }

    // Update profile
     const { error: updateError } = await supabase
       .from('profiles')
       .update({
         full_name,
         phone,
         division,
         district,
         updated_at: new Date().toISOString()
       })
       .eq('id', user_id);

    if (updateError) {
      return res.status(400).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    // Get updated profile
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (fetchError) {
      return res.status(400).json({ 
        success: false, 
        error: fetchError.message 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;