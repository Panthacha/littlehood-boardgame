import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { ForestScene } from '../theme/Forest';

const JoinView: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const { connected } = useSocket();

  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [entering, setEntering] = useState(false);

  const houses = [1, 2, 3, 4, 5, 6];

  const handleConfirm = () => {
    if (!selectedHouse) return;
    setEntering(true);
    // short beat so the lit-up house is seen before the page changes
    setTimeout(() => navigate(`/play/${eventSlug}?house=${selectedHouse}`), 450);
  };

  if (!connected) {
    return (
      <ForestScene image="/village-bg.jpg">
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--lh-gold-bright)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(224,184,102,0.3)', borderTopColor: 'var(--lh-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p className="lh-display" style={{ fontSize: '18px' }}>กำลังเดินเข้าสู่ผืนป่า…</p>
        </div>
      </ForestScene>
    );
  }

  return (
    <ForestScene image="/village-bg.jpg" fireflies={12}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 16px 28px', gap: '22px' }}>
        <div className="lh-rise" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '13px', letterSpacing: '0.3em', color: 'var(--lh-gold)' }}>LITTLE HOOD</div>
          <h1 className="lh-display" style={{ margin: '6px 0', fontSize: '32px', color: 'var(--lh-gold-bright)', textShadow: '0 3px 0 rgba(0,0,0,0.6), 0 0 24px rgba(0,0,0,0.6)' }}>เลือกบ้านของคุณ</h1>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--lh-cream)', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>เลือกบ้านตามที่ผู้สอนบอกกลุ่มของคุณ</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 14px', width: '100%', maxWidth: '440px' }}>
          {houses.map((id, i) => {
            const isSelected = selectedHouse === id;
            return (
              <button
                key={id}
                onClick={() => setSelectedHouse(id)}
                aria-pressed={isSelected}
                className="lh-rise"
                style={{
                  background: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  animationDelay: `${0.06 * i}s`, cursor: 'pointer'
                }}
              >
                <img
                  src={`/houses/${id}.png`}
                  alt=""
                  className={`lh-house ${isSelected ? 'is-lit' : (selectedHouse ? 'is-dark' : '')}`}
                  style={{ width: '100%', maxWidth: '170px', margin: '-14% 0 -22%' }}
                />
                <span className="lh-plaque" style={{ padding: '4px 14px', position: 'relative', zIndex: 1, outline: isSelected ? '2px solid var(--lh-gold-bright)' : 'none', outlineOffset: '2px' }}>
                  <span className="lh-display" style={{ fontSize: '17px' }}>บ้านที่ {id}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <button
          className={`lh-sign lh-sign--big ${selectedHouse && !entering ? 'lh-glow-pulse' : ''}`}
          onClick={handleConfirm}
          disabled={!selectedHouse || entering}
          style={{ width: '100%', maxWidth: '440px' }}
        >
          {entering ? 'กำลังเดินเข้าป่า…' : selectedHouse ? `เข้าสู่บ้านที่ ${selectedHouse} →` : 'แตะเลือกบ้านก่อนนะ'}
        </button>
      </div>
    </ForestScene>
  );
};

export default JoinView;
