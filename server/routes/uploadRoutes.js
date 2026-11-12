const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
});

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'vastra-boutique' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
router.post('/', protect, adminOnly, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }
    const results = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer))
    );
    res.json({ images: results.map((r) => r.secure_url) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;