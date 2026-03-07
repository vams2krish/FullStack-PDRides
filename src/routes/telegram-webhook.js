import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { handleTelegramMessage } from '../services/messageHandler.js';

dotenv.config();

const router = express.Router();

/**
 * Telegram webhook endpoint - receives all messages
 */
router.post('/', async (req, res) => {
  // Immediately respond to acknowledge receipt
  res.status(200).send();

  // Process message asynchronously
  try {
    const body = req.body;
    
    // Always log for debugging
    console.log('=== TELEGRAM WEBHOOK RECEIVED ===');
    console.log('Body:', JSON.stringify(body, null, 2));

    // Handle message
    const result = await handleTelegramMessage(body);
    console.log('=== HANDLED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
  }
});

/**
 * Health check for Telegram bot
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    platform: 'telegram',
    timestamp: new Date().toISOString()
  });
});

export default router;

