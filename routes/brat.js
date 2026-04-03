const router = require('express').Router();
const { createCanvas } = require('canvas');
const sharp  = require('sharp');
const { apiKeyLimit } = require('../middleware/auth');

router.get('/', apiKeyLimit, async (req, res) => {
  try {
    const text = (req.query.text || 'brat').toLowerCase();
    const width = 1000, height = 1000, padding = 60;
    const canvas = createCanvas(width, height);
    const ctx    = canvas.getContext('2d');

    function getLines(txt, fontSize) {
      ctx.font = `400 ${fontSize}px Arial`;
      const words = txt.split(' ');
      const lines = []; let current = '';
      for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (ctx.measureText(test).width > width - padding * 2 && current) {
          lines.push(current); current = word;
        } else current = test;
      }
      if (current) lines.push(current);
      return lines;
    }

    let fontSize = 280;
    let lines = getLines(text, fontSize);
    const lh = () => fontSize * 1.15;
    while (lh() * lines.length > height - padding * 2 && fontSize > 30) {
      fontSize -= 4; lines = getLines(text, fontSize);
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#000000';
    ctx.font = `400 ${fontSize}px Arial`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, padding, padding + i * lh()));

    const blurred = await sharp(canvas.toBuffer('image/png')).blur(5).png().toBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="brat.png"');
    res.send(blurred);
  } catch(e) {
    res.status(500).json({ status:'error', message: e.message });
  }
});

module.exports = router;
