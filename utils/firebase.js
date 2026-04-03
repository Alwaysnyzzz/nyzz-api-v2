const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const keyPath = path.join(__dirname, '../firebase-key.json');

if (!admin.apps.length) {
  if (!fs.existsSync(keyPath)) {
    console.error('⚠ firebase-key.json tidak ditemukan. Jalankan: bash update-firebase.sh');
  } else {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_BUCKET
    });
    console.log('✓ Firebase Storage connected');
  }
}

module.exports = admin;
