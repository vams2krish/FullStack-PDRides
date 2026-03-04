import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { handleMessage } from '../services/messageHandler.js';

dotenv.config();

const router = express.Router();
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';


/**
 * Verify webhook - GET endpoint for Meta verification
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Webhook verification attempt:');
  console.log('- Mode:', mode);
  console.log('- Token received:', token);
  console.log('- Token expected:', VERIFY_TOKEN);
  console.log('- Token match:', token === VERIFY_TOKEN);
  console.log('- Challenge:', challenge);

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});


/**
 * Receive messages - POST endpoint for incoming messages
 */
router.post('/', async (req, res) => {
  // Immediately respond to acknowledge receipt
  res.status(200).send('EVENT_RECEIVED');

  // Process message asynchronously
  try {
    const body = req.body;
    
    // Log webhook payload in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Webhook received:', JSON.stringify(body, null, 2));
    }

    // Handle message
    await handleMessage(body);
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
});

export default router;
