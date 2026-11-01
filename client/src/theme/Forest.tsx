import React, { useMemo } from 'react';
import './forest.css';

// Small decorative pieces of the forest theme (see forest.css). All are
// aria-hidden decoration layered behind/around the real content.

const FIREFLY_POINTS: [number, number, number, number][] = [
  [8, 22, 26, -22], [86, 14, -22, 24], [22, 48, 28, 14], [74, 40, -26, -18], [50, 18, 18, -26],
  [12, 74, 22, -16], [90, 66, -18, -22], [40, 62, -24, 16], [62, 82, 20, -20], [30, 90, -16, -18],
  [96, 88, -20, -14], [56, 34, 24, 20], [4, 56, 18, 22], [80, 92, -22, -12]
];

export const Fireflies: React.FC<{ count?: number }> = ({ count = 10 }) => (
  <>
    {FIREFLY_POINTS.slice(0, count).map(([x, y, fx, fy], i) => (
      <span key={i} className="lh-firefly" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i * 0.7) % 6}s`, ['--fx' as any]: `${fx}px`, ['--fy' as any]: `${fy}px` }} />
    ))}
  </>
);

export const Fog: React.FC = () => (
  <>
    <div className="lh-fog lh-fog--mid" />
    <div className="lh-fog lh-fog--low" />
  </>
);

export const NightSky: React.FC<{ moonSize?: number; moonTop?: string; moonLeft?: string }> = ({ moonSize = 140, moonTop = '6%', moonLeft = '50%' }) => {
  const stars = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    left: `${(i * 37) % 100}%`, top: `${(i * 23) % 48}%`, size: i % 4 === 0 ? 3 : 2, delay: `${((i * 0.31) % 3).toFixed(2)}s`
  })), []);
  return (
    <>
      {stars.map((s, i) => (
        <span key={i} className="lh-star" style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }} />
      ))}
      <div className="lh-moon" style={{ width: moonSize, height: moonSize, top: moonTop, left: moonLeft, marginLeft: -moonSize / 2 }} />
    </>
  );
};

// Full-page scene: one of the game's illustrations as background, with
// fog + fireflies (day) or stars + rising moon (night) layered over it.
export const ForestScene: React.FC<{
  image?: string; night?: boolean; fireflies?: number; className?: string; style?: React.CSSProperties; children: React.ReactNode;
}> = ({ image = '/host-bg.png', night = false, fireflies = 10, className = '', style, children }) => (
  <div className={`lh-scene ${night ? 'lh-scene--night' : ''} ${className}`} style={{ ['--lh-bg' as any]: `url('${image}')`, ...style }}>
    <div className="lh-fx" aria-hidden="true">
      {night ? <NightSky /> : <Fireflies count={fireflies} />}
      <Fog />
    </div>
    {children}
  </div>
);

// Gold burst for a correct answer. Mount it (e.g. keyed by the pick) to replay.
export const SparkleBurst: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <span aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none', ...style }}>
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const r = 44 + (i % 3) * 14;
      return (
        <span key={i} className="lh-spark" style={{
          ['--dx' as any]: `${Math.round(Math.cos(a) * r)}px`, ['--dy' as any]: `${Math.round(Math.sin(a) * r)}px`,
          width: i % 2 ? 6 : 9, height: i % 2 ? 6 : 9, animationDelay: `${(i % 3) * 0.05}s`
        }} />
      );
    })}
  </span>
);

export const Trail: React.FC<{ steps: number; current: number }> = ({ steps, current }) => (
  <div className="lh-trail" role="img" aria-label={`ด่านที่ ${Math.min(current + 1, steps)} จาก ${steps}`}>
    {Array.from({ length: steps }, (_, i) => (
      <span key={i} className={i < current ? 'done' : i === current ? 'now' : ''} />
    ))}
  </div>
);
