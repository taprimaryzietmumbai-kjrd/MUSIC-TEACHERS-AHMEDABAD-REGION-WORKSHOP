/**
 * KVS Ahmedabad Region Music Teachers Workshop
 * Shared session-resource register for the GitHub Pages participant hub.
 *
 * ONE-TIME SETUP:
 * 1. Create a new Apps Script project at https://script.google.com
 * 2. Paste this complete file into Code.gs.
 * 3. Run initializeResourceStore() once and authorize it.
 * 4. Project Settings > Script Properties: add ADMIN_PIN with a private PIN.
 * 5. Deploy > New deployment > Web app; Execute as: Me.
 *    Who has access: Anyone (read-only listing is public; adding requires ADMIN_PIN).
 * 6. Copy the /exec URL into RESOURCE_API_URL in index.html and commit that change.
 */

const SHEET_NAME = 'Session Resources';

function initializeResourceStore() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('RESOURCE_SHEET_ID');
  let ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create('KVS Ahmedabad Region Music Workshop – Session Resources');
    props.setProperty('RESOURCE_SHEET_ID', ss.getId());
  }
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Session Key', 'Resource Title', 'Resource URL', 'Added By']);
    sheet.setFrozenRows(1);
  }
  Logger.log('Resource Sheet: ' + ss.getUrl());
  return ss.getUrl();
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  let result;
  try {
    if (p.action === 'list') {
      result = listResources_();
    } else if (p.action === 'add') {
      result = addResource_(p);
    } else {
      result = { ok: false, error: 'Unknown action.' };
    }
  } catch (err) {
    result = { ok: false, error: String(err.message || err) };
  }
  const json = JSON.stringify(result);
  const callback = String(p.callback || '');
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function listResources_() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const resources = {};
  values.slice(1).forEach(row => {
    const key = String(row[1] || '');
    if (!key) return;
    if (!resources[key]) resources[key] = [];
    resources[key].push({
      title: String(row[2] || ''),
      url: String(row[3] || ''),
      timestamp: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || '')
    });
  });
  return { ok: true, resources: resources };
}

function addResource_(p) {
  const expectedPin = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');
  if (!expectedPin) throw new Error('Administrator PIN has not been configured in Script Properties.');
  if (!p.pin || String(p.pin) !== expectedPin) throw new Error('Incorrect administrator PIN.');
  const key = String(p.key || '');
  const title = String(p.title || '').trim();
  const url = String(p.url || '').trim();
  if (!/^d[1-5]-(assembly|s[1-4])$/.test(key)) throw new Error('Invalid session selection.');
  if (!title || title.length > 120) throw new Error('Enter a resource title (maximum 120 characters).');
  if (url.length > 2000 || !/^https?:\/\//i.test(url)) throw new Error('Enter a valid http or https resource link.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet_().appendRow([new Date(), key, title, url, 'Workshop administrator']);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, message: 'Resource saved.' };
}

function getSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('RESOURCE_SHEET_ID');
  if (!id) throw new Error('Run initializeResourceStore() once in Apps Script first.');
  const ss = SpreadsheetApp.openById(id);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Resource sheet not found. Run initializeResourceStore() again.');
  return sheet;
}
