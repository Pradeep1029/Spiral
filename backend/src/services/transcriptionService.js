const OpenAI = require('openai');
const logger = require('../config/logger');
const fs = require('fs');

// Initialize OpenAI client
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

/**
 * Transcribe audio file using OpenAI Whisper
 * @param {string} audioFilePath - Absolute path to audio file
 * @param {string} language - Optional language code (e.g., 'en')
 * @returns {Promise<object>} - { text, duration, language }
 */
async function transcribeAudio(audioFilePath, language = null) {
    if (!openai) {
        throw new Error('OpenAI API key not configured');
    }

    try {
        logger.info('Starting audio transcription', { audioFilePath });

        // Create read stream for the audio file
        const audioStream = fs.createReadStream(audioFilePath);

        // Call Whisper API
        const transcription = await openai.audio.transcriptions.create({
            file: audioStream,
            model: 'whisper-1',
            language: language || undefined,
            response_format: 'verbose_json', // Get more metadata
        });

        logger.info('Audio transcription completed', {
            textLength: transcription.text?.length,
            duration: transcription.duration,
        });

        return {
            text: transcription.text,
            duration: transcription.duration,
            language: transcription.language,
        };
    } catch (error) {
        logger.error('Error transcribing audio:', error);
        throw error;
    }
}

/**
 * Transcribe audio buffer (for in-memory files)
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} filename - Original filename (for format detection)
 * @param {string} language - Optional language code
 * @returns {Promise<object>} - { text, duration, language }
 */
async function transcribeAudioBuffer(audioBuffer, filename, language = null) {
    if (!openai) {
        throw new Error('OpenAI API key not configured');
    }

    try {
        logger.info('Starting buffer transcription', { filename, size: audioBuffer.length });

        // Whisper API expects a File object
        const file = new File([audioBuffer], filename);

        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: language || undefined,
            response_format: 'verbose_json',
        });

        logger.info('Buffer transcription completed', {
            textLength: transcription.text?.length,
        });

        return {
            text: transcription.text,
            duration: transcription.duration,
            language: transcription.language,
        };
    } catch (error) {
        logger.error('Error transcribing audio buffer:', error);
        throw error;
    }
}

module.exports = {
    transcribeAudio,
    transcribeAudioBuffer,
};
