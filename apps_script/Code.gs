/**
 * Backend + Proxy לאפליקציית אורינטציה OB/GYN — Google Apps Script.
 *
 * למה זה קיים: רשת רמב"ם חוסמת את GitHub, אבל מאפשרת את google.com.
 * הסקריפט הזה רץ על השרתים של גוגל (שכן מגיעים ל-GitHub) ועושה שני דברים:
 *
 *   1) מגיש את האפליקציה — מושך את index.html העדכני מ-GitHub בכל טעינה.
 *      כך כל push של קלוד ל-GitHub מופיע אוטומטית, בלי העתק-הדבק ל-Apps Script.
 *         GET  /exec                 -> דף ה-HTML של האפליקציה
 *
 *   2) שומר את הנתונים המשותפים (סנכרון בין מכשירים):
 *         GET  /exec?api=state       -> { "data": <DB או null> }
 *         POST /exec  body=JSON      -> { "ok": true }   (שומר { "data": <DB> })
 *
 * אחסון הנתונים: Script Properties, מחולק למקטעים (מעקף מגבלת 9KB). אין צורך
 * בגיליון או בקובץ.
 *
 * פריסה: Deploy -> New deployment -> Web app
 *   Execute as:      Me
 *   Who has access:  Anyone           <-- חובה, אחרת הדפדפן יקבל 403
 * עדכון קוד מאוחר יותר: Deploy -> Manage deployments -> Edit -> New version
 * (כך הכתובת נשארת זהה). את עדכוני האפליקציה עצמה לא צריך לפרוס מחדש —
 * הם נמשכים מ-GitHub אוטומטית.
 */

// מקור האפליקציה ב-GitHub (ענף main, repo ציבורי -> אין צורך בטוקן).
var APP_URL = 'https://raw.githubusercontent.com/roeeiluz/obgyn-orientation/main/index.html';

var PROP = PropertiesService.getScriptProperties();
var COUNT_KEY = 'state_count';
var DATA_PREFIX = 'state_';
var CHUNK = 9000; // < מגבלת 9KB לערך בודד ב-Script Properties

function doGet(e) {
  if (e && e.parameter && e.parameter.api === 'state') return respond(readState());
  return serveApp();
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

/* --- הגשת האפליקציה מ-GitHub --- */
function serveApp() {
  var html;
  try {
    var res = UrlFetchApp.fetch(APP_URL, { muteHttpExceptions: true });
    html = (res.getResponseCode() === 200)
      ? res.getContentText()
      : '<!doctype html><meta charset="utf-8"><p dir="rtl">שגיאה בטעינת האפליקציה מ-GitHub (קוד ' + res.getResponseCode() + ').</p>';
  } catch (err) {
    html = '<!doctype html><meta charset="utf-8"><p dir="rtl">שגיאה בטעינת האפליקציה: ' + err + '</p>';
  }
  return HtmlService.createHtmlOutput(html)
    .setTitle('אורינטציה OB/GYN')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* --- שמירת/טעינת מצב הנתונים --- */
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
