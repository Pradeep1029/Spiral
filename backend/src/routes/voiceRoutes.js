const express = require('express');
const multer = require('multer');

const router = express.Router();
const { transcribe } = require('../controllers/voiceController');

const upload = multer({
  dest: 'tmp_uploads',
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

router.post('/transcribe', upload.single('audio'), transcribe);

module.exports = router;
