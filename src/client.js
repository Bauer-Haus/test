// ─── MOCK TOGGLE ─────────────────────────────────────────────────────────────
// true  → reads sample JSON from /src/mocks/
// false → hits real backend at VITE_API_URL
const USE_MOCKS = true;

// ─── Mock imports ────────────────────────────────────────────────────────────
import mockBrief        from './mocks/brief-today.json';
import mockCalendar     from './mocks/calendar-today.json';
import mockCoachMeal    from './mocks/coach-meal.json';
import mockCoachMenu    from './mocks/coach-menu.json';
import mockCoachNext    from './mocks/coach-next.json';
import mockDiet         from './mocks/diet-templates.json';
import mockHealth       from './mocks/health.json';
import mockLogDone      from './mocks/log-done-response.json';
import mockLogFast      from './mocks/log-fast-response.json';
import mockLogWeight    from './mocks/log-weight-response.json';
import mockSettings     from './mocks/settings.json';
import mockFasting      from './mocks/state-fasting.json';
import mockMacros       from './mocks/state-macros.json';
import mockRecovery     from './mocks/state-recovery.json';
import mockRotation     from './mocks/state-rotation.json';
import mockSync         from './mocks/sync.json';
import mockTraining     from './mocks/training-split.json';
import mockTrendMacros  from './mocks/trend-macros.json';
import mockTrendSleep   from './mocks/trend-sleep.json';
import mockWeight       from './mocks/trend-weight.json';

// ─── Real backend config ─────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8001';
const token = () => localStorage.getItem('fc_token') ?? '';
export const setToken = (t) => localStorage.setItem('fc_token', t);
const headers = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' });
const get  = (path)       => fetch(`${BASE}${path}`, { headers: headers() }).then(r => r.json());
const post = (path, body) => fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(r => r.json());
const mock = (data, ms = 200) => new Promise(r => setTimeout(() => r(data), ms));

// ─── GETs ────────────────────────────────────────────────────────────────────
export const getBrief         = ()        => USE_MOCKS ? mock(mockBrief)       : get('/api/brief/today');
export const getRecovery      = ()        => USE_MOCKS ? mock(mockRecovery)    : get('/api/state/recovery');
export const getMacros        = ()        => USE_MOCKS ? mock(mockMacros)      : get('/api/state/macros');
export const getRotation      = ()        => USE_MOCKS ? mock(mockRotation)    : get('/api/state/rotation');
export const getFasting       = ()        => USE_MOCKS ? mock(mockFasting)     : get('/api/state/fasting');
export const getCalendar      = ()        => USE_MOCKS ? mock(mockCalendar)    : get('/api/calendar/today');
export const getWeightTrend   = (days=30) => USE_MOCKS ? mock(mockWeight)      : get(`/api/trend/weight?days=${days}`);
export const getSleepTrend    = (days=14) => USE_MOCKS ? mock(mockTrendSleep)  : get(`/api/trend/sleep?days=${days}`);
export const getMacrosTrend   = (days=14) => USE_MOCKS ? mock(mockTrendMacros) : get(`/api/trend/macros?days=${days}`);
export const getTrainingSplit = ()        => USE_MOCKS ? mock(mockTraining)    : get('/api/training/split');
export const getDietTemplates = ()        => USE_MOCKS ? mock(mockDiet)        : get('/api/diet/templates');
export const getHealth        = ()        => USE_MOCKS ? mock(mockHealth)      : get('/health');
export const getSettings      = ()        => USE_MOCKS ? mock(mockSettings)    : get('/api/settings');

// ─── POSTs ───────────────────────────────────────────────────────────────────
export const logDone      = (day, note, date) => USE_MOCKS ? mock(mockLogDone)   : post('/api/log/done',       { day, note, date });
export const logWeight    = (weight_lb, date) => USE_MOCKS ? mock(mockLogWeight) : post('/api/log/weight',     { weight_lb, date });
export const logFastStart = (time, date)      => USE_MOCKS ? mock(mockLogFast)   : post('/api/log/fast/start', { time, date });
export const logFastEnd   = (time, date)      => USE_MOCKS ? mock(mockLogFast)   : post('/api/log/fast/end',   { time, date });

// ─── Streaming POSTs (SSE) ───────────────────────────────────────────────────
// Streams a string word-by-word to simulate live token streaming.
const mockStream = (final, onChunk, onDone) => {
  const text = final.spoken_summary || final.message || 'Done.';
  const words = text.split(' ');
  let i = 0;
  const id = setInterval(() => {
    if (i >= words.length) { clearInterval(id); onDone({ ...final, done: true }); return; }
    onChunk(words[i] + ' '); i++;
  }, 40);
  return () => clearInterval(id);
};

const stream = (path, body, onChunk, onDone) => {
  const ctrl = new AbortController();
  fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal: ctrl.signal })
    .then(async (res) => {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        for (const line of buf.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const msg = JSON.parse(line.slice(6));
            if (msg.delta) onChunk(msg.delta);
            if (msg.done)  onDone(msg);
          } catch {}
        }
        buf = buf.includes('\n') ? buf.split('\n').pop() : buf;
      }
    }).catch(() => {});
  return () => ctrl.abort();
};

export const streamCoachNext = (onChunk, onDone) =>
  USE_MOCKS ? mockStream(mockCoachNext, onChunk, onDone)
            : stream('/api/coach/next', {}, onChunk, onDone);

export const streamCoachMeal = (slot, hint, onChunk, onDone) =>
  USE_MOCKS ? mockStream(mockCoachMeal, onChunk, onDone)
            : stream('/api/coach/meal', { slot, hint }, onChunk, onDone);

export const streamCoachMenu = (place, onChunk, onDone) =>
  USE_MOCKS ? mockStream(mockCoachMenu, onChunk, onDone)
            : stream('/api/coach/menu', { place }, onChunk, onDone);

export const streamSync = (sources, onChunk, onDone) =>
  USE_MOCKS ? mockStream({ ...mockSync, spoken_summary: 'Sync complete.' }, onChunk, onDone)
            : stream('/api/sync', { sources }, onChunk, onDone);

export const streamRegenBrief = (onChunk, onDone) =>
  USE_MOCKS ? mockStream({ ...mockBrief, spoken_summary: 'Brief regenerated.' }, onChunk, onDone)
            : stream('/api/brief/regenerate', {}, onChunk, onDone);

export const subscribePush = (subscription) =>
  USE_MOCKS ? mock({ status: 'subscribed' }) : post('/api/push/subscribe', { subscription });
