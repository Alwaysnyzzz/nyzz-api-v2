const router  = require('express').Router();
const multer  = require('multer');
const admin   = require('firebase-admin');
const crypto  = require('crypto');
const path    = require('path');
const { apiKeyLimit } = require('../middleware/auth');

// ── FIREBASE STORAGE ──────────────────────────
const bucket = admin.storage().bucket();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

function genFilename(originalname) {
  const ext  = path.extname(originalname).toLowerCase();
  const rand = crypto.randomBytes(8).toString('hex');
  const ts   = Date.now().toString(36);
  return `${ts}${rand}${ext}`;
}

async function uploadToFirebase(buffer, filename, mimetype, folder) {
  const file = bucket.file(`${folder}/${filename}`);
  await file.save(buffer, {
    metadata: { contentType: mimetype },
    public: true
  });
  const publicUrl = `https://storage.googleapis.com/${process.env.FIREBASE_BUCKET}/${folder}/${filename}`;
  return publicUrl;
}

// ── IMAGE ─────────────────────────────────────
router.post('/image', apiKeyLimit, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status:'error', message:'File gambar wajib diupload' });
    const allowed = ['.jpg','.jpeg','.png'];
    const ext     = path.extname(req.file.originalname).toLowerCase();
    if (!allowed.includes(ext))
      return res.status(400).json({ status:'error', message:'Hanya JPG, JPEG, PNG yang diizinkan' });

    const filename = genFilename(req.file.originalname);
    const url      = await uploadToFirebase(req.file.buffer, filename, req.file.mimetype, 'images');
    const viewUrl  = `https://api.nyzz.my.id/uploader/image/${filename}`;

    res.json({
      status: 'sukses', message: 'Gambar berhasil diupload!',
      data: { filename, originalname: req.file.originalname, size: req.file.size, url, view_url: viewUrl }
    });
  } catch(e) { res.status(500).json({ status:'error', message: e.message }); }
});

// ── VIDEO ─────────────────────────────────────
router.post('/video', apiKeyLimit, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status:'error', message:'File video wajib diupload' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.mp4')
      return res.status(400).json({ status:'error', message:'Hanya MP4 yang diizinkan' });

    const filename = genFilename(req.file.originalname);
    const url      = await uploadToFirebase(req.file.buffer, filename, req.file.mimetype, 'videos');
    const viewUrl  = `https://api.nyzz.my.id/uploader/video/${filename}`;

    res.json({
      status: 'sukses', message: 'Video berhasil diupload!',
      data: { filename, originalname: req.file.originalname, size: req.file.size, url, view_url: viewUrl }
    });
  } catch(e) { res.status(500).json({ status:'error', message: e.message }); }
});

// ── AUDIO ─────────────────────────────────────
router.post('/audio', apiKeyLimit, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status:'error', message:'File audio wajib diupload' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.mp3')
      return res.status(400).json({ status:'error', message:'Hanya MP3 yang diizinkan' });

    const filename = genFilename(req.file.originalname);
    const url      = await uploadToFirebase(req.file.buffer, filename, req.file.mimetype, 'audios');
    const viewUrl  = `https://api.nyzz.my.id/uploader/audio/${filename}`;

    res.json({
      status: 'sukses', message: 'Audio berhasil diupload!',
      data: { filename, originalname: req.file.originalname, size: req.file.size, url, view_url: viewUrl }
    });
  } catch(e) { res.status(500).json({ status:'error', message: e.message }); }
});

// ── FILE ──────────────────────────────────────
router.post('/file', apiKeyLimit, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status:'error', message:'File wajib diupload' });
    const blocked = ['.jpg','.jpeg','.png','.mp4','.mp3'];
    const ext     = path.extname(req.file.originalname).toLowerCase();
    if (blocked.includes(ext))
      return res.status(400).json({ status:'error', message:'Format ini punya endpoint khusus (image/video/audio)' });

    const filename = genFilename(req.file.originalname);
    const url      = await uploadToFirebase(req.file.buffer, filename, req.file.mimetype || 'application/octet-stream', 'files');
    const viewUrl  = `https://api.nyzz.my.id/uploader/file/${filename}`;

    res.json({
      status: 'sukses', message: 'File berhasil diupload!',
      data: { filename, originalname: req.file.originalname, size: req.file.size, url, view_url: viewUrl }
    });
  } catch(e) { res.status(500).json({ status:'error', message: e.message }); }
});

module.exports = router;
