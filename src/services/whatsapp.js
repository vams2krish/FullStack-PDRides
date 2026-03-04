import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;

/**
 * Send a text message
 */
export const sendTextMessage = async (to, text) => {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.log(`[MOCK] WhatsApp message to ${to}: ${text}`);
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, messageId: response.data.messages?.[0]?.id };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Send a message with interactive buttons
 */
export const sendButtonMessage = async (to, text, buttons) => {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.log(`[MOCK] WhatsApp button message to ${to}: ${text}`);
    console.log(`[MOCK] Buttons:`, buttons.map(b => b.title).join(', '));
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: text },
          action: {
            buttons: buttons.map((btn, index) => ({
              type: 'reply',
              reply: {
                id: btn.id || `btn_${index}`,
                title: btn.title
              }
            }))
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, messageId: response.data.messages?.[0]?.id };
  } catch (error) {
    console.error('Error sending WhatsApp button message:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Send a list message (for multiple options)
 */
export const sendListMessage = async (to, text, sections) => {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.log(`[MOCK] WhatsApp list message to ${to}: ${text}`);
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: text },
          action: {
            button: 'Select',
            sections: sections.map(section => ({
              title: section.title,
              rows: section.rows.map(row => ({
                id: row.id,
                title: row.title,
                description: row.description || ''
              }))
            }))
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, messageId: response.data.messages?.[0]?.id };
  } catch (error) {
    console.error('Error sending WhatsApp list message:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Send a template message
 */
export const sendTemplateMessage = async (to, templateName, languageCode = 'en', components = []) => {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.log(`[MOCK] WhatsApp template message to ${to}: ${templateName}`);
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: components
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, messageId: response.data.messages?.[0]?.id };
  } catch (error) {
    console.error('Error sending WhatsApp template message:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (messageId) => {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.log(`[MOCK] Mark message as read: ${messageId}`);
    return { success: true, mock: true };
  }

  try {
    await axios.post(
      `${BASE_URL}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error marking message as read:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

/**
 * Parse incoming webhook message
 */
export const parseIncomingMessage = (body) => {
  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (!message) {
    return null;
  }

  return {
    phoneNumber: message.from,
    messageId: message.id,
    timestamp: message.timestamp,
    type: message.type,
    text: message.text?.body,
    buttonReply: message.interactive?.button_reply?.id,
    listReply: message.interactive?.list_reply?.id,
    location: message.location ? {
      latitude: message.location.latitude,
      longitude: message.location.longitude,
      name: message.location.name,
      address: message.location.address
    } : null
  };
};
