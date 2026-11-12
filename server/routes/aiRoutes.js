const express = require('express');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return callback(new Error('Choose a JPG, PNG, or WebP dress photo.'));
    }
    return callback(null, true);
  },
});

const dressSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'A clear, concise product name.' },
    description: { type: 'string', description: 'A short, customer-facing description of visible details.' },
    category: { type: 'string', description: 'A concise apparel category such as Kurti, Anarkali, or Suit Set.' },
    fabric: { type: 'string', description: 'Likely fabric, or Unknown if the image cannot show it.' },
    price: { type: 'integer', minimum: 1, maximum: 100000, description: 'A rough suggested retail price in INR, not a confirmed price.' },
    discountPrice: { type: 'integer', minimum: 0, maximum: 100000, description: 'Suggested offer price in INR; use 0 if no discount is appropriate.' },
    sizes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Common suggested sizes; these are not confirmed inventory.',
    },
    stock: {
      type: 'integer',
      description: 'Always 0 because stock cannot be determined from a photo.',
    },
  },
  required: ['name', 'description', 'category', 'fabric', 'price', 'discountPrice', 'sizes', 'stock'],
};

const reviewBeforeSaving = [
  'Price and offer price are AI estimates, not verified prices.',
  'Sizes are suggestions only; confirm which sizes you actually have.',
  'Stock is set to 0 because a photo cannot show available inventory.',
  'Confirm fabric and every visual detail before publishing.',
];

function parseUploadedImage(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (!error) return next();
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Dress photo must be 5 MB or smaller.'
      : error.code === 'LIMIT_FILE_COUNT'
        ? 'Upload one photo at a time for AI suggestions.'
        : error.message || 'Dress photo could not be uploaded.';
    return res.status(400).json({ message });
  });
}

router.post('/analyze-dress', protect, adminOnly, parseUploadedImage, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Choose a dress photo to analyze.' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ message: 'Gemini is not configured. Add GEMINI_API_KEY to the server .env file.' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { apiVersion: 'v1beta' },
    });
    const response = await ai.interactions.create({
      model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
      input: [
        {
          type: 'text',
          text: [
            'You help a boutique owner draft a product listing from one clothing photo.',
            'Return concise, customer-friendly suggestions in English.',
            'Describe only visible details; never claim an unseen feature as fact.',
            'Fabric must be "Unknown" if it cannot be identified confidently from the image.',
            'Suggest a reasonable retail price in INR based on the visible garment, but treat it as an estimate.',
            'Suggest a discount price of 0 when uncertain or when no discount is needed.',
            'Suggest common clothing sizes, but do not imply they are in stock.',
            'Always set stock to 0 because inventory cannot be inferred from a photo.',
          ].join(' '),
        },
        {
          type: 'image',
          data: req.file.buffer.toString('base64'),
          mime_type: req.file.mimetype,
        },
      ],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: dressSchema,
      },
    });

    const suggestions = JSON.parse(response.output_text);
    if (
      typeof suggestions.name !== 'string' ||
      typeof suggestions.description !== 'string' ||
      typeof suggestions.category !== 'string' ||
      typeof suggestions.fabric !== 'string' ||
      !Number.isInteger(suggestions.price) ||
      !Number.isInteger(suggestions.discountPrice) ||
      !Array.isArray(suggestions.sizes) ||
      !suggestions.sizes.every((size) => typeof size === 'string') ||
      !Number.isInteger(suggestions.stock)
    ) {
      throw new Error('Gemini returned product suggestions in an unexpected format.');
    }

    return res.json({ suggestions, reviewBeforeSaving });
  } catch (error) {
    const status = Number(error?.status || error?.code);
    const safeMessage = String(error?.message || 'Unknown Gemini error')
      .replaceAll(process.env.GEMINI_API_KEY, '[REDACTED]');
    console.error('Gemini dress photo analysis failed:', {
      status: Number.isFinite(status) ? status : 'unknown',
      name: error?.name || 'Error',
      message: safeMessage,
    });

    if (status === 403) {
      return res.status(503).json({
        message: 'Gemini rejected this Google Cloud project. The selected project is not eligible for free-tier API access. Create a key in an eligible AI Studio project, or enable billing for this project.',
      });
    }
    if (status === 401) {
      return res.status(503).json({
        message: 'Gemini rejected the API key. Check GEMINI_API_KEY in server/.env, then restart the backend.',
      });
    }
    if (status === 429) {
      return res.status(429).json({
        message: 'Gemini quota or rate limit reached. Check the project quota in Google AI Studio and try again later.',
      });
    }

    return res.status(502).json({
      message: 'Gemini could not analyze this photo. Check the backend terminal for the safe error details and try again.',
    });
  }
});

module.exports = router;
