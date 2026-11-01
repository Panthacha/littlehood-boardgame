import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';

// Shared building blocks for Parts 2-5 (Part 1 predates this and keeps its
// own copy). Each Part is a stepper whose answers are saved per house to
// Supabase via savePartProgress, so a refresh/reconnect resumes where the
// team left off, and later Parts can read earlier Parts' answers.

export type SavedParts = Record<number, { step: number; data: Record<string, any>; completedAt: string | null }>;

export const GOLD = '#D9AE6E';
export const CREAM = '#F6E8CD';
const inputStyle: React.CSSProperties = {
  minHeight: '48px', padding: '0 16px', borderRadius: '12px', border: '1px solid rgba(217,174,110,0.35)',
  background: 'rgba(0,0,0,0.3)', color: CREAM, fontSize: '15px', fontFamily: 'inherit'
};

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
        stepRef.current = saved.step ?? 0;
        setStep(stepRef.current);
        setData({ ...empty, ...(saved.data || {}) });
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
  <div style={{ width: '100%', maxWidth: '640px', color: CREAM, display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '110px', textAlign: 'left' }}>
    <div>
      <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: GOLD, fontWeight: 'bold', marginBottom: '6px' }}>พาร์ท {part}</div>
      <h2 style={{ margin: '0 0 12px', fontFamily: "'Cinzel', serif", fontSize: '22px' }}>{title}</h2>
      <div style={{ display: 'flex', gap: '6px' }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} style={{ flex: 1, height: '6px', borderRadius: '999px', background: i <= step ? GOLD : 'rgba(217,174,110,0.2)' }} />
        ))}
      </div>
    </div>
    {children}
    {step < totalSteps - 1 && (
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: 'linear-gradient(0deg, #0A120B 60%, rgba(10,18,11,0))', padding: '16px 20px 20px', zIndex: 20 }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', gap: '10px' }}>
          {step > 0 && (
            <button onClick={onBack} style={{ minHeight: '48px', padding: '0 20px', borderRadius: '12px', border: '1px solid rgba(246,232,205,0.3)', background: 'rgba(0,0,0,0.3)', color: 'rgba(246,232,205,0.85)', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>ย้อนกลับ</button>
          )}
          <button
            onClick={() => canAdvance && onNext()}
            disabled={!canAdvance}
            style={{
              flex: 1, minHeight: '48px', borderRadius: '12px', border: 'none',
              background: canAdvance ? 'linear-gradient(135deg, #D9AE6E, #BCA16B)' : 'rgba(255,255,255,0.08)',
              color: canAdvance ? '#101D18' : 'rgba(255,255,255,0.3)',
              fontSize: '16px', fontWeight: 'bold', cursor: canAdvance ? 'pointer' : 'not-allowed'
            }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    )}
  </div>
);

export const Section: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {title && <h3 style={{ margin: 0, fontSize: '19px' }}>{title}</h3>}
    {children}
  </div>
);

export const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: 0, fontSize: '15px', color: 'rgba(246,232,205,0.75)', lineHeight: 1.7 }}>{children}</p>
);

export const Box: React.FC<{ children: React.ReactNode; highlight?: boolean }> = ({ children, highlight }) => (
  <div style={{
    background: highlight ? 'rgba(217,174,110,0.1)' : 'rgba(0,0,0,0.3)',
    border: `1px solid ${highlight ? 'rgba(217,174,110,0.45)' : 'rgba(217,174,110,0.25)'}`,
    borderRadius: '16px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '15px', lineHeight: 1.7
  }}>{children}</div>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: '13px', fontWeight: 'bold', color: GOLD }}>{children}</div>
);

export interface QuizDef { question: string; options: { id: string; text: string; correct: boolean }[] }

export const isQuizCorrect = (quiz: QuizDef, picked?: string | null) =>
  !!picked && !!quiz.options.find((o) => o.id === picked)?.correct;

export const Quiz: React.FC<{ quiz: QuizDef; picked: string | null; onPick: (id: string) => void }> = ({ quiz, picked, onPick }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <div style={{ fontSize: '15px', fontWeight: 'bold' }}>เช็กความเข้าใจ: {quiz.question}</div>
    {quiz.options.map((o) => {
      let border = '1px solid rgba(217,174,110,0.25)';
      let bg = 'rgba(0,0,0,0.3)';
      if (picked) {
        if (o.correct) { border = '1px solid rgba(74,222,128,0.6)'; bg = 'rgba(74,222,128,0.12)'; }
        else if (picked === o.id) { border = '1px solid rgba(255,107,107,0.6)'; bg = 'rgba(255,107,107,0.12)'; }
      }
      return (
        <button key={o.id} onClick={() => !picked && onPick(o.id)} style={{ textAlign: 'left', minHeight: '48px', padding: '12px 16px', borderRadius: '12px', border, background: bg, color: CREAM, fontSize: '14px', cursor: picked ? 'default' : 'pointer' }}>
          {o.text}{picked && o.correct ? ' ✓' : ''}
        </button>
      );
    })}
    {picked && (
      <div style={{ fontSize: '14px', fontWeight: 'bold', color: isQuizCorrect(quiz, picked) ? '#4ade80' : GOLD }}>
        {isQuizCorrect(quiz, picked) ? 'ถูกต้อง! เก่งมาก 🎉' : 'ยังไม่ใช่ — คำตอบที่ถูกคือข้อสีเขียว'}
      </div>
    )}
  </div>
);

export const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }> =
  ({ label, value, onChange, placeholder, multiline }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: 'bold', color: GOLD }}>{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, padding: '14px 16px', lineHeight: 1.6, resize: 'vertical' }} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  );

// Multi-select chips
export const toggleIn = (list: string[], item: string) => list.includes(item) ? list.filter((v) => v !== item) : [...list, item];

export const Chips: React.FC<{ label: string; options: string[]; value: string[]; onToggle: (option: string) => void }> = ({ label, options, value, onToggle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <Label>{label}</Label>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)} style={{
            minHeight: '40px', padding: '0 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
            border: on ? `1px solid ${GOLD}` : '1px solid rgba(217,174,110,0.25)',
            background: on ? 'rgba(217,174,110,0.2)' : 'rgba(0,0,0,0.3)', color: on ? CREAM : 'rgba(246,232,205,0.7)'
          }}>{on ? '✓ ' : ''}{o}</button>
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
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            flex: '1 1 140px', minHeight: '48px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', color: CREAM,
            border: on ? `2px solid ${GOLD}` : '1px solid rgba(217,174,110,0.25)', background: on ? 'rgba(217,174,110,0.18)' : 'rgba(0,0,0,0.3)'
          }}>{o.label}</button>
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '24px', background: 'rgba(0,0,0,0.25)', borderRadius: '20px' }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '52px', fontWeight: 'bold', color: status === 'done' ? '#ff9b9b' : CREAM }}>{fmt(left)}</div>
      {status === 'idle' && <button onClick={() => setStatus('running')} style={goldBtn}>เริ่มจับเวลา ({Math.round(seconds / 60)} นาที)</button>}
      {status === 'running' && <p style={{ margin: 0, fontSize: '13px', color: 'rgba(246,232,205,0.6)' }}>กำลังจับเวลา...</p>}
      {status === 'done' && <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#ff9b9b', textAlign: 'center' }}>{doneText}</p>}
    </div>
  );
};

export const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

export const goldBtn: React.CSSProperties = {
  minHeight: '52px', padding: '0 32px', borderRadius: '14px', border: 'none',
  background: 'linear-gradient(135deg, #D9AE6E, #BCA16B)', color: '#101D18', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
};

export const SummaryCard: React.FC<{ rows: [string, React.ReactNode][] }> = ({ rows }) => (
  <div style={{ width: '100%', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(217,174,110,0.35)', borderRadius: '16px', padding: '18px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {rows.map(([k, v]) => (
      <div key={k}>
        <div style={{ fontSize: '11px', color: GOLD, fontWeight: 'bold' }}>{k}</div>
        <div style={{ fontSize: '15px', lineHeight: 1.6 }}>{v || '—'}</div>
      </div>
    ))}
  </div>
);

export const DoneScreen: React.FC<{ title: string; subtitle: string; children?: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', textAlign: 'center', padding: '20px 0' }}>
    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '2px solid #4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#4ade80' }}>✓</div>
    <h3 style={{ margin: 0, fontSize: '19px' }}>{title}</h3>
    <p style={{ margin: 0, fontSize: '14px', color: 'rgba(246,232,205,0.7)' }}>{subtitle}</p>
    {children}
  </div>
);

export const Loading = () => <div style={{ color: CREAM, textAlign: 'center', padding: '40px' }}>กำลังโหลด...</div>;
