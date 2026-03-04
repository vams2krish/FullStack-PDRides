import axios from 'axios';

const PHONE_NUMBER_ID = '938254902715158';
const ACCESS_TOKEN = 'EAAUPsnYJlX4BQ7ntxFhZA0OpvaKvhtqji8CpfX5xO57EhwQOcfrRSl0LfUVZCjue3ak2K6OCihzp6MJmvUvpZBo8VK66Mz4XunSkcbKdhZAYqG0Pe5LkjkamxZAtjfJmFCauZCqgZC2IdBubAUJIfSYQnH4PIXXogFmBAudF5JkvbQWtUCoNCO06ZCDsDqu36lJtCprTdMyBcZCpZBrgmulNqsZCEXZCC7iVfkbIbWVvJWqmCvs0nsJMSVqrXZCI1P6qFTfMSnsOQ2lL8AL1K0HHZB3l1O';

async function sendTestMessage() {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: '+14756556866',
        type: 'text',
        text: {
          body: 'Hello from PDRides! Your WhatsApp bot is now connected!'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Message sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

sendTestMessage();
