// popup.js

const BACKEND_URL = 'http://localhost:3000';

const ghostImg = document.getElementById('ghost');
const statusDiv = document.getElementById('status');

const eventInput = document.getElementById('event-input');
const parseBtn = document.getElementById('parse-btn');

const reviewDiv = document.getElementById('review');
const titleInput = document.getElementById('title-input');
const dateInput = document.getElementById('date-input');
const startInput = document.getElementById('start-input');
const endInput = document.getElementById('end-input');
const locationInput = document.getElementById('location-input');
const confirmBtn = document.getElementById('confirm-btn');

// ---------- UI helpers ----------

function setGhostState(state) {
  if (state === 'idle') ghostImg.src = 'ghost-idle.png';
  if (state === 'thinking') ghostImg.src = 'ghost-thinking.png';
  if (state === 'review') ghostImg.src = 'ghost-review.png';
  if (state === 'success') ghostImg.src = 'ghost-happy.png';
  if (state === 'error') ghostImg.src = 'ghost-sad.png';
}

function setStatus(msg) {
  statusDiv.textContent = msg || '';
}

// ---------- Backend / Gemini ----------

async function callGemini(text) {
  const res = await fetch(`${BACKEND_URL}/api/parse-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) {
    throw new Error('Backend/Gemini error');
  }
  return await res.json(); // { title, start_datetime_iso, ... }
}

function showReview(eventData) {
  // Title
  titleInput.value = eventData.title || '';

  // Start date/time
  if (eventData.start_datetime_iso) {
    const start = new Date(eventData.start_datetime_iso);
    dateInput.value = start.toISOString().slice(0, 10); // YYYY-MM-DD
    startInput.value = start.toTimeString().slice(0, 5); // HH:MM
  }

  // End time
  if (eventData.end_datetime_iso) {
    const end = new Date(eventData.end_datetime_iso);
    endInput.value = end.toTimeString().slice(0, 5);
  }

  // Location / link
  locationInput.value =
    eventData.online_meeting_url || eventData.location || '';

  reviewDiv.classList.remove('hidden');
}

// ---------- Google Auth helpers ----------

function getToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        return reject(chrome.runtime.lastError?.message || 'No token');
      }
      resolve(token);
    });
  });
}

// ---------- Event handlers ----------

// Parse & Review button
parseBtn.addEventListener('click', async () => {
  const raw = eventInput.value.trim();
  if (!raw) {
    setStatus('Please paste your event text first.');
    return;
  }

  setGhostState('thinking');
  setStatus('Analyzing your event...');
  reviewDiv.classList.add('hidden');

  try {
    const data = await callGemini(raw);
    setGhostState('review');
    setStatus('Check the details and confirm.');
    showReview(data);
  } catch (err) {
    console.error(err);
    setGhostState('error');
    setStatus('Something went wrong talking to Evently’s brain.');
  }
});

// Confirm & Save button
confirmBtn.addEventListener('click', async () => {
  const date = dateInput.value;
  const startTime = startInput.value;
  const endTime = endInput.value;
  const summary = titleInput.value || 'Untitled Event';
  const location = locationInput.value || '';

  if (!date || !startTime || !endTime) {
    setStatus('Please fill in date and times.');
    return;
  }

  // Use local datetime string (avoid toISOString timezone shift)
  const startIso = `${date}T${startTime}:00`;
  const endIso   = `${date}T${endTime}:00`;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

  try {
    setGhostState('thinking');
    setStatus('Saving to your calendar...');

    // Always interactive for demo so judges see the auth
    const token = await getToken(true);

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary,
          location,
          start: {
            dateTime: startIso,
            timeZone
          },
          end: {
            dateTime: endIso,
            timeZone
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Calendar error:', response.status, errText);
      setGhostState('error');
      setStatus('Google Calendar error. Check console.');
      return;
    }

    setGhostState('success');
    setStatus('Event added! 🎉');
    // TODO: increment XP here later
  } catch (err) {
    console.error(err);
    setGhostState('error');
    setStatus('Could not save to Google Calendar.');
  }
});
