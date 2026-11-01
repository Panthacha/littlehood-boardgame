import React, { useEffect, useMemo, useState } from 'react';
import { SparkleBurst } from '../../theme/Forest';

// A digital two-deck card draw (Part 3): shuffle → fan of face-down cards →
// tap one to flip it. Which card a house gets is decided by `dealt`
// (deterministic per game + house, so houses never share a card and a
// refresh shows the same card); the fan only lets the team pick a back.

export interface CardFace { title: string; desc: string }

// small deterministic PRNG so every device deals the same way for a game
const seeded = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Shuffle the deck for this game and give house N the N-th card, so the six
// houses always get six different cards.
export const dealFor = <T,>(deck: T[], gameSeed: string, houseId: number): T => {
  const rand = seeded(gameSeed);
  const order = deck.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return deck[order[(houseId - 1) % deck.length]];
};

const FAN = 3; // face-down cards fanned out to pick from

export const Deck: React.FC<{
  label: string; color: string; dark: string; dealt: CardFace; drawn: string | null; onDraw: (title: string) => void;
}> = ({ label, color, dark, dealt, drawn, onDraw }) => {
  const [phase, setPhase] = useState<'stack' | 'shuffling' | 'fan'>(drawn ? 'fan' : 'stack');
  const [picked, setPicked] = useState<number | null>(drawn ? Math.floor(FAN / 2) : null);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    if (phase !== 'shuffling') return;
    const t = setTimeout(() => setPhase('fan'), 1400);
    return () => clearTimeout(t);
  }, [phase]);

  const back: React.CSSProperties = {
    position: 'absolute', inset: 0, borderRadius: '10px', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    background: `repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0 6px, transparent 6px 12px), radial-gradient(circle at 50% 40%, ${color}, ${dark} 80%)`,
    border: '3px solid #E0B866', boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.35), 0 6px 12px rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F3D58A', fontFamily: 'var(--lh-display)', fontSize: '15px'
  };

  const offsets = useMemo(() => Array.from({ length: FAN }, (_, i) => i - (FAN - 1) / 2), []);
  const cardW = 92, cardH = 132;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div className="lh-display" style={{ fontSize: '17px', color: dark }}>กอง{label}</div>
      <div style={{ position: 'relative', width: '100%', maxWidth: '300px', height: `${cardH + 40}px` }}>
        {offsets.map((o, i) => {
          const isPicked = picked === i;
          const flipped = isPicked && !!drawn;
          let transform = `translate(-50%, 0) rotate(${i * 0.8 - 1.6}deg) translateY(${-i * 2}px)`;
          if (phase === 'shuffling') transform = `translate(-50%, 0)`;
          if (phase === 'fan') transform = picked === null
            ? `translate(calc(-50% + ${o * 74}px), ${Math.abs(o) * 10}px) rotate(${o * 12}deg)`
            : isPicked
              ? `translate(-50%, -6px) scale(1.12)`
              : `translate(calc(-50% + ${o * 74}px), ${Math.abs(o) * 10 + 26}px) rotate(${o * 12}deg) scale(0.85)`;
          return (
            <button
              key={i}
              aria-label={phase === 'fan' && picked === null ? `เลือกการ์ด${label}ใบที่ ${i + 1}` : undefined}
              disabled={phase !== 'fan' || picked !== null}
              onClick={() => { setPicked(i); setFresh(true); setTimeout(() => onDraw(dealt.title), 450); }}
              className={phase === 'shuffling' ? 'lh-card-shuffle' : ''}
              style={{
                position: 'absolute', left: '50%', top: '10px', width: `${cardW}px`, height: `${cardH}px`, padding: 0, border: 'none', background: 'none',
                // filter: none overrides the global disabled-button grayscale, which would also flatten the 3D flip
                transform, transition: 'transform 0.55s cubic-bezier(.2,.8,.2,1), opacity 0.4s', opacity: picked !== null && !isPicked ? 0.35 : 1, filter: 'none',
                cursor: phase === 'fan' && picked === null ? 'pointer' : 'default', zIndex: isPicked ? 10 : i, perspective: '800px',
                animationDelay: `${i * 0.06}s`, ['--sx' as any]: `${(i % 2 ? 1 : -1) * (30 + i * 6)}px`
              }}
            >
              <span style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transition: 'transform 0.7s ease', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
                <span style={back}>{label}</span>
                <span style={{
                  ...back, transform: 'rotateY(180deg)', background: 'radial-gradient(ellipse at 50% 35%, #FBF3DE, #EADCBF 70%, #CDB384)',
                  color: 'var(--lh-ink)', flexDirection: 'column', gap: '6px', padding: '10px 8px', textAlign: 'center', border: `3px solid ${color}`
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color }}>{label}</span>
                  <span className="lh-display" style={{ fontSize: '15px', lineHeight: 1.25 }}>{dealt.title}</span>
                  <span style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: '10.5px', lineHeight: 1.35, color: 'var(--lh-ink-soft)' }}>{dealt.desc}</span>
                </span>
              </span>
              {flipped && fresh && <SparkleBurst style={{ left: '50%', top: '50%' }} />}
            </button>
          );
        })}
      </div>
      {phase === 'stack' && <button className="lh-sign" onClick={() => setPhase('shuffling')}>สับไพ่{label}</button>}
      {phase === 'shuffling' && <p className="lh-breathe" style={{ margin: 0, fontSize: '14px', color: 'var(--lh-ink-soft)' }}>กำลังสับไพ่…</p>}
      {phase === 'fan' && picked === null && <p className="lh-breathe" style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>แตะเลือก 1 ใบ</p>}
      {drawn && <p className="lh-pop" style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: dark }}>ได้: {drawn}</p>}
    </div>
  );
};
