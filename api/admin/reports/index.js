// api/admin/reports/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');

// ============================================
// GET - Get all reports
// ============================================
router.get('/', async (req, res) => {
  try {
    // Fetch all reports from database
    // If you have a reports table, fetch from there
    // Otherwise, generate reports from existing data
    
    const reports = [];
    
    // 1. Generate Donation Report
    const { data: donationData, error: donationError } = await supabase
      .from('donation_history')
      .select('*')
      .order('donated_at', { ascending: false });
    
    if (!donationError && donationData) {
      const totalDonations = donationData.length;
      const totalUnits = donationData.reduce((sum, d) => sum + (d.units || 1), 0);
      
      reports.push({
        id: 'donation-report',
        title: `Donation Report - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        type: 'donation',
        date: new Date().toISOString(),
        size: `${Math.round(totalDonations * 0.5)} KB`,
        status: 'ready',
        description: `${totalDonations} donations, ${totalUnits} units donated this month`,
        url: '#'
      });
    }
    
    // 2. Generate Blood Requests Report
    const { data: requestData, error: requestError } = await supabase
      .from('blood_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!requestError && requestData) {
      const total = requestData.length;
      const fulfilled = requestData.filter(r => r.status === 'fulfilled').length;
      const pending = requestData.filter(r => r.status === 'pending').length;
      
      reports.push({
        id: 'request-report',
        title: `Blood Requests Report - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        type: 'request',
        date: new Date().toISOString(),
        size: `${Math.round(total * 0.3)} KB`,
        status: 'ready',
        description: `${total} total requests, ${fulfilled} fulfilled, ${pending} pending`,
        url: '#'
      });
    }
    
    // 3. Generate User Report
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!userError && userData) {
      const donors = userData.filter(u => u.role === 'donor').length;
      const hospitals = userData.filter(u => u.role === 'hospital').length;
      const admins = userData.filter(u => u.role === 'admin').length;
      
      reports.push({
        id: 'user-report',
        title: `User Registration Report - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        type: 'user',
        date: new Date().toISOString(),
        size: `${Math.round(userData.length * 0.2)} KB`,
        status: 'ready',
        description: `${userData.length} total users, ${donors} donors, ${hospitals} hospitals`,
        url: '#'
      });
    }
    
    // 4. Generate Inventory Report
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('blood_inventory')
      .select('*');
    
    if (!inventoryError && inventoryData) {
      const totalUnits = inventoryData.reduce((sum, i) => sum + (i.units_available || 0), 0);
      const bloodGroups = inventoryData.length;
      
      reports.push({
        id: 'inventory-report',
        title: `Inventory Status Report - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        type: 'inventory',
        date: new Date().toISOString(),
        size: `${Math.round(bloodGroups * 0.15)} KB`,
        status: 'ready',
        description: `${totalUnits} units across ${bloodGroups} blood groups`,
        url: '#'
      });
    }
    
    // If no reports, return empty array
    res.json({
      success: true,
      reports: reports.length > 0 ? reports : [
        {
          id: 'sample-report',
          title: 'Sample Report',
          type: 'donation',
          date: new Date().toISOString(),
          size: '0 KB',
          status: 'generating',
          description: 'Generate your first report'
        }
      ]
    });
    
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// POST - Generate new report
// ============================================
router.post('/generate', async (req, res) => {
  try {
    const { type } = req.body;
    
    // Generate report based on type
    // This is where you'd generate PDF/Excel reports
    
    const report = {
      id: `report-${Date.now()}`,
      title: `${type || 'Monthly'} Report - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      type: type || 'donation',
      date: new Date().toISOString(),
      size: '0.5 MB',
      status: 'ready',
      description: `${type || 'Monthly'} report generated successfully`,
      url: '#'
    };
    
    res.json({
      success: true,
      message: 'Report generated successfully',
      report
    });
    
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// GET - Download report
// ============================================
router.get('/download/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Here you would generate the actual file
    // For now, return a success message
    
    res.json({
      success: true,
      message: 'Report download started',
      url: '#'
    });
    
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;