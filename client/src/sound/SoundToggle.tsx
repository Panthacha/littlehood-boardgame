import React, { useEffect, useState } from 'react';
import { isMuted, onMuteChange, play, setMuted } from './sfx';

// Speaker button to turn sound effects on/off (remembered on this device).
export const SoundToggle: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const [muted, setM] = useState(isMuted());
  useEffect(() => onMuteChange(setM), []);
  return (
    <button
      type="button"
      className="lh-tab"
      aria-pressed={!muted}
      aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
      title={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
      onClick={() => { const next = !muted; setMuted(next); if (!next) play('select'); }}
      style={{ minWidth: '44px', minHeight: '40px', padding: '6px 10px', fontSize: '18px', lineHeight: 1, fontFamily: 'inherit', ...style }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
};

// Soft wooden knock for the game's buttons (wood signs, tabs, choice strips).
// Installed once from main.tsx.
export const installTapSound = () => {
  window.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement | null)?.closest?.('.lh-sign, .lh-tab, .lh-strip') as HTMLButtonElement | null;
    if (el && !el.disabled && !el.matches('[aria-label="ปิดเสียง"], [aria-label="เปิดเสียง"]')) play('tap');
  }, { passive: true });
};
