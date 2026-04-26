/**
 * Voice Auto-fill — Standalone Sheets Logger
 *
 * Fully self-contained. Creates its own Google Spreadsheet on the first
 * request and remembers it via Script Properties — no existing sheet needed.
 *
 * Deployment (one-time):
 *   1. Go to https://script.google.com → New project
 *   2. Delete any existing code, paste this entire file, save (Ctrl+S)
 *   3. Deploy → New deployment
 *        Type             : Web app
 *        Execute as       : Me
 *        Who has access   : Anyone
 *   4. Click Deploy → copy the web app URL
 *   5. Paste the URL into the extension popup → Settings → Google Sheets Webhook URL
 *
 * The spreadsheet is created automatically on the first transcription and can
 * be found in your Google Drive under the name defined by SPREADSHEET_NAME.
 * The "Open Spreadsheet" link in the popup is populated automatically.
 */

var SPREADSHEET_NAME = 'Voice Auto-fill — Transcriptions';
var SHEET_NAME       = 'Transcriptions';
var PROP_KEY_ID      = 'SPREADSHEET_ID';
var PROP_KEY_URL     = 'SPREADSHEET_URL';

var HEADERS = [
  'Timestamp',
  'Mode',
  'Domain',
  'Voice Input',
  'Output',
  'Model',
  'Whisper Cost ($)',
  'AI Cost ($)',
  'Total Cost ($)',
];

// ---- Request handlers -------------------------------------------------------

function doPost(e) {
  try {
    var data           = JSON.parse(e.postData.contents);
    var sheet          = getOrCreateSheet();
    var spreadsheetUrl = PropertiesService.getScriptProperties().getProperty(PROP_KEY_URL) || '';

    sheet.appendRow([
      data.timestamp        || new Date().toISOString(),
      data.mode             || '',
      data.domain           || '',
      data.inputText        || '',
      data.outputText       || '',
      data.model            || '',
      formatCost(data.transcriptionCost),
      formatCost(data.aiCost),
      formatCost(data.totalCost),
    ]);

    return json({ status: 'ok', spreadsheetUrl: spreadsheetUrl });
  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

// GET — visit the URL in a browser to confirm the deployment is live
function doGet() {
  var props = PropertiesService.getScriptProperties();
  var id    = props.getProperty(PROP_KEY_ID);
  var url   = props.getProperty(PROP_KEY_URL) || '';
  var msg   = id
    ? 'Voice Auto-fill logger is running. Spreadsheet ID: ' + id
    : 'Voice Auto-fill logger is running. No spreadsheet yet — it will be created on the first transcription.';
  return json({ status: 'ok', message: msg, spreadsheetUrl: url });
}

// ---- Spreadsheet bootstrap --------------------------------------------------

function getOrCreateSheet() {
  var props = PropertiesService.getScriptProperties();
  var id    = props.getProperty(PROP_KEY_ID);
  var ss;

  if (id) {
    try {
      ss = SpreadsheetApp.openById(id);
    } catch (_) {
      // Stored ID is stale (sheet was deleted) — create a fresh one
      ss = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    props.setProperty(PROP_KEY_ID,  ss.getId());
    props.setProperty(PROP_KEY_URL, ss.getUrl());
  }

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(SHEET_NAME);
  }

  // Write styled header row once
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
         .setFontWeight('bold')
         .setBackground('#1e40af')
         .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(4, 300); // Voice Input
    sheet.setColumnWidth(5, 300); // Output
  }

  return sheet;
}

// ---- Helpers ----------------------------------------------------------------

function formatCost(value) {
  var n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
