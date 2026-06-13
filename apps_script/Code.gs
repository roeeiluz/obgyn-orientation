/**
 * Backend לאפליקציית אורינטציה OB/GYN — Google Apps Script.
 *
 * תפקיד: לשמור את כל מצב האפליקציה (אובייקט DB אחד) כך שכל המכשירים
 * רואים את אותם הנתונים. שכבת ה-localStorage באפליקציה נשארת כגיבוי מקומי.
 *
 * חוזה מול הלקוח (index.html):
 *   GET  /exec            -> { "data": <DB או null> }
 *   POST /exec  body=JSON { "data": <DB> }  -> { "ok": true }
 *
 * אחסון: PropertiesService (Script Properties), מחולק למקטעים כדי לעקוף
 * את מגבלת ה-9KB לכל ערך. אין צורך בגיליון או בקובץ נפרד.
 *
 * פריסה: Deploy -> New deployment -> Web app
 *   Execute as: Me
 *   Who has access: Anyone           <-- חובה, אחרת הדפדפן יקבל 403
 * העתק/י את כתובת ה-/exec ל-CONFIG.GAS_URL בקובץ index.html.
 */

var PROP = PropertiesService.getScriptProperties();
var COUNT_KEY = 'state_count';
var DATA_PREFIX = 'state_';
var CHUNK = 9000; // < מגבלת 9KB לערך בודד ב-Script Properties

function doGet(e) {
  return respond(readState());
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body && body.data != null) {
      writeState(JSON.stringify(body.data));
      return respond({ ok: true });
    }
    return respond({ ok: false, error: 'no data' });
  } catch (err) {
    return respond({ ok: false, error: String(err) });
  }
}

function readState() {
  var meta = PROP.getProperty(COUNT_KEY);
  if (!meta) return { data: null };
  var n = parseInt(meta, 10), s = '';
  for (var i = 0; i < n; i++) s += (PROP.getProperty(DATA_PREFIX + i) || '');
  try {
    return { data: JSON.parse(s) };
  } catch (e) {
    return { data: null };
  }
}

function writeState(str) {
  // מחיקת המקטעים הישנים לפני כתיבה חדשה
  var old = parseInt(PROP.getProperty(COUNT_KEY) || '0', 10);
  for (var i = 0; i < old; i++) PROP.deleteProperty(DATA_PREFIX + i);
  var n = Math.ceil(str.length / CHUNK) || 1;
  for (var j = 0; j < n; j++) PROP.setProperty(DATA_PREFIX + j, str.substr(j * CHUNK, CHUNK));
  PROP.setProperty(COUNT_KEY, String(n));
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
