import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure assets folder exists at the root of the backend folder
const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, assetsDir);
  },
  filename: function (req, file, cb) {
    const cleanBase = path.basename(file.originalname);
    const ext = path.extname(cleanBase).toLowerCase();
    const safeRandom = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${safeRandom}${ext}`);
  }
});

// File filter: accept standard image formats only (no SVG or raw documents)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WEBP image files are allowed! SVG or arbitrary files are rejected.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: fileFilter
});

router.post('/', (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds the 5MB limit!' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image!' });
    }

    // Return the public URL for static serving
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/assets/${req.file.filename}`;
    res.json({ imageUrl: fileUrl });
  });
});

export default router;
