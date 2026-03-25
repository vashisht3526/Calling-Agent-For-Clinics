/* ============================================
   LifeLine Hospital — AI Voice Agent Integration
   Template for Vapi / Sarvam AI / Retell AI
   ============================================ */

/**
 * HOW TO USE
 * 
 * 1. Set up an account with Vapi (vapi.ai) or Sarvam AI.
 * 2. Create an assistant with the system prompt below.
 * 3. Set the webhook URL in their dashboard to:
 *    https://your-domain.com/api/voice/webhook
 * 4. Add your API keys to a .env file:
 *    VAPI_API_KEY=your_key_here
 *    WHATSAPP_API_TOKEN=your_token_here
 */

const express = require('express');
const router = express.Router();
// const axios = require('axios'); // Requires npm install axios

// Basic Prompts for the AI Agent
const SYSTEM_PROMPT = `
  You are an AI receptionist for LifeLine Hospital in Mumbai.
  Be polite, professional, and helpful. Use a warm Indian English accent.
  
  CLINIC INFO:
  - Address: Andheri West, Near Metro Station, Mumbai
  - OPD Timings: Mon-Sat, 8:00 AM to 9:00 PM
  - Specialities: Cardiology, Orthopedics, Dermatology, Gynecology, Pediatrics, General Medicine.
  
  YOUR JOB is to help patients book appointments. Ask for:
  1. Patient's Full Name
  2. The doctor they want to see, or their symptoms/specialty needed
  3. Preferred Date and Time
  
  If they ask about a doctor's availability, check the available slots.
  Once confirmed, thank them and say they will receive a WhatsApp confirmation.
`;

/**
 * Webhook Endpoint (Receives tool calls / transcripts from the AI)
 * Vapi/Sarvam will ping this URL when the AI needs to check a doctor's availability
 * or book an appointment.
 */
router.post('/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Example: Handling Vapi Tool Calls
    if (message && message.type === 'tool-calls') {
      const results = [];
      
      for (const toolCall of message.toolCalls) {
        if (toolCall.function.name === 'checkAvailability') {
          // Mock checking database
          const { doctorName, date } = JSON.parse(toolCall.function.arguments);
          console.log(`AI checking availability for ${doctorName} on ${date}`);
          
          results.push({
            toolCallId: toolCall.id,
            result: "Available slots: 10:00 AM, 11:30 AM, 2:00 PM"
          });
        }
        
        if (toolCall.function.name === 'bookAppointment') {
          const { patientName, phone, doctorName, date, time } = JSON.parse(toolCall.function.arguments);
          console.log(`🤖 AI Booking: ${patientName} with ${doctorName} on ${date} at ${time}`);
          
          // Here you would INSERT into SQLite db using `better-sqlite3`
          // db.prepare('INSERT INTO appointments (...) ... ').run(...)
          
          results.push({
            toolCallId: toolCall.id,
            result: "Appointment successfully booked."
          });
          
          // Send WhatsApp Confirmation asynchronously
          sendWhatsAppConfirmation(phone, patientName, doctorName, date, time);
        }
      }
      
      return res.json({ results });
    }
    
    // Example: Handling Call End (Transcript & Summary)
    if (message && message.type === 'end-of-call-report') {
      console.log('Call Ended. Logging summary...');
      const summary = message.summary || 'No summary provided';
      const duration = message.duration || 0;
      const callerPhone = message.customer?.number || 'Unknown';
      
      // Here you would log to the database
      // db.prepare('INSERT INTO call_logs ...').run(...)
      
      return res.json({ success: true });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Function to send WhatsApp message via Meta/Twilio API
 */
async function sendWhatsAppConfirmation(phone, name, doctor, date, time) {
  console.log(`📱 Sending WhatsApp to ${phone}...`);
  // Example Twilio / Meta API call:
  /*
  const formatPhone = phone.startsWith('+') ? phone : '+91' + phone;
  await axios.post('https://graph.facebook.com/v17.0/YOUR_PHONE_ID/messages', {
    messaging_product: 'whatsapp',
    to: formatPhone,
    type: 'template',
    template: {
      name: 'appointment_confirmation',
      language: { code: 'en' },
      components: [
        { type: 'body', parameters: [
          { type: 'text', text: name },
          { type: 'text', text: doctor },
          { type: 'text', text: date },
          { type: 'text', text: time }
        ]}
      ]
    }
  }, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` } });
  */
}

module.exports = {
  voiceRouter: router,
  SYSTEM_PROMPT
};
