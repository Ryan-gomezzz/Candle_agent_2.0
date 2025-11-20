# Candle Sales Agent Demo

A minimal demo application that connects a landing page form to VAPI for AI-powered outbound sales calls.

## How It Works

1. Visitor opens landing page and clicks "Request Call"
2. Enquiry form asks for name, phone, and consent checkbox
3. Form POSTs to backend `/enquire` endpoint
4. Backend validates, normalizes phone to E.164 (assumes India if 10 digits), triggers VAPI create call endpoint
5. VAPI places the outbound call to the number and runs your AI sales agent flow (Maya)
6. VAPI posts events to `/webhook` (backend receives them; for demo we just log)

## Project Structure

```
CandleSalesAgent-Demo/
├─ frontend/
│  └─ index.html
├─ server/
│  ├─ index.js
│  ├─ package.json
│  └─ .env.example
└─ README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `server/.env` and fill in:
- `VAPI_API_URL` - Your VAPI call-create endpoint
- `VAPI_API_KEY` - Your VAPI API key
- `CALLER_ID` - Your verified caller ID (optional)
- `WEBHOOK_PUBLIC_BASE` - Your public domain or ngrok URL for webhook callbacks

### 3. Update System Prompt

Edit `server/index.js` and replace the `SYSTEM_PROMPT` constant with your full Candle & Co Maya system prompt.

### 4. Run Locally

```bash
cd server
node index.js
```

The server will run on `http://localhost:3000`

### 5. Expose Webhook (for local testing)

In another terminal, run ngrok:

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and update `WEBHOOK_PUBLIC_BASE` in your `.env` file, then restart the server.

## Deployment

### Render / Railway / Heroku

1. Push repo to GitHub
2. Create a new Web Service on Render/Railway/Heroku
3. Connect the repo
4. Set environment variables from `.env`
5. Deploy
6. Configure your VAPI dashboard to use the production webhook URL: `https://yourdomain.com/webhook`

## Important Notes

- **Replace SYSTEM_PROMPT**: Update the placeholder in `server/index.js` with your full Candle & Co Maya prompt
- **VAPI Payload**: If your VAPI uses a flow ID rather than inline prompt, adjust the payload in `/enquire` endpoint (send `flow_id` instead of `messages` array)
- **Phone Normalization**: Currently assumes 10-digit numbers are Indian (+91). Adjust `normalizeToE164()` if needed
- **Webhook**: Ensure `WEBHOOK_PUBLIC_BASE` uses HTTPS (required by most VAPI providers)

## Troubleshooting

- **400 Invalid API key from VAPI**: Check `VAPI_API_KEY` header formatting and value
- **No webhook events**: Make sure `WEBHOOK_PUBLIC_BASE` is reachable and uses HTTPS
- **Call hangs or weird agent voice**: Check VAPI docs for how they expect prompts (messages vs flowId) and limit prompt size if needed

## API Endpoints

- `GET /` - Serves the landing page
- `POST /enquire` - Submits a call request
- `POST /webhook` - Receives VAPI call events
- `GET /leads` - Lists all leads (for demo inspection)

