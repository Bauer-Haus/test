import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine
} from 'recharts';
import {
  Activity, Moon, Heart, Battery, Zap, TrendingDown, TrendingUp,
  RefreshCw, Settings, Send, Coffee, Utensils, MapPin, Calendar,
  Dumbbell, ChevronRight, Sparkles, Timer, Plus, Check, Flame,
  Wind, Target, Clock, ArrowUpRight, ArrowDownRight, Search,
  PlayCircle, Volume2, MoreHorizontal, ChevronDown
} from 'lucide-react';

// ─── MOCK DATA (shaped exactly like the OpenAPI contract) ──────────────
const MOCK = {
  date: '2026-05-13',
  recovery: {
    readiness: 81, readiness_level: 'high',
    sleep: { score: 79, avg: 71, minutes: 410, deep: 100, rem: 120, light: 190 },
    hrv: { ms: 33, status: 'balanced', avg: 29, low: 24, high: 34 },
    rhr: { bpm: 56, avg: 58 },
    battery: { start: 36, end: 68, high: 71, low: 36 },
  },
  rotation: {
    state: 'TRAINING_DAY',
    today_day: 'B',
    today_title: 'Upper Pull + Run',
    today_time: '10:00 AM',
    today_location: 'Lifetime Fitness',
    sets: 19, duration: '55–60 min',
    first_lift: 'Single-arm seated cable row · 180 lb',
  },
  macros: {
    consumed: { cal: 740, protein: 92, carbs: 21, fat: 26 },
    goals:    { cal: 1718, protein: 130, carbs: 160, fat: 62 },
    phase: 'Phase 1', phase_day: 4, protein_floor: 130,
  },
  fasting: {
    in_window: false, phase: 'fasting',
    next_open: '12:00', minutes_until_open: 810,
  },
  weight: {
    current: 200.6, start: 207.7, delta: -7.1, avg7: 203.6,
    series: [
      { d: '04-14', v: 209.4 }, { d: '04-16', v: 208.9 }, { d: '04-18', v: 208.1 },
      { d: '04-20', v: 207.5 }, { d: '04-22', v: 207.8 }, { d: '04-24', v: 206.9 },
      { d: '04-26', v: 206.2 }, { d: '04-28', v: 205.8 }, { d: '04-30', v: 205.1 },
      { d: '05-02', v: 204.4 }, { d: '05-04', v: 204.0 }, { d: '05-06', v: 203.3 },
      { d: '05-08', v: 202.8 }, { d: '05-10', v: 202.1 }, { d: '05-11', v: 201.7 },
      { d: '05-12', v: 201.2 }, { d: '05-13', v: 200.6 },
    ],
  },
  sleepSeries: [
    { d: 'T', v: 68 }, { d: 'W', v: 74 }, { d: 'T', v: 65 },
    { d: 'F', v: 70 }, { d: 'S', v: 54 }, { d: 'S', v: 72 }, { d: 'M', v: 79 },
  ],
  hrvSeries: [
    { d: 'T', v: 26 }, { d: 'W', v: 28 }, { d: 'T', v: 25 },
    { d: 'F', v: 30 }, { d: 'S', v: 27 }, { d: 'S', v: 31 }, { d: 'M', v: 33 },
  ],
  rhrSeries: [
    { d: 'T', v: 60 }, { d: 'W', v: 59 }, { d: 'T', v: 60 },
    { d: 'F', v: 58 }, { d: 'S', v: 59 }, { d: 'S', v: 57 }, { d: 'M', v: 56 },
  ],
  macrosWeek: [
    { d: 'T', cal: 1502 }, { d: 'W', cal: 1684 }, { d: 'T', cal: 1390 },
    { d: 'F', cal: 1820 }, { d: 'S', cal: 1252 }, { d: 'S', cal: 1605 },
    { d: 'M', cal: 740, today: true },
  ],
  brief: `Last night was your best sleep in two weeks — 79 score, 6h50, HRV climbing back to 33ms (balanced again). Body Battery rebuilt to 68 by morning. Readiness at 81 is your green light for Day B at 10 AM.\n\nYou're four days into Phase 1 and weight is responding: 200.6 this morning, down 7.1 from your cut start. Protein floor 130g — you're at 92, push the back half of the day toward chicken or whey.`,
  events: [
    { t: 'all-day', title: 'Mom in PV', cal: 'Family' },
    { t: '10:00 AM', title: 'Workout: Day B (Pull + Run)', cal: 'Just Rod', isWorkout: true },
    { t: '2:30 PM', title: 'Rome', cal: 'Work' },
  ],
};

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────
const COLORS = {
  bg: '#0A0B0D',
  surface: '#131418',
  surfaceHi: '#1A1C21',
  border: '#23262C',
  borderHi: '#2E323A',
  text: '#F5F5F4',
  textDim: '#A8A29E',
  textFaint: '#57534E',
  accent: '#C8FA3C',      // lime — primary accent
  accentDim: '#8AB323',
  protein: '#FF6B6B',
  carbs: '#FFB84D',
  fat: '#7DD3FC',
  warn: '#F59E0B',
  good: '#22C55E',
  low: '#EF4444',
};

// ─── HELPERS ────────────────────────────────────────────────────────────
const fmtTime = (mins) => {
  const h = Math.floor(mins / 60); const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};
const pct = (a, b) => Math.min(100, Math.round((a / b) * 100));
const levelColor = (n) => n >= 75 ? COLORS.accent : n >= 50 ? COLORS.warn : COLORS.low;

// ─── COMPONENTS ─────────────────────────────────────────────────────────

const Ring = ({ value, max = 100, size = 200, stroke = 12, color, label, sublabel, children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(value, max) / max) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke={COLORS.border} strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};

const Sparkline = ({ data, color, height = 36 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area
        type="monotone" dataKey="v"
        stroke={color} strokeWidth={1.5}
        fill={`url(#spark-${color})`}
        dot={false} isAnimationActive={true}
      />
    </AreaChart>
  </ResponsiveContainer>
);

const Stat = ({ icon: Icon, label, value, unit, avg, trend, sparkData, color = COLORS.accent }) => (
  <div className="group relative overflow-hidden rounded-2xl border p-5 transition-all hover:border-opacity-100"
    style={{ background: COLORS.surface, borderColor: COLORS.border }}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: COLORS.textDim }} />
        <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>
          {label}
        </span>
      </div>
      {trend && (
        <span className="flex items-center gap-0.5 text-[10px] font-medium"
          style={{ color: trend > 0 ? COLORS.good : COLORS.low }}>
          {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="flex items-baseline gap-1.5 mb-1">
      <span className="text-4xl tracking-tight leading-none"
        style={{ color: COLORS.text, fontFamily: 'var(--font-display)', fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      {unit && (
        <span className="text-xs" style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>
          {unit}
        </span>
      )}
    </div>
    {avg && (
      <div className="text-[10px] mb-3" style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
        7-DAY AVG · {avg}
      </div>
    )}
    {sparkData && (
      <div className="mt-2 -mx-1">
        <Sparkline data={sparkData} color={color} />
      </div>
    )}
  </div>
);

const MacroBar = ({ label, consumed, goal, color }) => {
  const p = pct(consumed, goal);
  const remaining = Math.max(0, goal - consumed);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em]"
            style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>
            {label}
          </span>
          <span className="text-xs" style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
            {remaining}g left
          </span>
        </div>
        <div className="flex items-baseline gap-1" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="text-sm" style={{ color: COLORS.text, fontVariantNumeric: 'tabular-nums' }}>{consumed}</span>
          <span className="text-xs" style={{ color: COLORS.textFaint }}>/ {goal}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: COLORS.border }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${p}%`, background: color, boxShadow: `0 0 12px ${color}66` }} />
      </div>
    </div>
  );
};

const QuickAction = ({ icon: Icon, label, sub, onClick, accent }) => (
  <button onClick={onClick}
    className="group relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99]"
    style={{
      background: COLORS.surface,
      borderColor: COLORS.border,
      color: COLORS.text,
    }}>
    <div className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
      style={{ background: accent ? `${COLORS.accent}15` : COLORS.surfaceHi }}>
      <Icon size={16} style={{ color: accent ? COLORS.accent : COLORS.textDim }} />
    </div>
    <div className="text-left">
      <div className="text-sm font-medium">{label}</div>
      {sub && <div className="text-[10px] uppercase tracking-wider"
        style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>{sub}</div>}
    </div>
  </button>
);

const SectionLabel = ({ children, right }) => (
  <div className="flex items-baseline justify-between mb-4">
    <h2 className="text-[10px] uppercase tracking-[0.2em]"
      style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>
      {children}
    </h2>
    {right}
  </div>
);

// ─── MAIN APP ──────────────────────────────────────────────────────────
export default function FitnessDashboard() {
  const [now, setNow] = useState(new Date());
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'coach', text: "Day B at 10 AM is your green light — readiness is 81, HRV's back to balanced. First lift is single-arm cable row at 180. After strength, 30 min Peloton at Z2 or interval.", time: '6:42 AM' },
  ]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const sendCoach = (prompt) => {
    if (!prompt.trim()) return;
    setMessages(m => [...m, { role: 'user', text: prompt, time: 'now' }]);
    setChatInput('');
    // Simulated coach response
    setTimeout(() => {
      const responses = {
        'next': "Today's Day B at 10 AM. Single-arm cable row 180 to start. 19 working sets, 55–60 min. Then 30 min Peloton Z2.",
        'eat': `You've got 978 cal and 38g protein left. Grilled chicken + rice bowl hits both — aim for 40g protein in the next meal.`,
        'breakfast': "Window opens at noon. Greek yogurt + whey + berries puts you at 35g protein and 310 cal. Lean breakfast for a training day.",
      };
      const key = Object.keys(responses).find(k => prompt.toLowerCase().includes(k)) || 'eat';
      setMessages(m => [...m, { role: 'coach', text: responses[key], time: 'now' }]);
    }, 800);
  };

  const fastingHours = Math.floor(MOCK.fasting.minutes_until_open / 60);
  const fastingMins = MOCK.fasting.minutes_until_open % 60;

  return (
    <div className="min-h-screen w-full" style={{
      background: COLORS.bg,
      color: COLORS.text,
      fontFamily: 'var(--font-sans)',
      // subtle radial vignette for atmosphere
      backgroundImage: 'radial-gradient(ellipse at top, #15171C 0%, #0A0B0D 60%)',
    }}>
      {/* Embedded font + global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        :root {
          --font-display: 'Instrument Serif', Georgia, serif;
          --font-sans: 'Geist', -apple-system, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
        }
        * { -webkit-font-smoothing: antialiased; }
        .grain::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
          opacity: 0.03; mix-blend-mode: overlay; border-radius: inherit;
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .anim-in { animation: fadeUp 0.6s cubic-bezier(.2,.8,.2,1) backwards; }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
      `}</style>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-6 lg:py-10">

        {/* ─── HEADER ───────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-10 anim-in" style={{ animationDelay: '0ms' }}>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] mb-1"
                style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                {now.toLocaleDateString('en-US', { weekday: 'long' })} · {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
              <h1 className="text-5xl tracking-tight leading-none"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>
                <span style={{ fontStyle: 'italic', color: COLORS.accent }}>May</span> 13
                <span style={{ color: COLORS.textFaint, marginLeft: '0.5rem' }}>·</span>
                <span style={{ color: COLORS.textDim, marginLeft: '0.5rem' }}>2026</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSyncing(true); setTimeout(() => setSyncing(false), 1400); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:border-opacity-100"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} style={{ color: COLORS.textDim }} />
              <span className="text-xs" style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>
                {syncing ? 'SYNCING' : 'SYNC'}
              </span>
            </button>
            <button className="flex items-center justify-center w-9 h-9 rounded-lg border transition-colors"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <Settings size={14} style={{ color: COLORS.textDim }} />
            </button>
          </div>
        </header>

        {/* ─── HERO: TODAY + RECOVERY ───────────────────────────────────── */}
        <section className="grid grid-cols-12 gap-5 mb-5">

          {/* Today's plan — left column */}
          <div className="col-span-12 lg:col-span-5 anim-in" style={{ animationDelay: '60ms' }}>
            <div className="relative grain overflow-hidden rounded-3xl p-7 h-full border"
              style={{
                background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.surfaceHi} 100%)`,
                borderColor: COLORS.border,
              }}>
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: COLORS.accent }} />
                <span className="text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: COLORS.accent, fontFamily: 'var(--font-mono)' }}>
                  Today
                </span>
              </div>

              <div className="mb-7">
                <div className="text-[11px] uppercase tracking-[0.16em] mb-2"
                  style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>
                  Training · Day {MOCK.rotation.today_day}
                </div>
                <h2 className="text-5xl leading-[0.95] mb-3 tracking-tight"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>
                  Upper Pull
                  <span style={{ fontStyle: 'italic', color: COLORS.textDim }}> & Run</span>
                </h2>
                <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5 text-sm" style={{ color: COLORS.textDim }}>
                  <span className="flex items-center gap-1.5"><Clock size={12} /> {MOCK.rotation.today_time}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={12} /> {MOCK.rotation.today_location}</span>
                  <span className="flex items-center gap-1.5"><Dumbbell size={12} /> {MOCK.rotation.sets} sets · {MOCK.rotation.duration}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl p-4 border" style={{ background: COLORS.bg, borderColor: COLORS.border }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                    First lift
                  </div>
                  <div className="text-sm leading-tight" style={{ color: COLORS.text }}>
                    Single-arm cable row
                  </div>
                  <div className="text-2xl mt-1"
                    style={{ fontFamily: 'var(--font-display)', color: COLORS.accent, fontVariantNumeric: 'tabular-nums' }}>
                    180 <span className="text-xs" style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>lb</span>
                  </div>
                </div>
                <div className="rounded-xl p-4 border" style={{ background: COLORS.bg, borderColor: COLORS.border }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                    Eating window
                  </div>
                  <div className="text-sm leading-tight" style={{ color: COLORS.text }}>
                    Opens at noon
                  </div>
                  <div className="text-2xl mt-1"
                    style={{ fontFamily: 'var(--font-display)', color: COLORS.text, fontVariantNumeric: 'tabular-nums' }}>
                    {fastingHours}<span className="text-base" style={{ color: COLORS.textDim }}>h</span> {fastingMins}<span className="text-base" style={{ color: COLORS.textDim }}>m</span>
                  </div>
                </div>
              </div>

              {/* Calendar strip */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-[0.16em] mb-2"
                  style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                  Schedule
                </div>
                {MOCK.events.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg transition-colors"
                    style={{
                      background: e.isWorkout ? `${COLORS.accent}0a` : 'transparent',
                      border: e.isWorkout ? `1px solid ${COLORS.accent}25` : '1px solid transparent',
                    }}>
                    <span className="text-[10px] w-16 shrink-0"
                      style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>
                      {e.t}
                    </span>
                    <span className="text-sm flex-1 truncate"
                      style={{ color: e.isWorkout ? COLORS.accent : COLORS.text }}>
                      {e.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recovery ring — center */}
          <div className="col-span-12 lg:col-span-4 anim-in" style={{ animationDelay: '120ms' }}>
            <div className="relative h-full rounded-3xl p-7 border flex flex-col items-center"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <SectionLabel>Recovery</SectionLabel>

              <div className="flex-1 flex flex-col items-center justify-center my-2">
                <Ring value={MOCK.recovery.readiness} size={240} stroke={14} color={COLORS.accent}>
                  <div className="text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>
                    Readiness
                  </div>
                  <div className="text-7xl leading-none my-1"
                    style={{ fontFamily: 'var(--font-display)', color: COLORS.text, fontVariantNumeric: 'tabular-nums' }}>
                    {MOCK.recovery.readiness}
                  </div>
                  <div className="text-xs uppercase tracking-[0.15em] flex items-center gap-1.5"
                    style={{ color: COLORS.accent, fontFamily: 'var(--font-mono)' }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: COLORS.accent }} />
                    High
                  </div>
                </Ring>
              </div>

              <div className="grid grid-cols-3 gap-1 w-full pt-4 border-t" style={{ borderColor: COLORS.border }}>
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-wider mb-1"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>Battery</div>
                  <div className="text-base" style={{ fontFamily: 'var(--font-display)', color: COLORS.text }}>
                    {MOCK.recovery.battery.start}→{MOCK.recovery.battery.end}
                  </div>
                </div>
                <div className="text-center border-l border-r" style={{ borderColor: COLORS.border }}>
                  <div className="text-[9px] uppercase tracking-wider mb-1"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>Stress</div>
                  <div className="text-base" style={{ fontFamily: 'var(--font-display)', color: COLORS.text }}>
                    20<span className="text-[10px]" style={{ color: COLORS.textFaint }}>/100</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-wider mb-1"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>Steps</div>
                  <div className="text-base" style={{ fontFamily: 'var(--font-display)', color: COLORS.text }}>
                    1.9k
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions — right column */}
          <div className="col-span-12 lg:col-span-3 anim-in" style={{ animationDelay: '180ms' }}>
            <div className="rounded-3xl p-6 border h-full flex flex-col"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <SectionLabel>Quick log</SectionLabel>
              <div className="flex flex-col gap-2 flex-1">
                <QuickAction icon={Check} label="Done · Day B" sub="Mark complete" accent />
                <QuickAction icon={Plus} label="Log weight" sub="Manual override" />
                <QuickAction icon={Timer} label="Start fast" sub="Stamp now" />
                <QuickAction icon={Flame} label="End fast" sub="Window opens" />
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between"
                style={{ borderColor: COLORS.border }}>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em]"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>Last session</div>
                  <div className="text-sm mt-0.5">Day A · May 11</div>
                </div>
                <button className="text-xs px-2.5 py-1 rounded-md transition-colors"
                  style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── RECOVERY METRIC ROW ──────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 anim-in" style={{ animationDelay: '240ms' }}>
          <Stat icon={Moon} label="Sleep" value={MOCK.recovery.sleep.score} unit="score"
            avg={MOCK.recovery.sleep.avg} trend={11}
            sparkData={MOCK.sleepSeries} color={COLORS.accent} />
          <Stat icon={Activity} label="HRV" value={MOCK.recovery.hrv.ms} unit="ms"
            avg={`${MOCK.recovery.hrv.avg} · ${MOCK.recovery.hrv.status}`} trend={14}
            sparkData={MOCK.hrvSeries} color={COLORS.accent} />
          <Stat icon={Heart} label="Resting HR" value={MOCK.recovery.rhr.bpm} unit="bpm"
            avg={MOCK.recovery.rhr.avg} trend={-3}
            sparkData={MOCK.rhrSeries} color={COLORS.fat} />
          <Stat icon={Battery} label="Body Battery" value={MOCK.recovery.battery.high} unit="peak"
            avg={`low ${MOCK.recovery.battery.low}`} trend={6}
            sparkData={MOCK.sleepSeries} color={COLORS.accent} />
        </section>

        {/* ─── WEIGHT TREND + MACROS ────────────────────────────────────── */}
        <section className="grid grid-cols-12 gap-5 mb-5">

          {/* Weight trend — 8 cols */}
          <div className="col-span-12 lg:col-span-8 anim-in" style={{ animationDelay: '300ms' }}>
            <div className="rounded-3xl p-7 border" style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <SectionLabel>Weight · 30 days</SectionLabel>
                  <div className="flex items-baseline gap-4">
                    <div className="text-6xl tracking-tight leading-none"
                      style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                      {MOCK.weight.current}
                      <span className="text-2xl ml-1" style={{ color: COLORS.textDim }}>lb</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-md"
                        style={{ background: `${COLORS.good}15`, color: COLORS.good, fontFamily: 'var(--font-mono)' }}>
                        <TrendingDown size={12} /> {MOCK.weight.delta} lb
                      </span>
                      <span className="text-[10px] uppercase tracking-wider"
                        style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                        From {MOCK.weight.start} on May 1
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {['7d', '30d', '90d'].map((r, i) => (
                    <button key={r} className="px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider transition-colors"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        background: i === 1 ? COLORS.surfaceHi : 'transparent',
                        color: i === 1 ? COLORS.text : COLORS.textFaint,
                        border: i === 1 ? `1px solid ${COLORS.border}` : '1px solid transparent',
                      }}>{r}</button>
                  ))}
                </div>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK.weight.series} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                    <defs>
                      <linearGradient id="weight-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="d" axisLine={false} tickLine={false}
                      tick={{ fontSize: 10, fill: COLORS.textFaint, fontFamily: 'JetBrains Mono' }}
                      interval={2} />
                    <YAxis axisLine={false} tickLine={false} domain={['dataMin - 0.5', 'dataMax + 0.5']}
                      tick={{ fontSize: 10, fill: COLORS.textFaint, fontFamily: 'JetBrains Mono' }} width={36} />
                    <Tooltip
                      contentStyle={{
                        background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                        borderRadius: '8px', fontSize: '12px', fontFamily: 'JetBrains Mono',
                      }}
                      labelStyle={{ color: COLORS.textDim }}
                      itemStyle={{ color: COLORS.accent }}
                      formatter={(v) => [`${v} lb`, 'Weight']}
                    />
                    <ReferenceLine y={MOCK.weight.avg7} stroke={COLORS.textFaint} strokeDasharray="2 4" strokeOpacity={0.5}
                      label={{ value: '7d avg', fill: COLORS.textFaint, fontSize: 9, position: 'insideLeft', offset: 8, fontFamily: 'JetBrains Mono' }} />
                    <Area type="monotone" dataKey="v" stroke={COLORS.accent} strokeWidth={2}
                      fill="url(#weight-grad)" dot={false}
                      activeDot={{ r: 4, fill: COLORS.accent, stroke: COLORS.bg, strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Macros card — 4 cols */}
          <div className="col-span-12 lg:col-span-4 anim-in" style={{ animationDelay: '360ms' }}>
            <div className="rounded-3xl p-7 border h-full flex flex-col"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <div className="flex items-center justify-between mb-5">
                <SectionLabel>Macros · today</SectionLabel>
                <span className="text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider"
                  style={{ background: `${COLORS.accent}10`, color: COLORS.accent, fontFamily: 'var(--font-mono)' }}>
                  {MOCK.macros.phase} · D{MOCK.macros.phase_day}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-6xl tracking-tight leading-none"
                  style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                  {MOCK.macros.consumed.cal}
                </span>
                <span style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }} className="text-sm">
                  / {MOCK.macros.goals.cal} kcal
                </span>
              </div>
              <div className="text-xs mb-6" style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                {MOCK.macros.goals.cal - MOCK.macros.consumed.cal} kcal remaining · lunch + snacks logged
              </div>

              <div className="space-y-4 flex-1">
                <MacroBar label="Protein" consumed={MOCK.macros.consumed.protein} goal={MOCK.macros.goals.protein} color={COLORS.protein} />
                <MacroBar label="Carbs"   consumed={MOCK.macros.consumed.carbs}   goal={MOCK.macros.goals.carbs}   color={COLORS.carbs} />
                <MacroBar label="Fat"     consumed={MOCK.macros.consumed.fat}     goal={MOCK.macros.goals.fat}     color={COLORS.fat} />
              </div>

              <div className="mt-5 pt-4 border-t" style={{ borderColor: COLORS.border }}>
                <div className="flex items-end gap-1 h-12">
                  {MOCK.macrosWeek.map((d, i) => {
                    const h = (d.cal / 2000) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-sm transition-all"
                          style={{
                            height: `${h}%`,
                            background: d.today ? COLORS.accent : COLORS.border,
                            minHeight: '4px',
                          }} />
                        <span className="text-[9px]" style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>{d.d}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── COACH + BRIEF ────────────────────────────────────────────── */}
        <section className="grid grid-cols-12 gap-5">

          {/* Coach chat — 7 cols */}
          <div className="col-span-12 lg:col-span-7 anim-in" style={{ animationDelay: '420ms' }}>
            <div className="rounded-3xl p-7 border h-full flex flex-col"
              style={{ background: COLORS.surface, borderColor: COLORS.border, minHeight: '420px' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} style={{ color: COLORS.accent }} />
                  <h2 className="text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: COLORS.text, fontFamily: 'var(--font-mono)' }}>
                    Coach
                  </h2>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: `${COLORS.good}20`, color: COLORS.good, fontFamily: 'var(--font-mono)' }}>
                    Sonnet 4.6
                  </span>
                </div>
                <button className="text-[10px] uppercase tracking-wider"
                  style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                  History
                </button>
              </div>

              {/* Quick prompts */}
              <div className="flex flex-wrap gap-2 mb-5">
                {[
                  { l: "What's my next workout?", k: 'next' },
                  { l: "What should I eat now?", k: 'eat' },
                  { l: "Breakfast pick", k: 'breakfast' },
                ].map(p => (
                  <button key={p.l} onClick={() => sendCoach(p.l)}
                    className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-opacity-100"
                    style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.textDim }}>
                    {p.l}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto mb-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                      style={{
                        background: m.role === 'user' ? COLORS.accent : COLORS.surfaceHi,
                        color: m.role === 'user' ? COLORS.bg : COLORS.text,
                        border: m.role === 'coach' ? `1px solid ${COLORS.border}` : 'none',
                      }}>
                      <div className="text-sm leading-relaxed">{m.text}</div>
                      {m.role === 'coach' && (
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t" style={{ borderColor: COLORS.border }}>
                          <button className="flex items-center gap-1 text-[10px] uppercase tracking-wider"
                            style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                            <Volume2 size={10} /> Play
                          </button>
                          <button className="flex items-center gap-1 text-[10px] uppercase tracking-wider"
                            style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                            <RefreshCw size={10} /> Regenerate
                          </button>
                          <span className="text-[10px] ml-auto" style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                            {m.time}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 rounded-xl border px-4 py-3"
                style={{ background: COLORS.bg, borderColor: COLORS.border }}>
                <Search size={14} style={{ color: COLORS.textFaint }} />
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendCoach(chatInput)}
                  placeholder="Ask the coach — meal pick, restaurant, next workout…"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: COLORS.text }}
                />
                <button onClick={() => sendCoach(chatInput)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                  style={{
                    background: chatInput ? COLORS.accent : COLORS.surfaceHi,
                    color: chatInput ? COLORS.bg : COLORS.textFaint,
                  }}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Today's brief — 5 cols */}
          <div className="col-span-12 lg:col-span-5 anim-in" style={{ animationDelay: '480ms' }}>
            <div className="rounded-3xl p-7 border h-full overflow-hidden relative"
              style={{ background: COLORS.surface, borderColor: COLORS.border, minHeight: '420px' }}>
              <div className="flex items-center justify-between mb-5">
                <SectionLabel>Morning brief</SectionLabel>
                <span className="text-[10px]"
                  style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                  Generated 9:56 AM · Sonnet 4.6
                </span>
              </div>

              <div className="prose prose-invert max-w-none">
                <p className="text-base leading-relaxed mb-4" style={{ color: COLORS.text }}>
                  Last night was your <span style={{ color: COLORS.accent }}>best sleep in two weeks</span> — 79 score, 6h 50m, HRV climbing back to 33ms (balanced again). Body Battery rebuilt to 68 by morning. Readiness at 81 is your green light for Day B at 10 AM.
                </p>
                {briefExpanded && (
                  <>
                    <p className="text-base leading-relaxed mb-4" style={{ color: COLORS.textDim }}>
                      You're four days into Phase 1 and weight is responding: 200.6 this morning, down 7.1 from your cut start. Protein floor 130g — you're at 92, push the back half of the day toward chicken or whey.
                    </p>
                    <div className="space-y-2 mb-4 mt-6">
                      {[
                        { l: 'Training', v: 'Day B · 19 sets · 55–60 min · run Z2 or interval after' },
                        { l: 'Diet', v: 'Eating opens noon · 978 kcal · 38g protein remaining' },
                        { l: 'Recovery', v: 'Green light · push intensity on first lift' },
                      ].map(s => (
                        <div key={s.l} className="flex gap-3 py-2 border-t" style={{ borderColor: COLORS.border }}>
                          <span className="text-[10px] uppercase tracking-wider w-20 shrink-0 pt-0.5"
                            style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                            {s.l}
                          </span>
                          <span className="text-sm flex-1" style={{ color: COLORS.text }}>{s.v}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button onClick={() => setBriefExpanded(!briefExpanded)}
                className="flex items-center gap-1 mt-4 text-xs uppercase tracking-wider transition-colors"
                style={{ color: COLORS.accent, fontFamily: 'var(--font-mono)' }}>
                {briefExpanded ? 'Collapse' : 'Read full brief'}
                <ChevronDown size={14} className={briefExpanded ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
              </button>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─────────────────────────────────────────────────── */}
        <footer className="mt-10 pt-6 border-t flex items-center justify-between text-[10px] uppercase tracking-[0.16em]"
          style={{ borderColor: COLORS.border, color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full" style={{ background: COLORS.good }} />
              Garmin · synced 9:36 AM
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full" style={{ background: COLORS.good }} />
              MFP · synced 3:48 PM
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full" style={{ background: COLORS.good }} />
              Calendar · live
            </span>
          </div>
          <div>Phase 1 · Day 4 · Cut started May 10</div>
        </footer>
      </div>
    </div>
  );
}
