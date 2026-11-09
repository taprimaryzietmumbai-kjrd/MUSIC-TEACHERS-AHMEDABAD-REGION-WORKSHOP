/**
 * KVS Ahmedabad Region Music Teachers Workshop
 * Shared resource register + participant/RP submission and verification store.
 *
 * Uses the spreadsheet already supplied by the workshop administrator.
 * Existing tabs (including Sheet1) are preserved; required tabs are added if absent.
 *
 * ONE-TIME SETUP:
 * 1. Paste this file into the Apps Script project attached to the supplied spreadsheet,
 *    OR set SPREADSHEET_ID in Script Properties to the supplied spreadsheet ID.
 * 2. Run initializeWorkshopStore() once and authorize.
 * 3. In Script Properties set ADMIN_PIN to a private, strong PIN.
 * 4. Deploy as Web App (Execute as: Me; access: Anyone).
 * 5. Use the deployment /exec URL in the participant hub.
 */

const SPREADSHEET_ID = '100Wy1610gUlAcdprWAi7Uq08ltrws8KUsV1U63WMjJw';
const RESOURCE_SHEET = 'Session Resources';
const PARTICIPANT_SHEET = 'Participant Submissions';
const RP_SHEET = 'RP Submissions';
const VERIFY_SHEET = 'Verification';

const PARTICIPANT_HEADERS = [
  'Timestamp','Submission ID','Participant Name','Employee Code','Kendriya Vidyalaya',
  'Region','Email','TNA (PUSHTI) URL','Session-wise Feedback URL',
  'Learning Reflection','Classroom Implementation / Action Plan',
  'Project / Evidence URL','Attendance Confirmation','Overall Status','Admin Notes'
];
const RP_HEADERS = [
  'Timestamp','Submission ID','Resource Person Name','Employee Code','Kendriya Vidyalaya',
  'Day','Session','Session Report URL','PPT URL','Status','Admin Notes'
];
const VERIFY_HEADERS = ['Timestamp','Submission ID','Type','Item','Status','Admin Notes','Reviewed By'];

function initializeWorkshopStore() {
  const ss = SpreadsheetApp.openById(getSpreadsheetId_());
  ensureSheet_(ss, RESOURCE_SHEET, ['Timestamp','Session Key','Resource Title','Resource URL','Added By']);
  ensureSheet_(ss, PARTICIPANT_SHEET, PARTICIPANT_HEADERS);
  ensureSheet_(ss, RP_SHEET, RP_HEADERS);
  ensureSheet_(ss, VERIFY_SHEET, VERIFY_HEADERS);
  Logger.log('Workshop spreadsheet ready: ' + ss.getUrl());
  return ss.getUrl();
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  let result;
  try {
    if (p.action === 'list') result = listResources_();
    else if (p.action === 'add') result = addResource_(p);
    else if (p.action === 'certificateStatus') result = certificateStatus_(p);
    else if (p.action === 'adminList') result = adminList_(p);
    else result = {ok:false,error:'Unknown action.'};
  } catch (err) {
    result = {ok:false,error:String(err.message || err)};
  }
  return output_(result, p.callback);
}

function doPost(e) {
  let result;
  try {
    const p = (e && e.parameter) || {};
    const body = p.payload ? JSON.parse(p.payload) : p;
    if (body.action === 'participantSubmit') result = participantSubmit_(body);
    else if (body.action === 'rpSubmit') result = rpSubmit_(body);
    else if (body.action === 'review') result = reviewSubmission_(body);
    else result = {ok:false,error:'Unknown action.'};
  } catch (err) {
    result = {ok:false,error:String(err.message || err)};
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function output_(result, callback) {
  const json = JSON.stringify(result);
  callback = String(callback || '');
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function participantSubmit_(p) {
  const required = ['name','employeeCode','school','region','email','pushtiUrl','feedbackUrl','reflection','actionPlan','attendance'];
  required.forEach(k => { if (!String(p[k] || '').trim()) throw new Error('Missing required field: ' + k); });
  validateUrl_(p.pushtiUrl, 'PUSHTI link');
  validateUrl_(p.feedbackUrl, 'Session-wise feedback link');
  if (p.projectUrl) validateUrl_(p.projectUrl, 'Project evidence link');
  const id = Utilities.getUuid();
  const row = [new Date(),id,p.name,p.employeeCode,p.school,p.region,p.email,p.pushtiUrl,p.feedbackUrl,
    p.reflection,p.actionPlan,p.projectUrl || '',p.attendance,'Pending',''];
  getSheet_(PARTICIPANT_SHEET).appendRow(row);
  return {ok:true,id:id,status:'Pending'};
}

function rpSubmit_(p) {
  ['name','employeeCode','school','day','session','reportUrl','pptUrl'].forEach(k => {
    if (!String(p[k] || '').trim()) throw new Error('Missing required field: ' + k);
  });
  validateUrl_(p.reportUrl, 'Session report link');
  validateUrl_(p.pptUrl, 'PPT link');
  const id = Utilities.getUuid();
  getSheet_(RP_SHEET).appendRow([new Date(),id,p.name,p.employeeCode,p.school,p.day,p.session,p.reportUrl,p.pptUrl,'Pending','']);
  return {ok:true,id:id,status:'Pending'};
}

function certificateStatus_(p) {
  const code = String(p.employeeCode || '').trim();
  const email = String(p.email || '').trim().toLowerCase();
  if (!code || !email) throw new Error('Employee code and registered email are required.');
  const rows = getSheet_(PARTICIPANT_SHEET).getDataRange().getValues();
  const match = rows.slice(1).filter(r => String(r[3]).trim() === code && String(r[6]).trim().toLowerCase() === email);
  if (!match.length) return {ok:true,eligible:false,status:'Not Submitted'};
  const latest = match[match.length - 1];
  return {ok:true,eligible:String(latest[13]) === 'Approved',status:String(latest[13]),submissionId:String(latest[1]),notes:String(latest[14] || '')};
}

function adminList_(p) {
  requireAdmin_(p.pin);
  const participants = getSheet_(PARTICIPANT_SHEET).getDataRange().getDisplayValues();
  const rps = getSheet_(RP_SHEET).getDataRange().getDisplayValues();
  return {ok:true,participants:participants.slice(1),resourcePersons:rps.slice(1)};
}

function reviewSubmission_(p) {
  requireAdmin_(p.pin);
  const type = String(p.type || '');
  const id = String(p.id || '');
  const status = String(p.status || '');
  if (!['Participant','RP'].includes(type)) throw new Error('Invalid submission type.');
  if (!['Approved','Correction Required','Pending'].includes(status)) throw new Error('Invalid status.');
  const sheet = getSheet_(type === 'Participant' ? PARTICIPANT_SHEET : RP_SHEET);
  const values = sheet.getDataRange().getValues();
  const idCol = 1;
  const rowIndex = values.findIndex((r,i) => i > 0 && String(r[idCol]) === id);
  if (rowIndex < 1) throw new Error('Submission not found.');
  const statusCol = type === 'Participant' ? 14 : 10;
  const notesCol = type === 'Participant' ? 15 : 11;
  sheet.getRange(rowIndex + 1,statusCol).setValue(status);
  sheet.getRange(rowIndex + 1,notesCol).setValue(String(p.notes || ''));
  getSheet_(VERIFY_SHEET).appendRow([new Date(),id,type,'Overall submission',status,String(p.notes || ''),'Administrator']);
  return {ok:true,status:status};
}

function addResource_(p) {
  requireAdmin_(p.pin);
  const key = String(p.key || '');
  const title = String(p.title || '').trim();
  const url = String(p.url || '').trim();
  if (!/^d[1-5]-(assembly|s[1-4])$/.test(key)) throw new Error('Invalid session selection.');
  if (!title || title.length > 120) throw new Error('Enter a resource title (maximum 120 characters).');
  validateUrl_(url,'Resource link');
  getSheet_(RESOURCE_SHEET).appendRow([new Date(),key,title,url,'Workshop administrator']);
  return {ok:true,message:'Resource saved.'};
}

function listResources_() {
  const values = getSheet_(RESOURCE_SHEET).getDataRange().getValues();
  const resources = {};
  values.slice(1).forEach(row => {
    const key = String(row[1] || '');
    if (!key) return;
    if (!resources[key]) resources[key] = [];
    resources[key].push({title:String(row[2] || ''),url:String(row[3] || ''),timestamp:row[0] instanceof Date ? row[0].toISOString() : String(row[0] || '')});
  });
  return {ok:true,resources:resources};
}

function requireAdmin_(pin) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');
  if (!expected) throw new Error('Set ADMIN_PIN in Apps Script Script Properties first.');
  if (!pin || String(pin) !== expected) throw new Error('Administrator authentication failed.');
}

function validateUrl_(url,label) {
  if (String(url || '').length > 2000 || !/^https?:\/\//i.test(String(url || ''))) throw new Error('Enter a valid ' + label + ' URL.');
}

function getSpreadsheetId_() {
  return PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || SPREADSHEET_ID;
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.openById(getSpreadsheetId_()).getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" is missing. Run initializeWorkshopStore() once.');
  return sheet;
}

function ensureSheet_(ss,name,headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,headers.length).setFontWeight('bold');
  }
  return sheet;
}
