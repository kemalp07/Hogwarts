const screenIntro = document.getElementById('screen-intro');
const chatScreen = document.getElementById('chat-screen');
const messagesEl = document.getElementById('messages-container');
const messagesScrollEl = document.getElementById('messages');
const enterBtn = document.getElementById('enter-btn');
const nameInput = document.getElementById('input-name');
const chatForm = document.getElementById('chat-form');
const messageTextarea = document.getElementById('message-textarea');

function showIntroScreen() {
  screenIntro.style.display = 'flex';
  chatScreen.style.display = 'none';
  chatScreen.style.visibility = 'hidden';
}

function showChatScreen() {
  screenIntro.style.display = 'none';
  chatScreen.style.display = 'flex';
  chatScreen.style.visibility = 'visible';
}

let userName = localStorage.getItem('user_name') || '';
let sessionId = localStorage.getItem('session_id');
if (!sessionId) {
  sessionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('sess-' + Date.now() + '-' + Math.random().toString(36).slice(2,10));
  localStorage.setItem('session_id', sessionId);
}

const BACKEND_BASE = 'http://127.0.0.1:9000';

// Parse message: *...* → italik gri narration, "..." → parlak dialog, \n → <br>
function parseMessage(text) {
  // 1. *...* narrasyon → italik gri
  text = text.replace(/\*([^*]+)\*/g, 
    '<em class="narration">$1</em>');
  
  // 2. "..." diyalog → parlak renk
  text = text.replace(/"([^"]+)"/g, 
    '<span class="dialog">"$1"</span>');
  
  // 3. Satır sonları
  text = text.replace(/\n/g, '<br>');
  
  return text;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function fetchHistory(sid) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/history?session_id=${encodeURIComponent(sid)}`);
    if (!res.ok) throw new Error('Failed to fetch history');
    const data = await res.json();
    return data.messages || [];
  } catch (e) {
    console.error('History fetch error:', e);
    return [];
  }
}
messageTextarea.addEventListener('input', () => {
  messageTextarea.style.height = 'auto';
  messageTextarea.style.height = messageTextarea.scrollHeight + 'px';
});

// Enter göndersin, Shift+Enter yeni satır yapsın
messageTextarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event('submit'));
  }
});

function addAIMessage(text, senderName) {
  const div = document.createElement('div');
  div.className = 'message message-ai';
  div.innerHTML = `
    <div class="message-inner">
      <div class="avatar">🧙</div>
      <div class="content">
        <div class="sender">${senderName || 'Hogwarts'}</div>
        <div class="text">${parseMessage(text)}</div>
      </div>
    </div>
  `;
  messagesEl.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
}

// Boş AI mesaj kutusu oluştur (stream dolduracak)
function createEmptyAIMessage() {
  const div = document.createElement('div');
  div.className = 'message message-ai';
  div.innerHTML = `
    <div class="message-inner">
      <div class="avatar">🧙</div>
      <div class="content">
        <div class="sender">...</div>
        <div class="text"></div>
      </div>
    </div>
  `;
  messagesEl.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth' });
  return div;
}

function addUserMessage(text) {
  const initials = (userName || 'Ö').substring(0, 1).toUpperCase();
  const div = document.createElement('div');
  div.className = 'message message-user';
  div.innerHTML = `
    <div class="message-inner">
      <div class="avatar">${initials}</div>
      <div class="content">
        <div class="sender">${userName || 'Sen'}</div>
        <div class="text">${escapeHtml(text)}</div>
      </div>
    </div>
  `;
  messagesEl.appendChild(div);
  if (messagesScrollEl) messagesScrollEl.scrollTop = messagesScrollEl.scrollHeight;
}

function showLoading() {
  const div = document.createElement('div');
  div.className = 'message message-ai';
  div.id = 'loading-msg';
  div.innerHTML = `
    <div class="message-inner">
      <div class="avatar">🧙</div>
      <div class="content">
        <div class="dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    </div>
  `;
  messagesEl.appendChild(div);
  if (messagesScrollEl) messagesScrollEl.scrollTop = messagesScrollEl.scrollHeight;
}

function hideLoading() {
  const loading = document.getElementById('loading-msg');
  if (loading) loading.remove();
}

function createTypewriterRenderer({ textEl, scrollEl }) {
  let targetText = '';
  let shownText = '';
  let isTyping = false;
  let dirtyCounter = 0;
  const TICK_MS = 12;

  function render(force = false) {
    if (!textEl) return;
    // DOM'u her harfte değil, birkaç harfte bir güncelle (performans)
    if (!force && dirtyCounter < 4) return;
    dirtyCounter = 0;
    textEl.innerHTML = parseMessage(shownText);
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  function step() {
    if (shownText.length >= targetText.length) {
      isTyping = false;
      render(true);
      return;
    }

    shownText += targetText[shownText.length];
    dirtyCounter += 1;
    render(false);
    setTimeout(step, TICK_MS);
  }

  return {
    append(text) {
      if (!text) return;
      targetText += text;
      if (!isTyping) {
        isTyping = true;
        setTimeout(step, 0);
      }
    },
    flush() {
      shownText = targetText;
      render(true);
    },
  };
}

async function sendMessage(text) {
  const payload = { message: text, session_id: sessionId, user_name: userName };
  const res = await fetch(`${BACKEND_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  if (!res.body) {
    throw new Error('Streaming not supported by this browser');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  hideLoading();
  const msgDiv = createEmptyAIMessage();
  const textEl = msgDiv.querySelector('.text');
  const senderEl = msgDiv.querySelector('.sender');

  const typewriter = createTypewriterRenderer({ textEl, scrollEl: messagesScrollEl });

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = (line || '').trim();
      if (!trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6).trim();
      if (!data) continue;

      try {
        const parsed = JSON.parse(data);

        if (parsed.type === 'meta') {
          if (parsed.session_id) {
            sessionId = parsed.session_id;
            localStorage.setItem('session_id', sessionId);
          }
        }

        if (parsed.type === 'chunk') {
          typewriter.append(parsed.text || '');
        }

        if (parsed.type === 'done') {
          if (senderEl) senderEl.textContent = parsed.character_name || 'Hogwarts';
          typewriter.flush();
        }
      } catch (e) {
        continue;
      }
    }
  }
}

enterBtn.addEventListener('click', async () => {
  const name = (nameInput.value || '').trim() || 'Öğrenci';
  userName = name;
  localStorage.setItem('user_name', userName);
  showChatScreen();
  // trigger opening sequence
  showLoading();
  try {
    await sendMessage('');
  } catch (e) {
    hideLoading();
    addAIMessage(`Hata: ${e.message}`, 'Sistem');
  }
});

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = (messageTextarea.value || '').trim();
  if (!text) return;
  addUserMessage(text);
  messageTextarea.value = '';
  messageTextarea.style.height = 'auto';
  showLoading();
  try {
    await sendMessage(text);
  } catch (err) {
    hideLoading();
    addAIMessage(`Hata: ${err.message}`, 'Sistem');
  }
});

// initial state: check localStorage for resume or fresh start
(async () => {
  if (userName) {
    // Resume session: show chat screen and load history
    showChatScreen();
    
    // Load previous messages
    const history = await fetchHistory(sessionId);
    if (history && history.length > 0) {
      history.forEach(msg => {
        if (msg.role === 'user') {
          addUserMessage(msg.content);
        } else {
          addAIMessage(msg.content, 'Hogwarts');
        }
      });
    } else {
      // No history; trigger opening
      showLoading();
      try {
        await sendMessage('');
      } catch (e) {
        hideLoading();
        addAIMessage(`Hata: ${e.message}`, 'Sistem');
      }
    }
  } else {
    // Fresh start: show intro
    showIntroScreen();
  }
})();
