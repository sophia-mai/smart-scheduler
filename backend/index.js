// index.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_DATE = '2025-11-16'

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is not set in .env');
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// POST /api/parse-event
app.post('/api/parse-event', async (req, res) => {
  console.log('Incoming body:', req.body); // 👀 debug line

  const text = req.body && req.body.text;
  if (!text) {
    return res.status(400).json({ error: 'Missing text in body' });
  }

  const prompt = `
  You are an assistant that extracts calendar event information.

  Assume that "today" is ${BASE_DATE} (YYYY-MM-DD).
  When the text uses relative dates like "tomorrow", "next Tuesday",
  "this Friday", etc., resolve them relative to this fixed date.

  Given the following text, extract:
  - title (short)
  - start_datetime_iso (ISO 8601, assume America/New_York)
  - end_datetime_iso (ISO 8601, default 30 minutes after start if not specified)
  - location
  - online_meeting_url (Zoom/Meet/Teams link)
  - notes (extra info)

  Respond with ONLY valid JSON like:
  {
    "title": "...",
    "start_datetime_iso": "YYYY-MM-DDTHH:MM:SS-05:00",
    "end_datetime_iso": "YYYY-MM-DDTHH:MM:SS-05:00",
    "location": "...",
    "online_meeting_url": "...",
    "notes": "..."
  }

  Text:
  """${text}"""
  `;


  try {
    const apiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('Gemini HTTP error:', apiRes.status, errText);
      return res
        .status(500)
        .json({ error: `Gemini HTTP error ${apiRes.status}` });
    }

    const data = await apiRes.json();
  let modelText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  // Strip ```json ... ``` wrappers if present
  let cleaned = modelText.trim();
  if (cleaned.startsWith('```')) {
    // remove starting ```json or ``` 
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '');
    // remove trailing ```
    cleaned = cleaned.replace(/```$/, '');
    cleaned = cleaned.trim();
  }

  let eventData;
  try {
    eventData = JSON.parse(cleaned);
  } catch (e) {
    console.error('Could not parse JSON from model:', modelText);
    console.error('Cleaned text was:', cleaned);
    return res.status(500).json({ error: 'Invalid JSON from Gemini' });
  }


    res.json(eventData);
  } catch (err) {
    console.error('Gemini API error (network or other):', err);
    res.status(500).json({ error: 'Gemini API error' });
  }
});

app.listen(PORT, () => {
  console.log(`Evently backend listening on port ${PORT}`);
});
