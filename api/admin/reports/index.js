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
    
    if (!donationError && donationData && donationData.length > 0) {
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
    
    if (!requestError && requestData && requestData.length > 0) {
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
    
    if (!userError && userData && userData.length > 0) {
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
    
    if (!inventoryError && inventoryData && inventoryData.length > 0) {
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
    
    // Validate type
    const validTypes = ['donation', 'request', 'user', 'inventory', 'financial'];
    const reportType = validTypes.includes(type) ? type : 'donation';
    
    const report = {
      id: `${reportType}-report-${Date.now()}`,
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      type: reportType,
      date: new Date().toISOString(),
      size: '0.5 MB',
      status: 'ready',
      description: `${reportType} report generated successfully`,
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

    // Get report data from database
    const reportData = await getReportData(reportId);

    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found for this report'
      });
    }

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

      // Add headers with styling
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
      res.status(400).json({
        success: false,
        message: 'Only Excel format is supported'
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
// Helper: Get Report Data from Database
// ============================================
async function getReportData(reportId) {
  const reportMap = {
    'donation-report': {
      title: 'Donation Report',
      headers: ['Sl No', 'Donor Name', 'Blood Group', 'Units', 'Date', 'Status'],
      data: await getDonationData()
    },
    'request-report': {
      title: 'Blood Request Report',
      headers: ['Sl No', 'Patient Name', 'Blood Group', 'Units Needed', 'Hospital', 'Priority', 'Status'],
      data: await getRequestData()
    },
    'user-report': {
      title: 'User Registration Report',
      headers: ['Sl No', 'Name', 'Email', 'Role', 'City', 'Status', 'Joined Date'],
      data: await getUserData()
    },
    'inventory-report': {
      title: 'Inventory Report',
      headers: ['Blood Group', 'Units Available', 'Hospital', 'Last Updated', 'Status'],
      data: await getInventoryData()
    }
  };

  const report = reportMap[reportId];
  if (!report) {
    return null;
  }

  return {
    title: report.title,
    headers: report.headers,
    rows: report.data
  };
}

// ============================================
// Helper: Get Donation Data from Database
// ============================================
async function getDonationData() {
  const { data: donations, error } = await supabase
    .from('donation_history')
    .select(`
      *,
      donors:donor_id (
        blood_group,
        profiles:profiles!inner (
          full_name
        )
      )
    `)
    .order('donated_at', { ascending: false });

  if (error || !donations || donations.length === 0) {
    return [];
  }

  return donations.map((d, i) => [
    i + 1,
    d.donors?.profiles?.full_name || 'Unknown',
    d.donors?.blood_group || 'N/A',
    d.units || 1,
    new Date(d.donated_at).toLocaleDateString(),
    'Completed'
  ]);
}

// ============================================
// Helper: Get Request Data from Database
// ============================================
async function getRequestData() {
  const { data: requests, error } = await supabase
    .from('blood_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !requests || requests.length === 0) {
    return [];
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
// Helper: Get User Data from Database
// ============================================
async function getUserData() {
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !users || users.length === 0) {
    return [];
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
// Helper: Get Inventory Data from Database
// ============================================
async function getInventoryData() {
  const { data: inventory, error } = await supabase
    .from('blood_inventory')
    .select('*, profiles:hospital_id(full_name)');

  if (error || !inventory || inventory.length === 0) {
    return [];
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