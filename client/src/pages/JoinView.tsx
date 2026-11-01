import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { ForestScene } from '../theme/Forest';
import { getDeviceId } from '../utils/deviceId';

const JoinView: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  // The printed character cards' QR links end in ?house=1..6 — that number is
  // the CARD (character), not the house; the house is picked below. It's
  // passed along so the night round gives this house the card's role.
  const [searchParams] = useSearchParams();
  const cardParam = parseInt(searchParams.get('house') || searchParams.get('card') || '', 10);
  const card = cardParam >= 1 && cardParam <= 6 ? cardParam : undefined;
  const { socket, connected, session } = useSocket();

  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [entering, setEntering] = useState(false);
  const [mine, setMine] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Watch the lobby live so houses other devices have taken are greyed out.
  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit('watchLobby', { eventSlug: eventSlug || '', deviceId: getDeviceId() }, (res) => {
      setMine(res.mine);
      if (res.mine) setSelectedHouse(res.mine);
    });
  }, [socket, connected, eventSlug]);

  const isTaken = (id: number) => !!session?.houses[id]?.claimed && id !== mine;
  const gameStarted = !!session && session.state !== 'LOBBY';

  // If someone else grabs the house this phone had selected, drop the selection.
  useEffect(() => {
    if (selectedHouse && isTaken(selectedHouse)) {
      setSelectedHouse(null);
      setError(`บ้านที่ ${selectedHouse} มีคนเข้าไปแล้ว เลือกบ้านอื่นนะ`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, mine]);

  const houses = [1, 2, 3, 4, 5, 6];

  const handleConfirm = () => {
    if (!selectedHouse || !socket) return;
    setEntering(true);
    setError('');
    // Claim the house now so two phones tapping at once can't both get it.
    socket.emit('joinLobby', { eventSlug: eventSlug || '', houseId: selectedHouse, deviceId: getDeviceId(), card }, (res: any) => {
      if (res?.error) {
        setEntering(false);
        setSelectedHouse(null);
        setError(res.error === 'ALREADY_IN_OTHER_HOUSE'
          ? `เครื่องนี้อยู่บ้านที่ ${res.mine} แล้ว เกมเริ่มแล้วจึงย้ายบ้านไม่ได้ ถ้าต้องการย้ายให้ผู้สอนช่วย`
          : res.error === 'CARD_USED'
            ? 'การ์ดใบนี้ถูกสแกนเข้าบ้านอื่นไปแล้ว ตรวจสอบการ์ดกับผู้สอนอีกครั้ง'
            : 'บ้านนี้มีคนเข้าไปแล้ว เลือกบ้านอื่นนะ');
        return;
      }
      // short beat so the lit-up house is seen before the page changes
      setTimeout(() => navigate(`/play/${eventSlug}?house=${selectedHouse}${card ? `&card=${card}` : ''}`), 450);
    });
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
            const taken = isTaken(id);
            return (
              <button
                key={id}
                onClick={() => { setSelectedHouse(id); setError(''); }}
                disabled={taken}
                aria-pressed={isSelected}
                aria-label={taken ? `บ้านที่ ${id} มีคนเข้าแล้ว` : `บ้านที่ ${id}`}
                className="lh-rise"
                style={{
                  position: 'relative', background: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  animationDelay: `${0.06 * i}s`, cursor: taken ? 'not-allowed' : 'pointer', opacity: 1, filter: 'none'
                }}
              >
                <img
                  src={`/houses/${id}.png`}
                  alt=""
                  className={`lh-house ${isSelected ? 'is-lit' : (selectedHouse || taken ? 'is-dark' : '')}`}
                  style={{ width: '100%', maxWidth: '170px', margin: '-14% 0 -22%' }}
                />
                <span className="lh-plaque" style={{ padding: '4px 14px', position: 'relative', zIndex: 1, outline: isSelected ? '2px solid var(--lh-gold-bright)' : 'none', outlineOffset: '2px' }}>
                  <span className="lh-display" style={{ fontSize: '17px' }}>บ้านที่ {id}</span>
                </span>
                {taken && (
                  <span className="lh-display" style={{ position: 'absolute', top: '34%', left: '50%', transform: 'translate(-50%, -50%) rotate(-10deg)', padding: '2px 12px', border: '3px double #F4B3B3', borderRadius: '8px', color: '#FBE6D0', background: 'rgba(90,14,26,0.85)', fontSize: '15px', whiteSpace: 'nowrap' }}>
                    มีคนเข้าแล้ว
                  </span>
                )}
                {id === mine && !isSelected && (
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#BDF0C6', textShadow: '0 1px 4px #000' }}>บ้านของเครื่องนี้</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {error && (
          <div role="alert" className="lh-parchment lh-rise" style={{ width: '100%', maxWidth: '440px', padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', color: 'var(--lh-hood)' }}>{error}</div>
        )}
        {gameStarted && !mine && !error && (
          <div className="lh-parchment" style={{ width: '100%', maxWidth: '440px', padding: '12px 16px', textAlign: 'center', fontSize: '14px' }}>เกมเริ่มไปแล้ว — เลือกได้เฉพาะบ้านที่ยังว่างอยู่</div>
        )}

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
