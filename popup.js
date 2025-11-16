// popup.js
const out = document.getElementById('out');
const connectBtn = document.getElementById('connect');
const listBtn = document.getElementById('list-events');

function log(msg, obj) {
  out.textContent += `\n${msg}` + (obj ? `\n${JSON.stringify(obj, null, 2)}` : '');
}

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

async function ensureToken() {
  // Try silent first, then fall back to interactive
  try {
    return await getToken(false);
  } catch {
    return await getToken(true);
  }
}

connectBtn.addEventListener('click', async () => {
  try {
    const token = await getToken(true);
    log('✅ Connected. Token acquired.');
  } catch (e) {
    log('❌ Connect failed:', e);
  }
});

listBtn.addEventListener('click', async () => {
  try {
    const token = await ensureToken();
    const headers = new Headers({
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    });

    // Example: list upcoming events from primary calendar
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=5&orderBy=startTime&singleEvents=true&timeMin=' + new Date().toISOString(),
      { headers }
    );
    const data = await res.json();
    log('📅 Next 5 events:', data);
  } catch (e) {
    log('❌ Fetch failed:', e);
  }
});
