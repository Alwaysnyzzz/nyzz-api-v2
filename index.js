require('./utils/firebase'); // init firebase dulu
const express = require('express');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ── ROUTES ──────────────────────────────────
app.use('/auth',     require('./routes/auth'));
app.use('/brat',     require('./routes/brat'));
app.use('/uploader', require('./routes/uploader'));
app.use('/user',     require('./routes/user'));

// ── FILE VIEWER ───────────────────────────────
const BUCKET = () => process.env.FIREBASE_BUCKET;

// image: redirect langsung ke Firebase URL
app.get('/uploader/image/:filename', (req, res) => {
  res.redirect(`https://storage.googleapis.com/${BUCKET()}/images/${req.params.filename}`);
});

// video: redirect langsung
app.get('/uploader/video/:filename', (req, res) => {
  res.redirect(`https://storage.googleapis.com/${BUCKET()}/videos/${req.params.filename}`);
});

// audio: redirect langsung
app.get('/uploader/audio/:filename', (req, res) => {
  res.redirect(`https://storage.googleapis.com/${BUCKET()}/audios/${req.params.filename}`);
});

// file: halaman download
app.get('/uploader/file/:filename', (req, res) => {
  const filename = req.params.filename;
  const fileUrl  = `https://storage.googleapis.com/${BUCKET()}/files/${filename}`;
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${filename} — NyzzAPI</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#07070f;color:#ededf5;font-family:system-ui,sans-serif;
       min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#0d0d1a;border:1px solid #ffffff14;border-radius:16px;
        padding:32px;max-width:400px;width:100%;text-align:center}
  .icon{font-size:48px;margin-bottom:16px}
  .name{font-size:15px;font-weight:700;margin-bottom:8px;word-break:break-all}
  .ext{font-size:11px;color:#a78bfa;background:rgba(108,92,231,.12);padding:3px 10px;
       border-radius:100px;margin-bottom:22px;display:inline-block}
  .btn{display:inline-block;background:linear-gradient(135deg,#6c5ce7,#a78bfa);
       color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;
       font-weight:700;font-size:14px}
  footer{margin-top:20px;font-size:11px;color:#44445a}
  footer a{color:#a78bfa;text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <div class="icon">📄</div>
  <div class="name">${filename}</div>
  <div class="ext">.${filename.split('.').pop()}</div>
  <a class="btn" href="${fileUrl}" download="${filename}">Download File</a>
  <footer>Powered by <a href="https://api.nyzz.my.id">NyzzAPI</a></footer>
</div>
</body>
</html>`);
});

app.get('/', (req, res) => {
  res.json({ status:'ok', message:'NyzzAPI v2', docs:'https://docs.nyzz.my.id' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NyzzAPI running on port ${PORT}`));
