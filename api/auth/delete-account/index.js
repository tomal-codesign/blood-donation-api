// api/auth/delete-account/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

router.delete('/delete-account', async (req, res) => {
  try {
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

    // 2. Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Get user error:', userError);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session. Please login again.' 
      });
    }

    console.log('Delete account attempt for user:', user.email, user.id);

    // 3. Delete related records (in order)
    let errors = [];

    // Delete donation history
    const { error: donationError } = await supabase
      .from('donation_history')
      .delete()
      .eq('donor_id', user.id);

    if (donationError) {
      console.error('Donation history delete error:', donationError);
      errors.push('Failed to delete donation history');
    }

    // Delete donor record
    const { error: donorError } = await supabase
      .from('donors')
      .delete()
      .eq('id', user.id);

    if (donorError) {
      console.error('Donor delete error:', donorError);
      errors.push('Failed to delete donor record');
    }

    // Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile delete error:', profileError);
      errors.push('Failed to delete profile');
    }

    // Delete blood requests made by user (if any)
    const { error: requestError } = await supabase
      .from('blood_requests')
      .delete()
      .eq('requester_id', user.id);

    if (requestError) {
      console.error('Blood requests delete error:', requestError);
      // Don't add to errors, continue
    }

    // 4. Delete user from auth (finally)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return res.status(400).json({ 
        success: false,
        error: deleteError.message || 'Failed to delete account',
        details: errors.length > 0 ? errors : undefined
      });
    }

    console.log('Account deleted successfully for user:', user.id);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

module.exports = router;