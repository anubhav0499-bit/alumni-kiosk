// ============================================================
// Alumni Welcome & Attendance Kiosk — Google Apps Script Backend
// ============================================================

const ALUMNI_SHEET_NAME = 'Alumni';
const ATTENDANCE_SHEET_NAME = 'Attendance';

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getAlumniSheet() {
  return getSpreadsheet().getSheetByName(ALUMNI_SHEET_NAME);
}

function getAttendanceSheet() {
  return getSpreadsheet().getSheetByName(ATTENDANCE_SHEET_NAME);
}

// --- Web App Entry Points ---

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action;

  switch (action) {
    case 'search':
      return jsonResponse(searchAlumni(e.parameter.query));
    case 'getAll':
      return jsonResponse(getAllAlumni());
    case 'checkAttendance':
      const attendance = checkAttendance(params.alumniId);
      return jsonResponse({
        success: true,
        alreadyCheckedIn: attendance.alreadyCheckedIn
      });
    case 'stats':
      return jsonResponse(getStats());
    default:
      return jsonResponse({ success: false, error: 'Unknown action' });
  }
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Invalid request body' });
  }
  const action = data.action;

  switch (action) {
    case 'attendance':
      return jsonResponse(isAdminRequest(data)
        ? getAttendance()
        : { success: false, error: 'Unauthorized' });
    case 'markAttendance':
      return jsonResponse(isKioskRequest(data)
        ? markAttendance(data)
        : { success: false, error: 'Unauthorized' });
    case 'resetAttendance':
      return jsonResponse(isAdminRequest(data)
        ? resetAttendance()
        : { success: false, error: 'Unauthorized' });
    case 'updateContact':
      return jsonResponse(isKioskRequest(data)
        ? updateContact(data)
        : { success: false, error: 'Unauthorized' });
    default:
      return jsonResponse({ success: false, error: 'Unknown action' });
  }
}

function isAdminRequest(data) {
  return isTokenValid('ADMIN_TOKEN', data && data.adminToken);
}

function isKioskRequest(data) {
  return isTokenValid('KIOSK_TOKEN', data && data.kioskToken);
}

function isTokenValid(propertyName, suppliedToken) {
  const expected = PropertiesService.getScriptProperties().getProperty(propertyName);
  const actual = suppliedToken ? String(suppliedToken) : '';
  if (!expected || !actual || expected.length !== actual.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  }
  return mismatch === 0;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Alumni Search ---

function getAllAlumni() {
  const sheet = getAlumniSheet();
  if (!sheet) return { success: false, error: 'Alumni sheet not found', data: [] };
  const data = sheet.getDataRange().getValues();
  if (!data.length) return { success: true, data: [], count: 0 };
  const normalized = normalizeHeaders(data[0]);
  const alumni = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue;
    alumni.push(rowToPublicAlumni(normalized, row));
  }

  return { success: true, data: alumni, count: alumni.length };
}

function searchAlumni(query) {
  if (!query || query.trim() === '') {
    return { success: false, error: 'Empty search query', data: [] };
  }

  const sheet = getAlumniSheet();
  if (!sheet) return { success: false, error: 'Alumni sheet not found', data: [] };
  const data = sheet.getDataRange().getValues();
  if (!data.length) return { success: true, data: [], count: 0, query: query };
  const normalized = normalizeHeaders(data[0]);
  const normalizedQuery = normalizeString(query);
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = normalizeString(String(row[1]));
    if (!name) continue;

    const score = fuzzyMatch(normalizedQuery, name);
    if (score > 0.4) {
      const alumni = rowToPublicAlumni(normalized, row);
      alumni._score = score;
      results.push(alumni);
    }
  }

  results.sort((a, b) => b._score - a._score);

  return {
    success: true,
    data: results.slice(0, 10),
    count: results.length,
    query: query
  };
}

function normalizeHeaders(headers) {
  return headers.map(function(h) { return String(h).trim().toLowerCase().replace(/\s+/g, ''); });
}

function rowToAlumni(normalized, row) {
  function col(name, fallback) {
    var idx = normalized.indexOf(name);
    return idx !== -1 ? idx : fallback;
  }
  var photoIdx = col('photourl', col('photo', 2));
  var phoneIdx = col('phone', -1);
  return {
    alumniId: String(row[col('alumniid', 0)] || '').trim(),
    name: String(row[col('name', 1)] || '').trim(),
    photoUrl: normalizeDriveUrl(String(row[photoIdx] || '').trim()),
    program: String(row[col('program', 3)] || '').trim(),
    batch: String(row[col('batch', 4)] || '').trim(),
    graduationYear: String(row[col('graduationyear', 5)] || '').trim(),
    company: String(row[col('company', 6)] || '').trim(),
    designation: String(row[col('designation', 7)] || '').trim(),
    city: String(row[col('city', 8)] || '').trim(),
    email: String(row[col('email', 9)] || '').trim(),
    linkedin: String(row[col('linkedin', 10)] || '').trim(),
    achievement: String(row[col('achievement', 11)] || '').trim(),
    phone: phoneIdx !== -1 ? String(row[phoneIdx] || '').trim() : ''
  };
}

function rowToPublicAlumni(normalized, row) {
  const alumni = rowToAlumni(normalized, row);
  delete alumni.email;
  delete alumni.phone;
  return alumni;
}

function normalizeDriveUrl(url) {
  if (!url) return '';
  var fileId = null;
  var match = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (match) fileId = match[1];
  if (!fileId) {
    match = url.match(/drive\.google\.com\/(?:open|uc)\?.*id=([^&]+)/);
    if (match) fileId = match[1];
  }
  if (!fileId) {
    match = url.match(/lh3\.googleusercontent\.com\/d\/([^/?]+)/);
    if (match) fileId = match[1];
  }
  if (fileId) return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w400';
  return url;
}

// --- Fuzzy Matching ---

function normalizeString(str) {
  return String(str).toLowerCase().replace(/\s+/g, ' ').trim();
}

function fuzzyMatch(query, target) {
  if (target.includes(query)) return 1.0;
  if (target.startsWith(query)) return 0.95;

  const queryWords = query.split(' ');
  const targetWords = target.split(' ');
  let matchedWords = 0;

  for (const qw of queryWords) {
    for (const tw of targetWords) {
      if (tw.includes(qw) || levenshteinSimilarity(qw, tw) > 0.7) {
        matchedWords++;
        break;
      }
    }
  }

  const wordScore = matchedWords / queryWords.length;
  const editScore = levenshteinSimilarity(query, target);

  return Math.max(wordScore * 0.8, editScore);
}

function levenshteinSimilarity(a, b) {
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - distance / maxLen;
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

// --- Attendance ---

function markAttendance(data) {
  const alumniId = String(data && data.alumniId || '').trim().slice(0, 100);
  const deviceId = String(data && data.deviceId || '').trim().slice(0, 100);

  if (!alumniId) {
    return { success: false, error: 'Missing alumni ID' };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { success: false, error: 'Server busy, please try again' };

  try {
    const alumniSheet = getAlumniSheet();
    if (!alumniSheet) return { success: false, error: 'Alumni sheet not found' };
    const alumniData = alumniSheet.getDataRange().getValues();
    const headers = normalizeHeaders(alumniData[0] || []);
    const idColumn = headers.indexOf('alumniid');
    if (idColumn === -1) return { success: false, error: 'Alumni ID column not found' };

    let alumni = null;
    for (let i = 1; i < alumniData.length; i++) {
      if (String(alumniData[i][idColumn]).trim() === alumniId) {
        alumni = rowToAlumni(headers, alumniData[i]);
        break;
      }
    }
    if (!alumni) return { success: false, error: 'Alumni not found' };

    const existing = checkAttendance(alumniId);
    if (existing.alreadyCheckedIn) {
      return {
        success: false,
        alreadyCheckedIn: true,
        timestamp: existing.timestamp,
        error: 'Already checked in'
      };
    }

    const sheet = getAttendanceSheet();
    if (!sheet) return { success: false, error: 'Attendance sheet not found' };
    const timestamp = new Date();

    sheet.appendRow([
      timestamp,
      alumni.alumniId,
      alumni.name,
      alumni.batch,
      alumni.program,
      'Present',
      deviceId
    ]);

    return {
      success: true,
      timestamp: timestamp.toISOString(),
      message: 'Attendance recorded'
    };
  } finally {
    lock.releaseLock();
  }
}

function updateContact(data) {
  if (!data || data.alumniId == null) return { success: false, error: 'Missing alumni ID' };
  const alumniId = String(data.alumniId).trim();
  const phone = String(data.phone || '').trim();
  const email = String(data.email || '').trim();

  if (!alumniId) return { success: false, error: 'Missing alumni ID' };
  if (!phone && !email) return { success: false, error: 'No contact details provided' };
  if (phone && !isValidPhone(phone)) return { success: false, error: 'Invalid phone number' };
  if (email && !isValidEmail(email)) return { success: false, error: 'Invalid email address' };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { success: false, error: 'Server busy, please try again' };

  try {
    const sheet = getAlumniSheet();
    const allData = sheet.getDataRange().getValues();
    const headers = normalizeHeaders(allData[0]);

    let phoneCol = headers.indexOf('phone');
    let emailCol = headers.indexOf('email');
    let nextCol = headers.length;

    if (phoneCol === -1) {
      phoneCol = nextCol++;
      sheet.getRange(1, phoneCol + 1).setValue('Phone');
    }
    if (emailCol === -1) {
      emailCol = nextCol++;
      sheet.getRange(1, emailCol + 1).setValue('Email');
    }

    const idCol = headers.indexOf('alumniid');
    if (idCol === -1) return { success: false, error: 'Alumni ID column not found in sheet' };
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][idCol]).trim() === alumniId) {
        if (phone) sheet.getRange(i + 1, phoneCol + 1).setNumberFormat('@').setValue(phone);
        if (email) sheet.getRange(i + 1, emailCol + 1).setNumberFormat('@').setValue(email);
        return { success: true, message: 'Contact details updated' };
      }
    }

    return { success: false, error: 'Alumni not found' };
  } finally {
    lock.releaseLock();
  }
}

function isValidPhone(phone) {
  if (phone.length > 25 || !/^[+()\d\s-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function checkAttendance(alumniId) {
  const sheet = getAttendanceSheet();
  if (!sheet) return { alreadyCheckedIn: false };
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(alumniId).trim()) {
      return {
        alreadyCheckedIn: true,
        timestamp: data[i][0],
        name: data[i][2]
      };
    }
  }

  return { alreadyCheckedIn: false };
}

function getAttendance() {
  const sheet = getAttendanceSheet();
  if (!sheet) return { success: false, error: 'Attendance sheet not found', data: [] };
  const data = sheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0] && !data[i][1]) continue;
    records.push({
      timestamp: data[i][0],
      alumniId: String(data[i][1]),
      name: String(data[i][2]),
      batch: String(data[i][3]),
      program: String(data[i][4]),
      status: String(data[i][5]),
      deviceId: String(data[i][6] || '')
    });
  }

  return { success: true, data: records, count: records.length };
}

function getStats() {
  const alumniSheet = getAlumniSheet();
  const attendanceSheet = getAttendanceSheet();
  if (!alumniSheet || !attendanceSheet) {
    return { success: false, error: 'Required sheet not found' };
  }

  const alumniData = alumniSheet.getDataRange().getValues();
  const attendanceData = attendanceSheet.getDataRange().getValues();
  const totalAlumni = alumniData.slice(1).filter(function(row) {
    return row[0] || row[1];
  }).length;
  let totalAttendance = 0;
  const batchWise = {};
  const programWise = {};

  for (let i = 1; i < attendanceData.length; i++) {
    if (!attendanceData[i][0] && !attendanceData[i][1]) continue;
    totalAttendance++;
    const batch = String(attendanceData[i][3]);
    const program = String(attendanceData[i][4]);
    batchWise[batch || 'Unknown'] = (batchWise[batch || 'Unknown'] || 0) + 1;
    programWise[program || 'Unknown'] = (programWise[program || 'Unknown'] || 0) + 1;
  }

  return {
    success: true,
    totalAlumni: totalAlumni,
    totalAttendance: totalAttendance,
    attendanceRate: totalAlumni > 0 ? ((totalAttendance / totalAlumni) * 100).toFixed(1) : 0,
    batchWise: batchWise,
    programWise: programWise
  };
}

function resetAttendance() {
  const sheet = getAttendanceSheet();
  if (!sheet) return { success: false, error: 'Attendance sheet not found' };
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { success: true, message: 'Attendance reset' };
}

// --- Setup Helper ---

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let alumni = ss.getSheetByName(ALUMNI_SHEET_NAME);
  if (!alumni) {
    alumni = ss.insertSheet(ALUMNI_SHEET_NAME);
    alumni.appendRow([
      'Alumni ID', 'Name', 'Photo URL', 'Program', 'Batch',
      'Graduation Year', 'Company', 'Designation', 'City',
      'Email', 'LinkedIn', 'Achievement'
    ]);
    alumni.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
    alumni.setFrozenRows(1);

    // Sample data
    const samples = [
      ['ALU001', 'Anubhav Ghosh', '', 'MBA Banking & Finance', '2022-24', '2024', 'Goldman Sachs', 'Associate', 'Mumbai', 'anubhav.ghosh@email.com', 'https://linkedin.com/in/anubhavghosh', 'Gold Medalist'],
      ['ALU002', 'Priya Sharma', '', 'MBA Banking & Finance', '2021-23', '2023', 'JP Morgan', 'Analyst', 'Delhi', 'priya.sharma@email.com', 'https://linkedin.com/in/priyasharma', ''],
      ['ALU003', 'Rahul Verma', '', 'MBA Finance', '2020-22', '2022', 'HDFC Bank', 'Manager', 'Pune', 'rahul.verma@email.com', '', 'Best Project Award'],
      ['ALU004', 'Sneha Patil', '', 'MBA Banking & Finance', '2022-24', '2024', 'Deloitte', 'Consultant', 'Bangalore', 'sneha.patil@email.com', 'https://linkedin.com/in/snehapatil', ''],
      ['ALU005', 'Amit Kumar', '', 'MBA Finance', '2019-21', '2021', 'ICICI Bank', 'VP', 'Mumbai', 'amit.kumar@email.com', '', 'Distinguished Alumni 2025'],
      ['ALU006', 'Neha Deshmukh', '', 'MBA Banking & Finance', '2020-22', '2022', 'Barclays', 'AVP', 'Mumbai', 'neha.deshmukh@email.com', 'https://linkedin.com/in/nehadeshmukh', ''],
      ['ALU007', 'Arjun Mehta', '', 'MBA Finance', '2021-23', '2023', 'McKinsey & Company', 'Associate', 'Gurugram', 'arjun.mehta@email.com', 'https://linkedin.com/in/arjunmehta', 'Case Competition Winner'],
      ['ALU008', 'Kavita Nair', '', 'MBA Banking & Finance', '2019-21', '2021', 'Reserve Bank of India', 'Grade B Officer', 'Mumbai', 'kavita.nair@email.com', '', ''],
      ['ALU009', 'Rohan Joshi', '', 'MBA Finance', '2022-24', '2024', 'Morgan Stanley', 'Analyst', 'Mumbai', 'rohan.joshi@email.com', 'https://linkedin.com/in/rohanjoshi', ''],
      ['ALU010', 'Aisha Khan', '', 'MBA Banking & Finance', '2020-22', '2022', 'Citibank', 'Relationship Manager', 'Hyderabad', 'aisha.khan@email.com', '', ''],
      ['ALU011', 'Vikram Singh', '', 'MBA Finance', '2018-20', '2020', 'Kotak Mahindra Bank', 'Senior Manager', 'Pune', 'vikram.singh@email.com', 'https://linkedin.com/in/vikramsingh', 'Best Outgoing Student'],
      ['ALU012', 'Pooja Iyer', '', 'MBA Banking & Finance', '2021-23', '2023', 'EY', 'Senior Consultant', 'Chennai', 'pooja.iyer@email.com', '', ''],
      ['ALU013', 'Siddharth Rao', '', 'MBA Finance', '2019-21', '2021', 'Axis Bank', 'Branch Manager', 'Pune', 'siddharth.rao@email.com', '', ''],
      ['ALU014', 'Meera Kulkarni', '', 'MBA Banking & Finance', '2022-24', '2024', 'KPMG', 'Analyst', 'Pune', 'meera.kulkarni@email.com', 'https://linkedin.com/in/meerakulkarni', 'Silver Medalist'],
      ['ALU015', 'Karan Malhotra', '', 'MBA Finance', '2018-20', '2020', 'HDFC Securities', 'VP - Equity Research', 'Mumbai', 'karan.malhotra@email.com', 'https://linkedin.com/in/karanmalhotra', ''],
      ['ALU016', 'Divya Reddy', '', 'MBA Banking & Finance', '2020-22', '2022', 'Deutsche Bank', 'Associate', 'Bangalore', 'divya.reddy@email.com', '', ''],
      ['ALU017', 'Aarav Patel', '', 'MBA Finance', '2021-23', '2023', 'PwC', 'Consultant', 'Mumbai', 'aarav.patel@email.com', 'https://linkedin.com/in/aaravpatel', ''],
      ['ALU018', 'Shruti Bhatt', '', 'MBA Banking & Finance', '2019-21', '2021', 'Standard Chartered', 'Manager - Trade Finance', 'Delhi', 'shruti.bhatt@email.com', '', ''],
      ['ALU019', 'Nikhil Agarwal', '', 'MBA Finance', '2022-24', '2024', 'Nomura', 'Analyst', 'Mumbai', 'nikhil.agarwal@email.com', 'https://linkedin.com/in/nikhilagarwal', ''],
      ['ALU020', 'Riya Banerjee', '', 'MBA Banking & Finance', '2018-20', '2020', 'State Bank of India', 'Manager', 'Kolkata', 'riya.banerjee@email.com', '', 'CAIIB Topper'],
      ['ALU021', 'Tanmay Deshpande', '', 'MBA Finance', '2020-22', '2022', 'BNP Paribas', 'AVP', 'Mumbai', 'tanmay.deshpande@email.com', '', ''],
      ['ALU022', 'Ananya Gupta', '', 'MBA Banking & Finance', '2021-23', '2023', 'HSBC', 'Credit Analyst', 'Pune', 'ananya.gupta@email.com', 'https://linkedin.com/in/ananyagupta', ''],
      ['ALU023', 'Harsh Vardhan', '', 'MBA Finance', '2019-21', '2021', 'Motilal Oswal', 'Portfolio Manager', 'Mumbai', 'harsh.vardhan@email.com', '', 'CFA Charterholder'],
      ['ALU024', 'Sakshi Tiwari', '', 'MBA Banking & Finance', '2022-24', '2024', 'Bank of America', 'Analyst', 'Mumbai', 'sakshi.tiwari@email.com', 'https://linkedin.com/in/sakshitiwari', ''],
      ['ALU025', 'Manish Choudhary', '', 'MBA Finance', '2018-20', '2020', 'Bajaj Finserv', 'AVP - Strategy', 'Pune', 'manish.choudhary@email.com', '', ''],
      ['ALU026', 'Ishita Saxena', '', 'MBA Banking & Finance', '2020-22', '2022', 'UBS', 'Associate', 'Mumbai', 'ishita.saxena@email.com', 'https://linkedin.com/in/ishitasaxena', 'Dean\'s List'],
      ['ALU027', 'Aditya Jain', '', 'MBA Finance', '2021-23', '2023', 'Accenture', 'Management Consultant', 'Bangalore', 'aditya.jain@email.com', '', ''],
      ['ALU028', 'Nisha Pillai', '', 'MBA Banking & Finance', '2019-21', '2021', 'Federal Bank', 'Senior Officer', 'Kochi', 'nisha.pillai@email.com', '', ''],
      ['ALU029', 'Rajat Kapoor', '', 'MBA Finance', '2022-24', '2024', 'Credit Suisse', 'Analyst', 'Gurugram', 'rajat.kapoor@email.com', 'https://linkedin.com/in/rajatkapoor', ''],
      ['ALU030', 'Tanya Oberoi', '', 'MBA Banking & Finance', '2018-20', '2020', 'Yes Bank', 'VP - Corporate Banking', 'Mumbai', 'tanya.oberoi@email.com', '', 'Young Banker Award 2024']
    ];
    for (const row of samples) {
      alumni.appendRow(row);
    }
  }

  let attendance = ss.getSheetByName(ATTENDANCE_SHEET_NAME);
  if (!attendance) {
    attendance = ss.insertSheet(ATTENDANCE_SHEET_NAME);
    attendance.appendRow([
      'Timestamp', 'Alumni ID', 'Name', 'Batch', 'Program', 'Status', 'Device ID'
    ]);
    attendance.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
    attendance.setFrozenRows(1);
  }

  SpreadsheetApp.getUi().alert('Sheets setup complete!');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Kiosk Admin')
    .addItem('Setup Sheets', 'setupSheets')
    .addItem('View Stats', 'showStats')
    .addItem('Reset Attendance', 'confirmReset')
    .addToUi();
}

function showStats() {
  const stats = getStats();
  SpreadsheetApp.getUi().alert(
    'Event Statistics',
    'Total Alumni: ' + stats.totalAlumni + '\n' +
    'Checked In: ' + stats.totalAttendance + '\n' +
    'Attendance Rate: ' + stats.attendanceRate + '%',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function confirmReset() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Reset Attendance',
    'Are you sure you want to reset all attendance records? This cannot be undone.',
    ui.ButtonSet.YES_NO
  );
  if (response === ui.Button.YES) {
    resetAttendance();
    ui.alert('Attendance has been reset.');
  }
}
