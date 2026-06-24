// api/auth/change-password/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authHeader = req.headers.authorization;
    
    // 1. Check authorization header
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

    // 2. Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'New password must be at least 6 characters' 
      });
    }

    // 3. Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Get user error:', userError);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session. Please login again.' 
      });
    }

    console.log('Change password attempt for user:', user.email);

    // 4. Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return res.status(401).json({ 
        success: false,
        error: 'Current password is incorrect' 
      });
    }

    // 5. Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(400).json({ 
        success: false,
        error: updateError.message || 'Failed to update password' 
      });
    }

    console.log('Password changed successfully for:', user.email);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

module.exports = router;