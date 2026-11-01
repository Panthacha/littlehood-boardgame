import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { SparkleBurst, Trail } from '../../theme/Forest';
import { seededShuffle } from '../../utils/shuffle';

// Shared building blocks for the Part screens, drawn as a parchment page
// (theme/forest.css). Each Part is a stepper whose answers are saved per house to
// Supabase via savePartProgress, so a refresh/reconnect resumes where the
// team left off, and later Parts can read earlier Parts' answers.

export type SavedParts = Record<number, { step: number; data: Record<string, any>; completedAt: string | null }>;

// Colors for content on parchment
export const GOLD = '#8A5A1E';   // accent / labels
export const CREAM = '#2B1D12';  // ink

export function usePartProgress<T extends Record<string, any>>(houseId: number, partNumber: number, empty: T, lastStep: number) {
  const { socket } = useSocket();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<T>(empty);
  const [allParts, setAllParts] = useState<SavedParts>({});
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(0);

  useEffect(() => {
    if (!socket || !houseId) return;
    socket.emit('getPartProgress', { houseId }, (res: any) => {
      const parts: SavedParts = res?.parts || {};
      setAllParts(parts);
      const saved = parts[partNumber];
      if (saved) {
        // clamp: a Part may have lost steps since this progress was saved
        stepRef.current = Math.min(saved.step ?? 0, lastStep);
        setStep(stepRef.current);
        setData({ ...empty, ...(saved.data || {}) });
        // landed on the end page without having been marked done (step removed) — mark it now
        if (stepRef.current >= lastStep && !saved.completedAt) {
          socket.emit('savePartProgress', { houseId, partNumber, step: lastStep, data: saved.data || {}, completed: true }, () => {});
        }
      }
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, houseId, partNumber]);

  const save = (nextStep: number, nextData: T) => {
    if (!socket || !houseId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      socket.emit('savePartProgress', { houseId, partNumber, step: nextStep, data: nextData, completed: nextStep >= lastStep }, () => {});
    }, 400);
  };

  // Accepts a patch or a function of the latest data, so quick successive
  // taps (chips, checklist) never overwrite each other with stale state.
  const update = (patch: Partial<T> | ((prev: T) => Partial<T>)) => {
    setData((prev) => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      save(stepRef.current, next);
      return next;
    });
  };

  const goStep = (n: number) => {
    stepRef.current = n;
    setStep(n);
    save(n, data);
  };

  return { loaded, step, data, update, goStep, allParts };
}

export const PartShell: React.FC<{
  part: number; title: string; step: number; totalSteps: number;
  canAdvance: boolean; nextLabel: string; onBack: () => void; onNext: () => void; children: React.ReactNode;
}> = ({ part, title, step, totalSteps, canAdvance, nextLabel, onBack, onNext, children }) => (
  <div style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '120px', textAlign: 'left' }}>
    {/* key={step}: each step turns in like a new page */}
    <div key={step} className="lh-parchment lh-flip" style={{ padding: '24px 20px 26px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <div className="lh-kicker">พาร์ท {part} · ด่าน {Math.min(step + 1, totalSteps)} / {totalSteps}</div>
          <h2 className="lh-display" style={{ margin: '4px 0 0', fontSize: '24px', lineHeight: 1.3 }}>{title}</h2>
        </div>
        <span className="lh-seal" aria-hidden="true" style={{ width: '48px', height: '48px', fontSize: '18px', flexShrink: 0 }}>{['I', 'II', 'III', 'IV', 'V'][part - 1]}</span>
      </div>
      <Trail steps={totalSteps} current={step} />
      {children}
    </div>
    {step < totalSteps - 1 && (
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: 'linear-gradient(0deg, rgba(6,12,8,0.95) 55%, rgba(6,12,8,0))', padding: '18px 16px 20px', zIndex: 20 }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', gap: '10px' }}>
          {step > 0 && <button className="lh-sign lh-sign--quiet" onClick={onBack}>ย้อนกลับ</button>}
          <button className="lh-sign" onClick={() => canAdvance && onNext()} disabled={!canAdvance} style={{ flex: 1 }}>
            {nextLabel}{canAdvance ? ' →' : ''}
          </button>
        </div>
      </div>
    )}
  </div>
);

export const Section: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {title && <h3 className="lh-display" style={{ margin: 0, fontSize: '19px', lineHeight: 1.35 }}>{title}</h3>}
    {children}
  </div>
);

export const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: 0, fontSize: '15px', color: 'var(--lh-ink-soft)', lineHeight: 1.7 }}>{children}</p>
);

export const Box: React.FC<{ children: React.ReactNode; highlight?: boolean }> = ({ children, highlight }) => (
  <div style={{
    background: highlight ? 'rgba(168,35,58,0.08)' : 'rgba(122,85,48,0.1)',
    border: `1px dashed ${highlight ? 'rgba(168,35,58,0.45)' : 'rgba(122,85,48,0.45)'}`,
    borderRadius: '8px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '15px', lineHeight: 1.7
  }}>{children}</div>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: '14px', fontWeight: 'bold', color: GOLD }}>{children}</div>
);

export interface QuizDef { question: string; options: { id: string; text: string; correct: boolean }[] }

export const isQuizCorrect = (quiz: QuizDef, picked?: string | null) =>
  !!picked && !!quiz.options.find((o) => o.id === picked)?.correct;

// `seed` (e.g. the house id) shuffles the choices so the right answer isn't
// always in the same slot; combined with the game id, each house gets its own order.
export const Quiz: React.FC<{ quiz: QuizDef; picked: string | null; onPick: (id: string) => void; seed?: string }> = ({ quiz, picked, onPick, seed }) => {
  const { session } = useSocket();
  // Only celebrate a pick made on this screen, not one restored from saved progress.
  const [fresh, setFresh] = useState(false);
  const right = isQuizCorrect(quiz, picked);
  const options = seed ? seededShuffle(quiz.options, `${session?.id || ''}:${seed}:${quiz.question}`) : quiz.options;
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '15px', fontWeight: 'bold' }}>เช็กความเข้าใจ: {quiz.question}</div>
      {options.map((o, i) => {
        const cls = picked ? (o.correct ? 'is-right' : picked === o.id ? 'is-wrong' : '') : '';
        return (
          <div key={o.id} style={{ position: 'relative' }}>
            <button className={`lh-strip ${cls}`} disabled={!!picked} onClick={() => { setFresh(true); onPick(o.id); }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: picked ? 'default' : 'pointer', opacity: 1, filter: 'none' }}>
              <span aria-hidden="true" style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid #7A5530', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '12px', fontWeight: 700, color: '#7A5530', flexShrink: 0 }}>{'ABC'[i]}</span>
              <span>{o.text}</span>
            </button>
            {fresh && right && o.correct && <SparkleBurst style={{ right: '34px', top: '26px' }} />}
          </div>
        );
      })}
      {picked && (right ? (
        <div className="lh-stamp lh-display" style={{ alignSelf: 'flex-end', marginTop: '4px', padding: '4px 14px', border: '3px double #2F6B3A', borderRadius: '8px', color: '#2F6B3A', fontSize: '20px' }}>ถูกต้อง!</div>
      ) : (
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--lh-hood)' }}>ยังไม่ใช่ — คำตอบที่ถูกคือแถบสีทอง</div>
      ))}
    </div>
  );
};

export const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }> =
  ({ label, value, onChange, placeholder, multiline }) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '14px', fontWeight: 'bold', color: GOLD }}>{label}</span>
      {multiline ? (
        <textarea className="lh-input" rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className="lh-input" type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  );

export const toggleIn = (list: string[], item: string) => list.includes(item) ? list.filter((v) => v !== item) : [...list, item];

// Multi-select chips
export const Chips: React.FC<{ label: string; options: string[]; value: string[]; onToggle: (option: string) => void }> = ({ label, options, value, onToggle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <Label>{label}</Label>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} aria-pressed={on} onClick={() => onToggle(o)} className={`lh-strip ${on ? 'is-on' : ''}`}
            style={{ width: 'auto', minHeight: '42px', padding: '0 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 'bold' }}>
            {on ? '✓ ' : ''}{o}
          </button>
        );
      })}
    </div>
  </div>
);

// Single-select pills
export const Pills: React.FC<{ label: string; options: { id: string; label: string }[]; value: string | null; onChange: (v: string) => void }> = ({ label, options, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <Label>{label}</Label>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} aria-pressed={on} onClick={() => onChange(o.id)} className={`lh-strip ${on ? 'is-on' : ''}`}
            style={{ flex: '1 1 130px', width: 'auto', textAlign: 'center', fontWeight: 'bold' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  </div>
);

export const labelOf = (options: { id: string; label: string }[], id?: string | null) => options.find((o) => o.id === id)?.label || '—';

// Countdown for the paper-card activities. Kept local (not saved): it's only a
// pacing aid for the team, and the teacher controls the real pace.
export const CountdownTimer: React.FC<{ seconds: number; doneText: string }> = ({ seconds, doneText }) => {
  const [left, setLeft] = useState(seconds);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  useEffect(() => {
    if (status !== 'running') return;
    const t = setInterval(() => setLeft((s) => {
      if (s <= 1) { setStatus('done'); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [status]);
  const pct = Math.round((left / seconds) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '22px 16px', borderRadius: '10px', background: 'rgba(122,85,48,0.12)', border: '1px dashed rgba(122,85,48,0.45)' }}>
      {/* hourglass-style ring */}
      <div style={{ position: 'relative', width: '150px', height: '150px', borderRadius: '50%', background: `conic-gradient(${status === 'done' ? 'var(--lh-hood)' : '#8A5A1E'} ${pct * 3.6}deg, rgba(122,85,48,0.18) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 1s linear' }}>
        <div style={{ width: '122px', height: '122px', borderRadius: '50%', background: 'var(--lh-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 8px rgba(90,55,25,0.3)' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '34px', fontWeight: 700, color: status === 'done' ? 'var(--lh-hood)' : 'var(--lh-ink)' }}>{fmt(left)}</span>
        </div>
      </div>
      {status === 'idle' && <button className="lh-sign" onClick={() => setStatus('running')}>เริ่มจับเวลา ({Math.round(seconds / 60)} นาที)</button>}
      {status === 'running' && <p className="lh-breathe" style={{ margin: 0, fontSize: '14px', color: 'var(--lh-ink-soft)' }}>เม็ดทรายกำลังไหล…</p>}
      {status === 'done' && <p className="lh-pop" style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--lh-hood)', textAlign: 'center' }}>{doneText}</p>}
    </div>
  );
};

export const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

export const SummaryCard: React.FC<{ rows: [string, React.ReactNode][] }> = ({ rows }) => (
  <div style={{ width: '100%', background: 'rgba(255,250,238,0.5)', border: '1px solid rgba(122,85,48,0.35)', borderRadius: '8px', padding: '6px 16px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
    {rows.map(([k, v], i) => (
      <div key={k} style={{ padding: '10px 0', borderTop: i ? '1px dashed rgba(122,85,48,0.35)' : 'none' }}>
        <div style={{ fontSize: '12px', color: GOLD, fontWeight: 'bold', letterSpacing: '0.04em' }}>{k}</div>
        <div style={{ fontSize: '15px', lineHeight: 1.6 }}>{v || '—'}</div>
      </div>
    ))}
  </div>
);

export const DoneScreen: React.FC<{ title: string; subtitle: string; children?: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center', padding: '6px 0' }}>
    <span className="lh-seal lh-stamp lh-display" aria-hidden="true" style={{ width: '88px', height: '88px', fontFamily: 'var(--lh-display)', fontSize: '17px', fontWeight: 400 }}>สำเร็จ</span>
    <h3 className="lh-display" style={{ margin: 0, fontSize: '21px' }}>{title}</h3>
    <p style={{ margin: 0, fontSize: '14px', color: 'var(--lh-ink-soft)', lineHeight: 1.6 }}>{subtitle}</p>
    {children}
  </div>
);

export const Loading = () => <div className="lh-display lh-breathe" style={{ color: 'var(--lh-gold-bright)', textAlign: 'center', padding: '40px' }}>กำลังเปิดหน้ากระดาษ…</div>;
