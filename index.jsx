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

import {
  getBrief, getRecovery, getMacros, getRotation, getFasting,
  getCalendar, getWeightTrend,
  logDone, logWeight, logFastStart, logFastEnd,
  streamCoachNext, streamCoachMeal, streamCoachMenu,
  streamSync,
} from './client';

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
  accent: '#C8FA3C',
  accentDim: '#8AB323',
  protein: '#FF6B6B',
  carbs: '#FFB84D',
  fat: '#7DD3FC',
  warn: '#F59E0B',
  good: '#22C55E',
  low: '#EF4444',
};

// ─── HELPERS ────────────────────────────────────────────────────────────
const pct = (a, b) => Math.min(100, Math.round((a / b) * 100));
const fmtEventTime = (iso, allDay) => {
  if (allDay) return 'all-day';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

// ─── COMPONENTS ─────────────────────────────────────────────────────────
const Ring = ({ value, max = 100, size = 200, stroke = 12, color, children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(value, max) / max) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke={COLORS.border} strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
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
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
        fill={`url(#spark-${color})`} dot={false} isAnimationActive={true} />
    </AreaChart>
  </ResponsiveContainer>
);

const Stat = ({ icon: Icon, label, value, unit, avg, trend, sparkData, color = COLORS.accent }) => (
  <div className="group relative overflow-hidden rounded-2xl border p-5 transition-all"
    style={{ background: COLORS.surface, borderColor: COLORS.border }}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: COLORS.textDim }} />
        <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>
          {label}
        </span>
      </div>
      {trend != null && (
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
        {value ?? '—'}
      </span>
      {unit && (
        <span className="text-xs" style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>{unit}</span>
      )}
    </div>
    {avg && (
      <div className="text-[10px] mb-3" style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
        7-DAY AVG · {avg}
      </div>
    )}
    {sparkData && sparkData.length > 0 && (
      <div className="mt-2 -mx-1"><Sparkline data={sparkData} color={color} /></div>
    )}
  </div>
);

const MacroBar = ({ label, consumed = 0, goal = 1, color }) => {
  const p = pct(consumed, goal);
  const remaining = Math.max(0, goal - consumed);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em]"
            style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>{label}</span>
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

const QuickAction = ({ icon: Icon, label, sub, onClick, accent, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="group relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
    style={{ background: COLORS.surface, borderColor: COLORS.border, color: COLORS.text }}>
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
      style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>{children}</h2>
    {right}
  </div>
);

// ─── MAIN APP ──────────────────────────────────────────────────────────
export default function FitnessDashboard() {
  const [now, setNow] = useState(new Date());
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [syncing, setSyncing] = useState(false);

  // ─── API state ────────────────────────────────────────────────────────
  const [recovery,  setRecovery]  = useState(null);
  const [macros,    setMacros]    = useState(null);
  const [rotation,  setRotation]  = useState(null);
  const [fasting,   setFasting]   = useState(null);
  const [calendar,  setCalendar]  = useState(null);
  const [weight,    setWeight]    = useState(null);
  const [brief,     setBrief]     = useState(null);

  const [messages, setMessages] = useState([]);
  const [coachStreaming, setCoachStreaming] = useState(false);
  const coachCancelRef = useRef(null);

  // ─── Load all data on mount + every 5 min ────────────────────────────
  const refresh = () => {
    getRecovery().then(setRecovery).catch(console.error);
    getMacros().then(setMacros).catch(console.error);
    getRotation().then(setRotation).catch(console.error);
    getFasting().then(setFasting).catch(console.error);
    getCalendar().then(setCalendar).catch(console.error);
    getWeightTrend(30).then(setWeight).catch(console.error);
    getBrief().then(setBrief).catch(console.error);
  };

  useEffect(() => {
    refresh();
    const t = setInterval(() => setNow(new Date()), 60000);
    const r = setInterval(refresh, 5 * 60 * 1000);
    return () => { clearInterval(t); clearInterval(r); };
  }, []);

  // ─── Action handlers ─────────────────────────────────────────────────
  const handleSync = () => {
    setSyncing(true);
    streamSync(
      ['garmin', 'mfp'],
      () => {},
      () => { setSyncing(false); refresh(); }
    );
  };

  const handleDone = () => {
    const day = rotation?.next_session?.day ?? 'A';
    logDone(day).then(() => getRotation().then(setRotation));
  };

  const handleLogWeight = () => {
    const w = prompt('Weight in lb:');
    if (w) logWeight(parseFloat(w)).then(() => getWeightTrend(30).then(setWeight));
  };

  const handleFastStart = () => logFastStart().then(() => getFasting().then(setFasting));
  const handleFastEnd   = () => logFastEnd().then(() => getFasting().then(setFasting));

  // ─── Coach chat with streaming ────────────────────────────────────────
  const sendCoach = (prompt) => {
    if (!prompt.trim() || coachStreaming) return;
    const ts = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setMessages(m => [...m, { role: 'user', text: prompt, time: ts }]);
    setChatInput('');

    // Pick the right endpoint based on prompt content
    const lower = prompt.toLowerCase();
    const placeMatch = lower.match(/at\s+(\w[\w\s]*)/);

    setMessages(m => [...m, { role: 'coach', text: '', time: ts, streaming: true }]);
    setCoachStreaming(true);

    const onChunk = (delta) => {
      setMessages(m => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last.role === 'coach') last.text += delta;
        return copy;
      });
    };
    const onDone = (final) => {
      setMessages(m => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last.role === 'coach') {
          last.streaming = false;
          if (final.spoken_summary) last.text = final.spoken_summary;
        }
        return copy;
      });
      setCoachStreaming(false);
    };

    if (lower.includes('next') || lower.includes('workout')) {
      coachCancelRef.current = streamCoachNext(onChunk, onDone);
    } else if (placeMatch) {
      coachCancelRef.current = streamCoachMenu(placeMatch[1].trim(), onChunk, onDone);
    } else {
      const slot = lower.includes('breakfast') ? 'breakfast'
                 : lower.includes('dinner')    ? 'dinner'
                 : 'lunch';
      coachCancelRef.current = streamCoachMeal(slot, prompt, onChunk, onDone);
    }
  };

  // ─── Derived values from API data ────────────────────────────────────
  const readiness   = recovery?.training_readiness?.score;
  const readinessLvl = recovery?.training_readiness?.level;
  const sleepScore  = recovery?.sleep?.score;
  const sleepAvg    = recovery?.sleep?.seven_day_avg_score;
  const hrvMs       = recovery?.hrv?.overnight_avg_ms;
  const hrvAvg      = recovery?.hrv?.seven_day_avg;
  const hrvStatus   = recovery?.hrv?.status;
  const rhrBpm      = recovery?.resting_hr?.today;
  const rhrAvg      = recovery?.resting_hr?.seven_day_avg;
  const batteryStart = recovery?.body_battery?.start;
  const batteryEnd   = recovery?.body_battery?.end;
  const batteryHigh  = recovery?.body_battery?.high;
  const batteryLow   = recovery?.body_battery?.low;
  const stressAvg    = recovery?.stress?.avg;
  const steps        = recovery?.steps;

  const macrosConsumed = macros?.consumed ?? {};
  const macrosGoals    = macros?.goals ?? {};
  const macroCalRem    = (macrosGoals.calories ?? 0) - (macrosConsumed.calories ?? 0);

  const todayDay      = rotation?.next_session?.day ?? rotation?.today_day;
  const todayTitle    = rotation?.next_session?.title ?? '—';
  const todayTime     = rotation?.next_session?.scheduled_time;
  const todayLocation = calendar?.events?.find(e => e.title?.includes('Workout'))?.location;
  const todaySets     = rotation?.next_session?.total_working_sets;
  const todayDuration = rotation?.next_session?.duration_estimate_minutes;
  const firstLiftName = rotation?.next_session?.first_lift?.name;
  const firstLiftWt   = rotation?.next_session?.first_lift?.top_working_weight_lb;

  const weightCurrent = weight?.points?.[weight.points.length - 1]?.weight_lb;
  const weightStart   = weight?.summary?.earliest_lb;
  const weightDelta   = weight?.summary?.delta_lb;
  const weightAvg7    = weight?.summary?.rolling_7day_avg_lb;
  const weightSeries  = weight?.points?.map(p => ({ d: p.date?.slice(5) ?? '', v: p.weight_lb })) ?? [];

  const fastingMinsUntilOpen = fasting?.minutes_until_open ?? 0;
  const fastingHours = Math.floor(fastingMinsUntilOpen / 60);
  const fastingMins  = fastingMinsUntilOpen % 60;
  const inWindow = fasting?.in_window;

  const events = (calendar?.events ?? []).map(e => ({
    t: fmtEventTime(e.start, e.all_day),
    title: e.title,
    cal: e.calendar,
    isWorkout: e.title?.toLowerCase().includes('workout'),
  }));

  return (
    <div className="min-h-screen w-full" style={{
      background: COLORS.bg,
      color: COLORS.text,
      fontFamily: 'var(--font-sans)',
      backgroundImage: 'radial-gradient(ellipse at top, #15171C 0%, #0A0B0D 60%)',
    }}>
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
        @keyframes cursor-blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
        .cursor-blink { animation: cursor-blink 1s infinite; }
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
                <span style={{ fontStyle: 'italic', color: COLORS.accent }}>
                  {now.toLocaleDateString('en-US', { month: 'long' })}
                </span> {now.getDate()}
                <span style={{ color: COLORS.textFaint, marginLeft: '0.5rem' }}>·</span>
                <span style={{ color: COLORS.textDim, marginLeft: '0.5rem' }}>{now.getFullYear()}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSync}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
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

          {/* Today's plan */}
          <div className="col-span-12 lg:col-span-5 anim-in" style={{ animationDelay: '60ms' }}>
            <div className="relative grain overflow-hidden rounded-3xl p-7 h-full border"
              style={{ background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.surfaceHi} 100%)`, borderColor: COLORS.border }}>
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: COLORS.accent }} />
                <span className="text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: COLORS.accent, fontFamily: 'var(--font-mono)' }}>Today</span>
              </div>

              <div className="mb-7">
                <div className="text-[11px] uppercase tracking-[0.16em] mb-2"
                  style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>
                  Training · Day {todayDay ?? '—'}
                </div>
                <h2 className="text-5xl leading-[0.95] mb-3 tracking-tight"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>
                  {todayTitle.split('+')[0]?.trim() || 'Loading'}
                  {todayTitle.includes('+') && <span style={{ fontStyle: 'italic', color: COLORS.textDim }}> & {todayTitle.split('+')[1]?.trim()}</span>}
                </h2>
                <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5 text-sm" style={{ color: COLORS.textDim }}>
                  {todayTime && <span className="flex items-center gap-1.5"><Clock size={12} /> {todayTime}</span>}
                  {todayLocation && <span className="flex items-center gap-1.5"><MapPin size={12} /> {todayLocation}</span>}
                  {todaySets && <span className="flex items-center gap-1.5"><Dumbbell size={12} /> {todaySets} sets · {todayDuration?.join('–')} min</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl p-4 border" style={{ background: COLORS.bg, borderColor: COLORS.border }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>First lift</div>
                  <div className="text-sm leading-tight" style={{ color: COLORS.text }}>
                    {firstLiftName ?? '—'}
                  </div>
                  <div className="text-2xl mt-1"
                    style={{ fontFamily: 'var(--font-display)', color: COLORS.accent, fontVariantNumeric: 'tabular-nums' }}>
                    {firstLiftWt ?? '—'} <span className="text-xs" style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>lb</span>
                  </div>
                </div>
                <div className="rounded-xl p-4 border" style={{ background: COLORS.bg, borderColor: COLORS.border }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                    {inWindow ? 'Eating window' : 'Fast ends in'}
                  </div>
                  <div className="text-sm leading-tight" style={{ color: COLORS.text }}>
                    {inWindow ? 'Open now' : `Opens at ${fasting?.next_window_open?.slice(11, 16) ?? 'noon'}`}
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
                  style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>Schedule</div>
                {events.length === 0 ? (
                  <div className="text-xs" style={{ color: COLORS.textFaint }}>No events</div>
                ) : events.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg"
                    style={{
                      background: e.isWorkout ? `${COLORS.accent}0a` : 'transparent',
                      border: e.isWorkout ? `1px solid ${COLORS.accent}25` : '1px solid transparent',
                    }}>
                    <span className="text-[10px] w-16 shrink-0"
                      style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>{e.t}</span>
                    <span className="text-sm flex-1 truncate"
                      style={{ color: e.isWorkout ? COLORS.accent : COLORS.text }}>{e.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recovery ring */}
          <div className="col-span-12 lg:col-span-4 anim-in" style={{ animationDelay: '120ms' }}>
            <div className="relative h-full rounded-3xl p-7 border flex flex-col items-center"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <SectionLabel>Recovery</SectionLabel>

              <div className="flex-1 flex flex-col items-center justify-center my-2">
                <Ring value={readiness ?? 0} size={240} stroke={14} color={COLORS.accent}>
                  <div className="text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }}>Readiness</div>
                  <div className="text-7xl leading-none my-1"
                    style={{ fontFamily: 'var(--font-display)', color: COLORS.text, fontVariantNumeric: 'tabular-nums' }}>
                    {readiness ?? '—'}
                  </div>
                  <div className="text-xs uppercase tracking-[0.15em] flex items-center gap-1.5"
                    style={{ color: COLORS.accent, fontFamily: 'var(--font-mono)' }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: COLORS.accent }} />
                    {readinessLvl ?? '—'}
                  </div>
                </Ring>
              </div>

              <div className="grid grid-cols-3 gap-1 w-full pt-4 border-t" style={{ borderColor: COLORS.border }}>
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-wider mb-1"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>Battery</div>
                  <div className="text-base" style={{ fontFamily: 'var(--font-display)', color: COLORS.text }}>
                    {batteryStart ?? '—'}→{batteryEnd ?? '—'}
                  </div>
                </div>
                <div className="text-center border-l border-r" style={{ borderColor: COLORS.border }}>
                  <div className="text-[9px] uppercase tracking-wider mb-1"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>Stress</div>
                  <div className="text-base" style={{ fontFamily: 'var(--font-display)', color: COLORS.text }}>
                    {stressAvg ?? '—'}<span className="text-[10px]" style={{ color: COLORS.textFaint }}>/100</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-wider mb-1"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>Steps</div>
                  <div className="text-base" style={{ fontFamily: 'var(--font-display)', color: COLORS.text }}>
                    {steps != null ? (steps > 999 ? `${(steps / 1000).toFixed(1)}k` : steps) : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="col-span-12 lg:col-span-3 anim-in" style={{ animationDelay: '180ms' }}>
            <div className="rounded-3xl p-6 border h-full flex flex-col"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <SectionLabel>Quick log</SectionLabel>
              <div className="flex flex-col gap-2 flex-1">
                <QuickAction icon={Check} label={`Done · Day ${todayDay ?? '—'}`} sub="Mark complete" accent onClick={handleDone} />
                <QuickAction icon={Plus} label="Log weight" sub="Manual override" onClick={handleLogWeight} />
                <QuickAction icon={Timer} label="Start fast" sub="Stamp now" onClick={handleFastStart} />
                <QuickAction icon={Flame} label="End fast" sub="Window opens" onClick={handleFastEnd} />
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: COLORS.border }}>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em]"
                    style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>Last session</div>
                  <div className="text-sm mt-0.5">
                    {rotation?.last_session
                      ? `Day ${rotation.last_session.day} · ${new Date(rotation.last_session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : '—'}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: COLORS.textDim }} />
              </div>
            </div>
          </div>
        </section>

        {/* ─── RECOVERY METRIC ROW ──────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 anim-in" style={{ animationDelay: '240ms' }}>
          <Stat icon={Moon} label="Sleep" value={sleepScore} unit="score"
            avg={sleepAvg} color={COLORS.accent} />
          <Stat icon={Activity} label="HRV" value={hrvMs} unit="ms"
            avg={hrvAvg ? `${hrvAvg} · ${hrvStatus}` : null} color={COLORS.accent} />
          <Stat icon={Heart} label="Resting HR" value={rhrBpm} unit="bpm"
            avg={rhrAvg} color={COLORS.fat} />
          <Stat icon={Battery} label="Body Battery" value={batteryHigh} unit="peak"
            avg={batteryLow ? `low ${batteryLow}` : null} color={COLORS.accent} />
        </section>

        {/* ─── WEIGHT TREND + MACROS ────────────────────────────────────── */}
        <section className="grid grid-cols-12 gap-5 mb-5">

          {/* Weight trend */}
          <div className="col-span-12 lg:col-span-8 anim-in" style={{ animationDelay: '300ms' }}>
            <div className="rounded-3xl p-7 border" style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <SectionLabel>Weight · 30 days</SectionLabel>
                  <div className="flex items-baseline gap-4">
                    <div className="text-6xl tracking-tight leading-none"
                      style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                      {weightCurrent ?? '—'}
                      <span className="text-2xl ml-1" style={{ color: COLORS.textDim }}>lb</span>
                    </div>
                    {weightDelta != null && (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-md"
                          style={{ background: `${weightDelta < 0 ? COLORS.good : COLORS.warn}15`,
                                   color: weightDelta < 0 ? COLORS.good : COLORS.warn,
                                   fontFamily: 'var(--font-mono)' }}>
                          {weightDelta < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />} {weightDelta} lb
                        </span>
                        <span className="text-[10px] uppercase tracking-wider"
                          style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                          From {weightStart} · 30d
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightSeries} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                    <defs>
                      <linearGradient id="weight-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="d" axisLine={false} tickLine={false}
                      tick={{ fontSize: 10, fill: COLORS.textFaint, fontFamily: 'JetBrains Mono' }} interval={2} />
                    <YAxis axisLine={false} tickLine={false} domain={['dataMin - 0.5', 'dataMax + 0.5']}
                      tick={{ fontSize: 10, fill: COLORS.textFaint, fontFamily: 'JetBrains Mono' }} width={36} />
                    <Tooltip contentStyle={{
                      background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px', fontSize: '12px', fontFamily: 'JetBrains Mono',
                    }} labelStyle={{ color: COLORS.textDim }} itemStyle={{ color: COLORS.accent }}
                      formatter={(v) => [`${v} lb`, 'Weight']} />
                    {weightAvg7 && (
                      <ReferenceLine y={weightAvg7} stroke={COLORS.textFaint} strokeDasharray="2 4" strokeOpacity={0.5}
                        label={{ value: '7d avg', fill: COLORS.textFaint, fontSize: 9, position: 'insideLeft', offset: 8, fontFamily: 'JetBrains Mono' }} />
                    )}
                    <Area type="monotone" dataKey="v" stroke={COLORS.accent} strokeWidth={2}
                      fill="url(#weight-grad)" dot={false}
                      activeDot={{ r: 4, fill: COLORS.accent, stroke: COLORS.bg, strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Macros card */}
          <div className="col-span-12 lg:col-span-4 anim-in" style={{ animationDelay: '360ms' }}>
            <div className="rounded-3xl p-7 border h-full flex flex-col"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <div className="flex items-center justify-between mb-5">
                <SectionLabel>Macros · today</SectionLabel>
                {macros?.phase && (
                  <span className="text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider"
                    style={{ background: `${COLORS.accent}10`, color: COLORS.accent, fontFamily: 'var(--font-mono)' }}>
                    {macros.phase.name} · D{macros.phase.day}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-6xl tracking-tight leading-none"
                  style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                  {macrosConsumed.calories ?? '—'}
                </span>
                <span style={{ color: COLORS.textDim, fontFamily: 'var(--font-mono)' }} className="text-sm">
                  / {macrosGoals.calories ?? '—'} kcal
                </span>
              </div>
              <div className="text-xs mb-6" style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                {macroCalRem > 0 ? `${macroCalRem} kcal remaining` : '—'}
              </div>

              <div className="space-y-4 flex-1">
                <MacroBar label="Protein" consumed={macrosConsumed.protein ?? 0} goal={macrosGoals.protein ?? 130} color={COLORS.protein} />
                <MacroBar label="Carbs"   consumed={macrosConsumed.carbs ?? 0}   goal={macrosGoals.carbs ?? 160}   color={COLORS.carbs} />
                <MacroBar label="Fat"     consumed={macrosConsumed.fat ?? 0}     goal={macrosGoals.fat ?? 62}      color={COLORS.fat} />
              </div>
            </div>
          </div>
        </section>

        {/* ─── COACH + BRIEF ────────────────────────────────────────────── */}
        <section className="grid grid-cols-12 gap-5">

          {/* Coach chat */}
          <div className="col-span-12 lg:col-span-7 anim-in" style={{ animationDelay: '420ms' }}>
            <div className="rounded-3xl p-7 border h-full flex flex-col"
              style={{ background: COLORS.surface, borderColor: COLORS.border, minHeight: '420px' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} style={{ color: COLORS.accent }} />
                  <h2 className="text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: COLORS.text, fontFamily: 'var(--font-mono)' }}>Coach</h2>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: `${COLORS.good}20`, color: COLORS.good, fontFamily: 'var(--font-mono)' }}>
                    Sonnet 4.6
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {[
                  { l: "What's my next workout?" },
                  { l: "What should I eat now?" },
                  { l: "Breakfast pick" },
                ].map(p => (
                  <button key={p.l} onClick={() => sendCoach(p.l)} disabled={coachStreaming}
                    className="text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50"
                    style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.textDim }}>
                    {p.l}
                  </button>
                ))}
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto mb-4 max-h-[300px]">
                {messages.length === 0 && (
                  <div className="text-sm text-center py-8" style={{ color: COLORS.textFaint }}>
                    Ask the coach anything — workout, meal, restaurant.
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                      style={{
                        background: m.role === 'user' ? COLORS.accent : COLORS.surfaceHi,
                        color: m.role === 'user' ? COLORS.bg : COLORS.text,
                        border: m.role === 'coach' ? `1px solid ${COLORS.border}` : 'none',
                      }}>
                      <div className="text-sm leading-relaxed">
                        {m.text}
                        {m.streaming && <span className="cursor-blink ml-0.5">▍</span>}
                      </div>
                      {m.role === 'coach' && !m.streaming && (
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t" style={{ borderColor: COLORS.border }}>
                          <span className="text-[10px] ml-auto" style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                            {m.time}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-xl border px-4 py-3"
                style={{ background: COLORS.bg, borderColor: COLORS.border }}>
                <Search size={14} style={{ color: COLORS.textFaint }} />
                <input type="text" value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendCoach(chatInput)}
                  disabled={coachStreaming}
                  placeholder="Ask the coach — meal pick, restaurant, next workout…"
                  className="flex-1 bg-transparent outline-none text-sm disabled:opacity-50"
                  style={{ color: COLORS.text }} />
                <button onClick={() => sendCoach(chatInput)} disabled={coachStreaming || !chatInput}
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    background: chatInput ? COLORS.accent : COLORS.surfaceHi,
                    color: chatInput ? COLORS.bg : COLORS.textFaint,
                  }}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Brief */}
          <div className="col-span-12 lg:col-span-5 anim-in" style={{ animationDelay: '480ms' }}>
            <div className="rounded-3xl p-7 border h-full overflow-hidden relative"
              style={{ background: COLORS.surface, borderColor: COLORS.border, minHeight: '420px' }}>
              <div className="flex items-center justify-between mb-5">
                <SectionLabel>Morning brief</SectionLabel>
                {brief?.generated_at && (
                  <span className="text-[10px]" style={{ color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
                    Generated {new Date(brief.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="prose prose-invert max-w-none">
                {brief?.vault_markdown ? (
                  <div className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.text }}>
                    {briefExpanded
                      ? brief.vault_markdown
                      : brief.vault_markdown.split('\n').slice(0, 4).join('\n')}
                  </div>
                ) : (
                  <div className="text-sm" style={{ color: COLORS.textFaint }}>Loading brief…</div>
                )}
              </div>

              {brief?.vault_markdown && (
                <button onClick={() => setBriefExpanded(!briefExpanded)}
                  className="flex items-center gap-1 mt-4 text-xs uppercase tracking-wider transition-colors"
                  style={{ color: COLORS.accent, fontFamily: 'var(--font-mono)' }}>
                  {briefExpanded ? 'Collapse' : 'Read full brief'}
                  <ChevronDown size={14} className={briefExpanded ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─────────────────────────────────────────────────── */}
        <footer className="mt-10 pt-6 border-t flex items-center justify-between text-[10px] uppercase tracking-[0.16em]"
          style={{ borderColor: COLORS.border, color: COLORS.textFaint, fontFamily: 'var(--font-mono)' }}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full" style={{ background: recovery ? COLORS.good : COLORS.textFaint }} />
              Garmin · {recovery?.fetched_at ? new Date(recovery.fetched_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full" style={{ background: macros ? COLORS.good : COLORS.textFaint }} />
              MFP · {macros?.fetched_at ? new Date(macros.fetched_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full" style={{ background: calendar ? COLORS.good : COLORS.textFaint }} />
              Calendar · live
            </span>
          </div>
          {macros?.phase && (
            <div>{macros.phase.name} · Day {macros.phase.day} · Cut started {macros.phase.cut_start}</div>
          )}
        </footer>
      </div>
    </div>
  );
}
