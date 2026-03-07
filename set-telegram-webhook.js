import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not set in .env file');
  console.log('\nTo set up your Telegram bot:');
  console.log('1. Add TELEGRAM_BOT_TOKEN=8623637610:AAGf0cFmIPuKWTDly3lmy9Ys0Osg7MW91lE to your .env file');
  console.log('2. Run this script again\n');
  process.exit(1);
}

const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function setWebhook(webhookUrl) {
  try {
    console.log(`Setting webhook to: ${webhookUrl}`);
    
    const response = await axios.post(`${BASE_URL}/setWebhook`, {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query']
    });
    
    if (response.data.ok) {
      console.log('✅ Webhook set successfully!');
      console.log('Result:', response.data.result);
    } else {
      console.error('❌ Failed to set webhook:', response.data);
    }
  } catch (error) {
    console.error('Error setting webhook:', error.message);
  }
}

async function getWebhookInfo() {
  try {
    const response = await axios.get(`${BASE_URL}/getWebhookInfo`);
    console.log('Current webhook info:', response.data.result);
  } catch (error) {
    console.error('Error getting webhook info:', error.message);
  }
}

async function deleteWebhook() {
  try {
    const response = await axios.post(`${BASE_URL}/deleteWebhook`);
    if (response.data.ok) {
      console.log('✅ Webhook deleted successfully!');
    }
  } catch (error) {
    console.error('Error deleting webhook:', error.message);
  }
}

const args = process.argv.slice(2);
const command = args[0];

if (command === 'info') {
  getWebhookInfo();
} else if (command === 'delete') {
  deleteWebhook();
} else if (command) {
  setWebhook(command);
} else {
  console.log(`
Telegram Webhook Setup Script
==============================

Usage:
  node set-telegram-webhook.js <webhook_url>   - Set webhook URL
  node set-telegram-webhook.js info             - Get current webhook info
  node set-telegram-webhook.js delete           - Delete webhook

Examples:
  # For local development with ngrok:
  node set-telegram-webhook.js https://abcd1234.ngrok-free.app/telegram-webhook
  
  # For production:
  node set-telegram-webhook.js https://yourdomain.com/telegram-webhook
`);
}

