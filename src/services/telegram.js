import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Send a text message
 */
export const sendTextMessage = async (chatId, text, parseMode = 'Markdown') => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[MOCK] Telegram message to ${chatId}: ${text}`);
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/sendMessage`,
      {
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
        disable_web_page_preview: true
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, messageId: response.data.result.message_id };
  } catch (error) {
    console.error('Error sending Telegram message:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Send a message with inline keyboard buttons
 */
export const sendButtonMessage = async (chatId, text, buttons, parseMode = 'Markdown') => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[MOCK] Telegram button message to ${chatId}: ${text}`);
    console.log(`[MOCK] Buttons:`, buttons.map(b => b.title).join(', '));
    return { success: true, mock: true };
  }

  try {
    // Telegram has a limit of 3-4 buttons per row in inline keyboard
    // We'll organize buttons into rows of 2 for better UX
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      const row = [];
      row.push({
        text: buttons[i].title,
        callback_data: buttons[i].id
      });
      if (buttons[i + 1]) {
        row.push({
          text: buttons[i + 1].title,
          callback_data: buttons[i + 1].id
        });
      }
      keyboard.push(row);
    }

    const response = await axios.post(
      `${BASE_URL}/sendMessage`,
      {
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
        reply_markup: {
          inline_keyboard: keyboard
        },
        disable_web_page_preview: true
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, messageId: response.data.result.message_id };
  } catch (error) {
    console.error('Error sending Telegram button message:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Send a message with keyboard (reply keyboard)
 */
export const sendKeyboardMessage = async (chatId, text, keyboardButtons, parseMode = 'Markdown') => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[MOCK] Telegram keyboard message to ${chatId}: ${text}`);
    return { success: true, mock: true };
  }

  try {
    const keyboard = keyboardButtons.map(btn => [{
      text: btn.title
    }]);

    const response = await axios.post(
      `${BASE_URL}/sendMessage`,
      {
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
        reply_markup: {
          keyboard: keyboard,
          resize_keyboard: true,
          one_time_keyboard: false
        },
        disable_web_page_preview: true
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, messageId: response.data.result.message_id };
  } catch (error) {
    console.error('Error sending Telegram keyboard message:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Edit existing message with new keyboard
 */
export const editMessageText = async (chatId, messageId, text, buttons, parseMode = 'Markdown') => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[MOCK] Telegram edit message ${messageId}: ${text}`);
    return { success: true, mock: true };
  }

  try {
    let replyMarkup = {};
    if (buttons && buttons.length > 0) {
      const keyboard = [];
      for (let i = 0; i < buttons.length; i += 2) {
        const row = [];
        row.push({
          text: buttons[i].title,
          callback_data: buttons[i].id
        });
        if (buttons[i + 1]) {
          row.push({
            text: buttons[i + 1].title,
            callback_data: buttons[i + 1].id
          });
        }
        keyboard.push(row);
      }
      replyMarkup = { inline_keyboard: keyboard };
    }

    const response = await axios.post(
      `${BASE_URL}/editMessageText`,
      {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: parseMode,
        reply_markup: replyMarkup,
        disable_web_page_preview: true
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error editing Telegram message:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Answer callback query (for button clicks)
 */
export const answerCallbackQuery = async (callbackQueryId, text) => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[MOCK] Telegram answer callback ${callbackQueryId}: ${text}`);
    return { success: true, mock: true };
  }

  try {
    await axios.post(
      `${BASE_URL}/answerCallbackQuery`,
      {
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: false
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error answering Telegram callback:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Remove inline keyboard from message
 */
export const removeKeyboard = async (chatId, messageId, text) => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[MOCK] Telegram remove keyboard ${messageId}`);
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/editMessageText`,
      {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error removing Telegram keyboard:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Send venue/location request
 */
export const sendVenueRequest = async (chatId, text) => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[MOCK] Telegram venue request to ${chatId}: ${text}`);
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/sendMessage`,
      {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{
            text: '📍 Share Location',
            request_location: true
          }]],
          resize_keyboard: true,
          one_time_keyboard: true
        },
        disable_web_page_preview: true
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, messageId: response.data.result.message_id };
  } catch (error) {
    console.error('Error sending Telegram venue request:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Parse incoming Telegram message
 */
export const parseIncomingMessage = (body) => {
  const message = body.message;
  const callbackQuery = body.callback_query;

  // Handle callback query (button clicks)
  if (callbackQuery) {
    return {
      chatId: callbackQuery.message?.chat?.id,
      messageId: callbackQuery.message?.message_id,
      from: callbackQuery.from,
      callbackQueryId: callbackQuery.id,
      data: callbackQuery.data,
      type: 'callback',
      text: callbackQuery.data // Treat callback data as the input text
    };
  }

  // Handle regular message
  if (!message) {
    return null;
  }

  const chat = message.chat;
  const from = message.from;

  // Handle location
  if (message.location) {
    return {
      chatId: chat.id,
      messageId: message.message_id,
      from: from,
      type: 'location',
      text: 'location',
      location: {
        latitude: message.location.latitude,
        longitude: message.location.longitude
      }
    };
  }

  // Handle text message
  if (message.text) {
    return {
      chatId: chat.id,
      messageId: message.message_id,
      from: from,
      type: 'text',
      text: message.text,
      firstName: from.first_name,
      lastName: from.last_name,
      username: from.username
    };
  }

  return null;
};

/**
 * Set webhook for Telegram bot
 */
export const setWebhook = async (webhookUrl) => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(`[MOCK] Set Telegram webhook to: ${webhookUrl}`);
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/setWebhook`,
      {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      }
    );

    return { success: true, result: response.data };
  } catch (error) {
    console.error('Error setting Telegram webhook:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Get bot info
 */
export const getMe = async () => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[MOCK] Get bot info');
    return { success: true, mock: true, result: { username: 'PDRidesBot', first_name: 'PDRides' } };
  }

  try {
    const response = await axios.get(`${BASE_URL}/getMe`);
    return { success: true, result: response.data.result };
  } catch (error) {
    console.error('Error getting bot info:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

