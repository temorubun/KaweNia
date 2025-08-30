function doGet(e) {
  const VER = 'v2025-08-29-B';

  // === Health check ===
  if (e && e.parameter && e.parameter.ping === '1') {
    return ContentService.createTextOutput('OK ' + VER)
      .setMimeType(ContentService.MimeType.TEXT);
  }

  // === Fallback HTML (jika id tidak ada / tipe tidak didukung / error) ===
  const fallback = ContentService.createTextOutput(String.raw`
<!doctype html>
<html lang="id"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Kawe Nia • Data Tidak Ditemukan</title>
<style>
  body{margin:0;background:#0b1020;color:#e5e7eb;font-family:system-ui,Segoe UI,Roboto,Inter,Arial}
  .wrap{max-width:960px;margin:auto;padding:24px}
  .card{background:#0f172a;border:1px solid #1f2937;border-radius:16px;padding:24px}
  a{color:#38bdf8;text-decoration:none}
</style></head>
<body><div class="wrap">
  <h1>📄❌ Data Tidak Ditemukan</h1>
  <div class="card">
    <p>Pastikan URL memuat parameter <code>?id=FILE_ID</code> dan file masih tersedia serta dapat diakses.</p>
    <p>Contoh: <code>?id=1_ne0e47htWmL_KnHpdbctRUivi1XY-MG</code></p>
  </div>
</div></body></html>
`).setMimeType(ContentService.MimeType.HTML);

  try {
    const id = e?.parameter?.id || '';
    if (!id) return fallback;

    const format = (e?.parameter?.format || '').toLowerCase();  // "html" untuk viewer
    const raw = e?.parameter?.raw === '1';                      // ?raw=1 paksa raw

    const file = DriveApp.getFileById(id);  // akan throw jika tidak ada/izin kurang
    const mime = file.getMimeType();

    // === 1) Jika JSON ===
    if (mime === 'application/json' || mime.endsWith('/json')) {
      const text = file.getBlob().getDataAsString('UTF-8');

      // a) Raw JSON (default kalau ?raw=1 atau format != 'html')
      if (raw || format !== 'html') {
        return ContentService.createTextOutput(text)
          .setMimeType(ContentService.MimeType.JSON);
      }

      // b) Viewer HTML (format=html) — menampilkan JSON pretty + link file
      const pretty = (() => {
        try { return JSON.stringify(JSON.parse(text), null, 2); }
        catch { return text; }
      })();

      const html = String.raw`<!doctype html>
<html lang="id"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>JSON Viewer • ${id}</title>
<style>
  body{margin:0;background:#0b1020;color:#e5e7eb;font-family:system-ui,Segoe UI,Roboto,Inter,Arial}
  .wrap{max-width:1000px;margin:auto;padding:24px}
  .head{display:flex;gap:12px;align-items:center;justify-content:space-between}
  .btn{background:#0f172a;border:1px solid #1f2937;color:#e5e7eb;border-radius:12px;padding:8px 12px;text-decoration:none}
  pre{background:#0f172a;border:1px solid #1f2937;border-radius:16px;padding:16px;overflow:auto}
  a{color:#38bdf8;text-decoration:none}
</style>
</head>
<body><div class="wrap">
  <div class="head">
    <h1 style="margin:0;font-size:18px">JSON Viewer</h1>
    <div>
      <a class="btn" href="?id=${encodeURIComponent(id)}&raw=1" target="_blank" rel="noopener">Buka sebagai JSON mentah</a>
    </div>
  </div>
  <p>ID File: <code>${id}</code></p>
  <pre>${pretty.replace(/</g,'&lt;')}</pre>
</div></body></html>`;
      return ContentService.createTextOutput(html)
        .setMimeType(ContentService.MimeType.HTML);
    }

    // === 2) Jika Google Docs → Export ke HTML ===
    if (mime === 'application/vnd.google-apps.document') {
      const url = 'https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=text/html';
      const resp = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      if (resp.getResponseCode() >= 200 && resp.getResponseCode() < 300) {
        return ContentService.createTextOutput(resp.getContentText('UTF-8'))
          .setMimeType(ContentService.MimeType.HTML);
      }
      return fallback;
    }

    // === 3) Jika text/html atau text/* → kirim apa adanya ===
    if (mime === 'text/html' || mime.indexOf('text/') === 0) {
      const text = file.getBlob().getDataAsString('UTF-8');
      const mt = (mime === 'text/html')
        ? ContentService.MimeType.HTML
        : ContentService.MimeType.TEXT;
      return ContentService.createTextOutput(text).setMimeType(mt);
    }

    // === Tipe lain tidak didukung → fallback ===
    return fallback;

  } catch (err) {
    // Jangan bocorkan detail error ke publik
    return fallback;
  }
}
