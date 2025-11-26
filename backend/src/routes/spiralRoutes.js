const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  startSession,
  updateStep,
  completeSession,
  getHistory,
  getSession,
  abandonSession,
  transcribeAudio,
} = require('../controllers/spiralController');
const { protect } = require('../middleware/auth');
const { spiralValidators, validate } = require('../utils/validators');

// Configure multer for audio uploads
const uploadDir = path.join(__dirname, '../../uploads/audio');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedFormats = ['.m4a', '.mp3', '.wav', '.webm', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  },
});

// All routes require authentication
router.post('/start', protect, spiralValidators.start, validate, startSession);
router.get('/history', protect, getHistory);
router.get('/:id', protect, getSession);
router.put('/:id/step', protect, spiralValidators.updateStep, validate, updateStep);
router.put('/:id/complete', protect, spiralValidators.complete, validate, completeSession);
router.put('/:id/abandon', protect, abandonSession);
router.post('/:id/transcribe', protect, upload.single('audio'), transcribeAudio);

module.exports = router;
