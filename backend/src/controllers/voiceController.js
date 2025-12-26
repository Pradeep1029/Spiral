const OpenAI = require('openai');
const fs = require('fs');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function transcribeWithModel({ filePath, mimeType, model }) {
  const fileStream = fs.createReadStream(filePath);
  const response = await openai.audio.transcriptions.create({
    file: fileStream,
    model,
  });
  const text = response?.text;
  return typeof text === 'string' ? text : '';
}

exports.transcribe = async (req, res, next) => {
  const modelPrimary = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';
  const modelFallback = process.env.OPENAI_TRANSCRIBE_FALLBACK_MODEL || 'whisper-1';

  try {
    if (!req.file || !req.file.path) {
      throw new AppError('Missing audio file', 400);
    }

    const mimeType = req.file.mimetype;

    let text = '';
    try {
      text = await transcribeWithModel({
        filePath: req.file.path,
        mimeType,
        model: modelPrimary,
      });
    } catch (err) {
      logger.warn('Primary transcription model failed, trying fallback', {
        modelPrimary,
        modelFallback,
        error: err?.message,
      });
      text = await transcribeWithModel({
        filePath: req.file.path,
        mimeType,
        model: modelFallback,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        text: String(text || '').trim(),
      },
    });
  } catch (err) {
    next(err);
  } finally {
    try {
      if (req.file?.path) fs.unlinkSync(req.file.path);
    } catch {}
  }
};
