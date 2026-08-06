// Paste this into your Google Sheet's Apps Script editor
// (Extensions > Apps Script), then run populateAlumniData()

function populateAlumniData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Alumni Sheet ---
  let alumni = ss.getSheetByName('Alumni');
  if (!alumni) {
    alumni = ss.insertSheet('Alumni');
  } else {
    alumni.clear();
  }

  const headers = [
    'Alumni ID', 'Name', 'Photo URL', 'Program', 'Batch',
    'Graduation Year', 'Company', 'Designation', 'City',
    'Email', 'LinkedIn', 'Achievement'
  ];

  const data = [
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
    ['ALU026', 'Ishita Saxena', '', 'MBA Banking & Finance', '2020-22', '2022', 'UBS', 'Associate', 'Mumbai', 'ishita.saxena@email.com', 'https://linkedin.com/in/ishitasaxena', "Dean's List"],
    ['ALU027', 'Aditya Jain', '', 'MBA Finance', '2021-23', '2023', 'Accenture', 'Management Consultant', 'Bangalore', 'aditya.jain@email.com', '', ''],
    ['ALU028', 'Nisha Pillai', '', 'MBA Banking & Finance', '2019-21', '2021', 'Federal Bank', 'Senior Officer', 'Kochi', 'nisha.pillai@email.com', '', ''],
    ['ALU029', 'Rajat Kapoor', '', 'MBA Finance', '2022-24', '2024', 'Credit Suisse', 'Analyst', 'Gurugram', 'rajat.kapoor@email.com', 'https://linkedin.com/in/rajatkapoor', ''],
    ['ALU030', 'Tanya Oberoi', '', 'MBA Banking & Finance', '2018-20', '2020', 'Yes Bank', 'VP - Corporate Banking', 'Mumbai', 'tanya.oberoi@email.com', '', 'Young Banker Award 2024']
  ];

  alumni.getRange(1, 1, 1, 12).setValues([headers])
    .setFontWeight('bold')
    .setBackground('#1a237e')
    .setFontColor('#ffffff');
  alumni.getRange(2, 1, data.length, 12).setValues(data);
  alumni.setFrozenRows(1);
  alumni.autoResizeColumns(1, 12);

  // --- Attendance Sheet ---
  let attendance = ss.getSheetByName('Attendance');
  if (!attendance) {
    attendance = ss.insertSheet('Attendance');
  } else {
    attendance.clear();
  }

  const attHeaders = ['Timestamp', 'Alumni ID', 'Name', 'Batch', 'Program', 'Status', 'Device ID'];
  attendance.getRange(1, 1, 1, 7).setValues([attHeaders])
    .setFontWeight('bold')
    .setBackground('#1a237e')
    .setFontColor('#ffffff');
  attendance.setFrozenRows(1);
  attendance.autoResizeColumns(1, 7);

  SpreadsheetApp.getUi().alert('Done! Alumni sheet populated with 30 records and Attendance sheet is ready.');
}
