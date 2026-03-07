/**
 * Test script to verify Telegram bot is working
 * Run: node test-telegram-bot.js
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env');
  console.log('\nTo fix:');
  console.log('1. Open .env file');
  console.log('2. Add: TELEGRAM_BOT_TOKEN=your_bot_token');
  console.log('3. Get token from @BotFather on Telegram\n');
  process.exit(1);
}

const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function testBot() {
  console.log('🧪 Testing Telegram Bot Configuration...\n');
  
  try {
    // Test 1: Get bot info
    console.log('1. Getting bot info...');
    const botInfo = await axios.get(`${BASE_URL}/getMe`);
    if (botInfo.data.ok) {
      console.log(`   ✅ Bot name: ${botInfo.data.result.first_name}`);
      console.log(`   ✅ Username: @${botInfo.data.result.username}`);
    } else {
      console.log('   ❌ Failed to get bot info');
      return;
    }

    // Test 2: Get webhook info
    console.log('\n2. Checking webhook status...');
    const webhookInfo = await axios.get(`${BASE_URL}/getWebhookInfo`);
    if (webhookInfo.data.result.url) {
      console.log(`   ✅ Webhook URL: ${webhookInfo.data.result.url}`);
    } else {
      console.log('   ⚠️  No webhook set - messages will not be received!');
      console.log('   To fix: Run: node set-telegram-webhook.js <your-server-url>');
    }

    // Test 3: Send a test message to yourself (if you know your chat ID)
    console.log('\n3. Testing message send...');
    console.log('   ℹ️  To get your chat ID:');
    console.log('   - Message your bot on Telegram');
    console.log('   - Visit: https://api.telegram.org/bot<TOKEN>/getUpdates');
    console.log('   - Look for "chat":{"id":XXXXXXXX} in the response');
    console.log('\n   Once you have your chat ID, you can test with:');
    console.log('   node test-telegram-bot.js <your_chat_id>\n');

    // If chat ID provided as argument, send test message
    const chatId = process.argv[2];
    if (chatId) {
      console.log(`   Sending test message to ${chatId}...`);
      const sent = await axios.post(`${BASE_URL}/sendMessage`, {
        chat_id: chatId,
        text: '🧪 *Test Message*\n\nYour Telegram bot is working! Reply with "hi" to test.',
        parse_mode: 'Markdown'
      });
      
      if (sent.data.ok) {
        console.log('   ✅ Test message sent successfully!');
      } else {
        console.log('   ❌ Failed to send:', sent.data);
      }
    }

    console.log('\n✅ Bot configuration check complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Set up webhook: node set-telegram-webhook.js <url>');
    console.log('2. For local dev: Use ngrok (ngrok http 3000)');
    console.log('3. Message your bot "hi" on Telegram');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

testBot();

