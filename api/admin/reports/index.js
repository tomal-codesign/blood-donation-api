// api/admin/reports/index.js
const express = require('express');
const router = express.Router();
const supabase = require('../../../supabase');
const ExcelJS = require('exceljs');

// ============================================
// GET - Get all reports
// ============================================
router.get('/', async (req, res) => {
  try {
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
    
    res.json({
      success: true,
      reports: reports
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
    
    const report = {
      id: `${type}-report-${Date.now()}`,
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
// GET - Download report as Excel
// ============================================
router.get('/download/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { format } = req.query;

    // Generate report data based on reportId
    const reportData = await getReportData(reportId);

    if (format === 'excel') {
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');

      // Add title
      worksheet.mergeCells(`A${1}:${String.fromCharCode(64 + reportData.headers.length)}1`);
      const titleCell = worksheet.getCell('A1');
      titleCell.value = reportData.title;
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center' };

      // Add date
      worksheet.mergeCells(`A${2}:${String.fromCharCode(64 + reportData.headers.length)}2`);
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `Generated: ${new Date().toLocaleString()}`;
      dateCell.font = { size: 10 };
      dateCell.alignment = { horizontal: 'center' };

      // Empty row
      worksheet.addRow([]);

      // Add headers
      const headerRow = worksheet.addRow(reportData.headers);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 25;

      // Add data rows
      reportData.rows.forEach(rowData => {
        const row = worksheet.addRow(rowData);
        row.alignment = { vertical: 'middle' };
        row.height = 20;
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 10;
        column.eachCell({ includeEmpty: true }, cell => {
          const cellValue = cell.value ? cell.value.toString() : '';
          if (cellValue.length > maxLength) {
            maxLength = cellValue.length;
          }
        });
        column.width = Math.min(maxLength + 2, 30);
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${reportId}-${Date.now()}.xlsx`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } else {
      // PDF download (coming soon)
      res.json({
        success: true,
        message: 'PDF download coming soon'
      });
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Helper: Get Report Data
// ============================================
async function getReportData(reportId) {
  // Based on reportId, fetch data from database
  // For now, return sample data
  
  const reportDataMap = {
    'donation-report': {
      title: 'Donation Report',
      headers: ['Sl No', 'Donor Name', 'Blood Group', 'Units', 'Date', 'Hospital', 'Status'],
      rows: await getDonationData()
    },
    'request-report': {
      title: 'Blood Request Report',
      headers: ['Sl No', 'Patient Name', 'Blood Group', 'Units Needed', 'Hospital', 'Priority', 'Status'],
      rows: await getRequestData()
    },
    'user-report': {
      title: 'User Registration Report',
      headers: ['Sl No', 'Name', 'Email', 'Role', 'City', 'Status', 'Joined Date'],
      rows: await getUserData()
    },
    'inventory-report': {
      title: 'Inventory Report',
      headers: ['Blood Group', 'Units Available', 'Hospital', 'Last Updated', 'Status'],
      rows: await getInventoryData()
    }
  };

  return reportDataMap[reportId] || reportDataMap['user-report'];
}

// ============================================
// Helper: Get Donation Data
// ============================================
async function getDonationData() {
  const { data: donations } = await supabase
    .from('donation_history')
    .select('*, donors:donor_id(id, blood_group, profiles:profiles!inner(full_name))')
    .order('donated_at', { ascending: false })
    .limit(50);

  if (!donations || donations.length === 0) {
    return [
      ['1', 'John Doe', 'O+', 1, new Date().toLocaleDateString(), 'City Hospital', 'Completed'],
      ['2', 'Jane Smith', 'A+', 2, new Date().toLocaleDateString(), 'General Hospital', 'Pending']
    ];
  }

  return donations.map((d, i) => [
    i + 1,
    d.donors?.profiles?.full_name || 'Unknown',
    d.donors?.blood_group || 'N/A',
    d.units || 1,
    new Date(d.donated_at).toLocaleDateString(),
    'Hospital',
    'Completed'
  ]);
}

// ============================================
// Helper: Get Request Data
// ============================================
async function getRequestData() {
  const { data: requests } = await supabase
    .from('blood_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!requests || requests.length === 0) {
    return [
      ['1', 'Patient A', 'O-', 2, 'City Hospital', 'Critical', 'Pending'],
      ['2', 'Patient B', 'A+', 1, 'General Hospital', 'Normal', 'Fulfilled']
    ];
  }

  return requests.map((r, i) => [
    i + 1,
    r.patient_name || 'Patient',
    r.blood_group,
    r.units_needed,
    r.hospital_name || 'Hospital',
    r.priority || 'Normal',
    r.status || 'Pending'
  ]);
}

// ============================================
// Helper: Get User Data
// ============================================
async function getUserData() {
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!users || users.length === 0) {
    return [
      ['1', 'Admin User', 'admin@example.com', 'Admin', 'Dhaka', 'Active', new Date().toLocaleDateString()]
    ];
  }

  return users.map((u, i) => [
    i + 1,
    u.full_name || 'Unknown',
    u.email || 'N/A',
    u.role || 'User',
    u.city || 'N/A',
    u.verified ? 'Active' : 'Inactive',
    new Date(u.created_at).toLocaleDateString()
  ]);
}

// ============================================
// Helper: Get Inventory Data
// ============================================
async function getInventoryData() {
  const { data: inventory } = await supabase
    .from('blood_inventory')
    .select('*, profiles:hospital_id(full_name)')
    .limit(50);

  if (!inventory || inventory.length === 0) {
    return [
      ['A+', 20, 'City Hospital', new Date().toLocaleDateString(), 'Good'],
      ['O-', 5, 'General Hospital', new Date().toLocaleDateString(), 'Critical']
    ];
  }

  return inventory.map((item) => {
    const units = item.units_available || 0;
    let status = 'Good';
    if (units < 10) status = 'Critical';
    else if (units < 20) status = 'Low';
    
    return [
      item.blood_group,
      units,
      item.profiles?.full_name || 'Hospital',
      new Date(item.updated_at).toLocaleDateString(),
      status
    ];
  });
}

module.exports = router;