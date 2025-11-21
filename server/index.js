require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Env
const PORT = process.env.PORT || 3000;
const VAPI_API_URL = process.env.VAPI_API_URL;
const VAPI_API_KEY = process.env.VAPI_API_KEY;
const CALLER_ID = process.env.CALLER_ID || null;
const WEBHOOK_PUBLIC_BASE = process.env.WEBHOOK_PUBLIC_BASE || null;

// Basic in-memory store for demo (non-persistent)
const leads = {};

// Helpers
function normalizeToE164(raw) {
  if (!raw) return null;
  let n = raw.trim();
  n = n.replace(/[^0-9+]/g,'');
  // handle 10-digit Indian numbers
  if (/^[0-9]{10}$/.test(n)) return '+91' + n;
  if (/^91[0-9]{10}$/.test(n)) return '+' + n;
  if (/^\+[0-9]{10,15}$/.test(n)) return n;
  return null;
}

// IMPORTANT: Replace the system prompt text below with your full Candle & Co system prompt
const SYSTEM_PROMPT = `You are Maya, the voice-based sales assistant for Candle & Co... [REPLACE WITH FULL SYSTEM PROMPT]`;

// Post: /enquire
app.post('/enquire', async (req, res) => {
  try {
    const { name, phone, consent } = req.body;
    if (!consent) return res.status(400).json({ message: 'consent required' });
    const to = normalizeToE164(phone);
    if (!to) return res.status(400).json({ message: 'invalid phone format' });

    // quick lead record
    const leadId = Date.now().toString();
    leads[leadId] = { id: leadId, name: name || null, phone: to, createdAt: new Date().toISOString(), status: 'queued' };

    // build VAPI payload - adapt to your VAPI schema.
    // Many VAPI providers accept a "messages" array; adapt if yours expects a different shape.
    const payload = {
      to,
      from: CALLER_ID,
      // either inline system prompt or a reference to a flow ID your VAPI uses
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'assistant', content: 'Hello! I'm Maya from Candle & Co. Do you have a minute to talk?' }
      ],
      context: { leadId, name: name || null },
      // webhook callback so we receive call events
      webhook_url: (WEBHOOK_PUBLIC_BASE ? WEBHOOK_PUBLIC_BASE.replace(/\/$/, '') : '') + '/webhook'
    };

    // Call VAPI
    const r = await axios.post(VAPI_API_URL, payload, {
      headers: { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 15000
    });

    // store call id if returned
    leads[leadId].vapiCallId = r.data.call_id || r.data.id || null;
    leads[leadId].status = 'call_initiated';

    return res.json({ ok: true, leadId, message: 'Call triggered — you should receive a call shortly.' });
  } catch (err) {
    console.error('enquire error', err.response ? err.response.data : err.message);
    return res.status(500).json({ message: 'server error triggering call' });
  }
});

// Webhook endpoint to receive VAPI events
app.post('/webhook', (req, res) => {
  console.log('VAPI WEBHOOK:', JSON.stringify(req.body).slice(0,2000));
  // For demo: find lead by context or call id and update memory store
  try {
    const body = req.body || {};
    const leadId = (body.context && body.context.leadId) || (body.metadata && body.metadata.leadId) || null;
    const callId = body.call_id || body.id || null;
    const event = body.event || body.status || 'unknown';
    const transcription = body.transcription || null;

    // find lead
    const lead = leadId ? leads[leadId] : Object.values(leads).find(l => l.vapiCallId === callId);
    if (lead) {
      lead.lastEvent = { event, transcription, raw: body, ts: new Date().toISOString() };
      if (event === 'completed' || event === 'failed' || event === 'no-answer') lead.status = event;
    }

    res.status(200).send({ ok: true });
  } catch (e) {
    console.error('webhook handler error', e);
    res.status(500).send({ ok: false });
  }
});

// Simple list endpoint for demo inspection
app.get('/leads', (req, res) => {
  res.json(Object.values(leads));
});

// Serve frontend index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Export for Vercel serverless functions
module.exports = app;

// Only listen when running locally (not on Vercel)
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

