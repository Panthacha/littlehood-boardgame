import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { nightNews } from '../utils/nightRecap';
import { AdminSettingsButton } from '../components/AdminSettingsButton';
import { AdminControlModal } from '../components/AdminControlModal';
import type { HouseData, Question } from '../types';
import YouTube from 'react-youtube';
import { ForestScene, SparkleBurst } from '../theme/Forest';

const PART_TITLES: Record<number, string> = {
  1: 'ห้องแล็บบอร์ดเกม',
  2: 'ห้องเขียนเรื่อง',
  3: 'ห้องออกแบบกติกา',
  4: 'ห้องประกอบต้นแบบ',
  5: 'ห้องทดสอบและเล่าเรื่อง'
};

// Answer colors, shared with the players' wax-seal answer buttons
const OPTION_STYLE: Record<string, { color: string; dark: string }> = {
  'ก': { color: '#A8233A', dark: '#5A0E1A' },
  'ข': { color: '#2F6B3A', dark: '#163A1C' },
  'ค': { color: '#2C4F8A', dark: '#14284A' },
  'ง': { color: '#B07A1E', dark: '#5A3C0A' }
};
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

// One cottage from /houses, dark until `lit`.
const Cottage: React.FC<{ id: number; lit: boolean; size?: number; children?: React.ReactNode }> = ({ id, lit, size = 200, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: size }}>
    <img src={`/houses/${id}.png`} alt="" className={`lh-house ${lit ? 'is-lit' : 'is-dark'}`} style={{ width: size, margin: `-${size * 0.14}px 0 -${size * 0.2}px` }} />
    <span className="lh-plaque" style={{ position: 'relative', zIndex: 1, padding: '4px 16px' }}>
      <span className="lh-display" style={{ fontSize: size > 150 ? '20px' : '16px' }}>บ้านที่ {id}</span>
    </span>
    {children}
  </div>
);

// Ranked ledger used by both scoreboards
const Ledger: React.FC<{ houses: HouseData[]; showPost?: boolean }> = ({ houses, showPost }) => {
  const sorted = [...houses].sort((a, b) => b.score - a.score);
  const top = Math.max(1, ...sorted.map(h => h.score));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {sorted.map((h, i) => (
        <div key={h.houseId} className="lh-ledger-row" style={{ animationDelay: `${0.12 * (sorted.length - i)}s`, display: 'grid', gridTemplateColumns: '56px 84px 1fr 150px', alignItems: 'center', gap: '16px', padding: '6px 10px', borderBottom: '1px dashed rgba(122,85,48,0.4)' }}>
          <span className={i === 0 ? 'lh-seal lh-stamp' : ''} style={{ width: '48px', height: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '22px', color: i === 0 ? '#F6D9C0' : 'var(--lh-ink-soft)' }}>{i + 1}</span>
          <img src={`/houses/${h.houseId}.png`} alt="" style={{ width: '84px', margin: '-14px 0 -18px', filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.35))' }} />
          <div>
            <div className="lh-display" style={{ fontSize: '22px' }}>บ้านที่ {h.houseId} {i === 0 && <span style={{ color: 'var(--lh-hood)' }}>· ผู้นำ</span>}</div>
            <div style={{ height: '10px', marginTop: '6px', borderRadius: '999px', background: 'rgba(122,85,48,0.15)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, (h.score / top) * 100)}%`, background: i === 0 ? 'linear-gradient(90deg, #B07A1E, #E0B866)' : '#8A5A1E', transition: 'width 1.2s ease' }} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><span className="lh-coin" /><strong style={{ fontFamily: "'Cinzel', serif", fontSize: '26px' }}>{h.score}</strong></div>
            <div style={{ fontSize: '14px', color: 'var(--lh-ink-soft)' }}>
              {showPost
                ? <>Pre {h.correctAnswers}/5 → Post <strong style={{ color: (h.postCorrectAnswers || 0) > h.correctAnswers ? '#2F6B3A' : 'var(--lh-ink)' }}>{h.postCorrectAnswers || 0}/5</strong></>
                : <>ตอบถูก {h.correctAnswers}/5</>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const HostView: React.FC = () => {
  const { socket, session, connected } = useSocket();
  const [activeTab, setActiveTab] = useState<'LOBBY' | 'QUIZ'>('LOBBY');
  const [question, setQuestion] = useState<Question | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [revealData, setRevealData] = useState<any>(null);
  const [playingIntro, setPlayingIntro] = useState(false);
  
  // Admin state
  const [showAdminModal, setShowAdminModal] = useState(false);
  
  useEffect(() => {
    if (!socket || !connected) return;
    
    socket.emit('hostJoin', () => {});
    
    socket.on('questionUpdate', (data) => {
      if (data.question) {
        setQuestion(data.question);
      } else {
        // Fetch question via API when not in reveal state
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        fetch(`${apiUrl}/api/questions`)
          .then(res => res.json())
          .then((questions) => {
             setQuestion(questions[data.index]);
          });
      }
    });
    
    socket.on('timeUpdate', (data) => setTimeRemaining(data.timeRemaining));
    socket.on('countdownUpdate', (data) => setCountdown(data.countdown));
    socket.on('revealAnswer', (data) => setRevealData(data));
    
    return () => {
      socket.off('questionUpdate');
      socket.off('timeUpdate');
      socket.off('countdownUpdate');
      socket.off('revealAnswer');
    };
  }, [socket, connected]);

  // Opening (or reloading) the big screen mid-game should land on the
  // running mission, not the lobby with a disabled start button.
  const sessionState = session?.state;
  const [autoTabbed, setAutoTabbed] = useState(false);
  useEffect(() => {
    if (!sessionState || autoTabbed) return;
    setAutoTabbed(true);
    if (sessionState !== 'LOBBY') setActiveTab('QUIZ');
  }, [sessionState, autoTabbed]);

  if (!connected || !session) {
    return (
      <ForestScene>
        <div className="lh-display lh-breathe" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: 'var(--lh-gold-bright)' }}>กำลังเข้าสู่ผืนป่า…</div>
      </ForestScene>
    );
  }

  const sign = (label: React.ReactNode, onClick: () => void, variant = '', extra: React.CSSProperties = {}, disabled = false) => (
    <button className={`lh-sign lh-sign--big ${variant}`} onClick={onClick} disabled={disabled} style={extra}>{label}</button>
  );
  const pageCard: React.CSSProperties = { maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '40px 48px' };

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: '10px' }} role="tablist">
      <button role="tab" aria-selected={activeTab === 'LOBBY'} className={`lh-tab ${activeTab === 'LOBBY' ? 'is-active' : ''}`} onClick={() => setActiveTab('LOBBY')}>ผู้เข้าร่วม</button>
      <button role="tab" aria-selected={activeTab === 'QUIZ'} className={`lh-tab ${activeTab === 'QUIZ' ? 'is-active' : ''}`} onClick={() => setActiveTab('QUIZ')}>ภารกิจ</button>
    </div>
  );

  const renderLobbyTab = () => {
    const readyHousesCount = Object.values(session.houses).filter(h => h.isOnline).length;
    const canStart = session.state === 'LOBBY' && readyHousesCount > 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '36px', paddingTop: '20px' }}>
        <div className="lh-rise" style={{ textAlign: 'center' }}>
          <h2 className="lh-display" style={{ fontSize: '40px', color: 'var(--lh-gold-bright)', textShadow: '0 3px 0 rgba(0,0,0,0.6), 0 0 30px rgba(0,0,0,0.7)' }}>หมู่บ้านของเราพร้อมออกเดินทางหรือยัง?</h2>
          <p style={{ marginTop: '10px', fontSize: '20px', color: 'var(--lh-cream)', textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>
            ไฟติดแล้ว <strong style={{ fontFamily: "'Cinzel', serif", fontSize: '30px', color: 'var(--lh-gold-bright)' }}>{readyHousesCount}</strong> จาก 6 บ้าน
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '12px', width: '100%', maxWidth: '1400px', alignItems: 'end' }}>
          {Object.values(session.houses).map((house, i) => {
            const online = house.players.filter(p => p.isOnline).length;
            return (
              <div key={house.houseId} style={{ display: 'flex', justifyContent: 'center', transform: `translateY(${i % 2 ? -18 : 0}px)` }}>
                {/* isOnline stays true once anyone joined (phones sleep and drop the socket) */}
                <Cottage id={house.houseId} lit={house.isOnline} size={220}>
                  <span style={{ marginTop: '8px', fontSize: '16px', fontWeight: 'bold', color: house.isOnline ? '#BDF0C6' : 'rgba(246,232,205,0.55)', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                    {!house.isOnline ? 'รอผู้เดินทาง…' : online > 0 ? `เข้าร่วมแล้ว ${online} คน` : 'เข้าร่วมแล้ว'}
                  </span>
                </Cottage>
              </div>
            );
          })}
        </div>

        {session.state === 'LOBBY'
          ? sign('เริ่มการเดินทาง →', () => setPlayingIntro(true), `lh-sign--hood ${canStart ? 'lh-glow-pulse' : ''}`, { minWidth: '360px' }, !canStart)
          : sign('เกมกำลังดำเนินอยู่ — ไปที่ภารกิจ →', () => setActiveTab('QUIZ'), 'lh-glow-pulse', { minWidth: '360px' })}
        {session.state === 'LOBBY' && readyHousesCount === 0 && (
          <p style={{ marginTop: '-20px', color: 'var(--lh-cream)', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>รอให้มีอย่างน้อย 1 บ้านเข้าร่วมก่อน จึงจะเริ่มได้</p>
        )}
      </div>
    );
  };

  const renderQuizTab = () => {
    if (session.state === 'LOBBY') {
      return (
        <div className="lh-parchment lh-flip" style={{ ...pageCard, maxWidth: '640px', textAlign: 'center', marginTop: '40px' }}>
          <h2 className="lh-display" style={{ fontSize: '34px', marginBottom: '14px' }}>เกมยังไม่เริ่ม</h2>
          <p style={{ fontSize: '20px', color: 'var(--lh-ink-soft)', marginBottom: '28px' }}>กลับไปที่แท็บ "ผู้เข้าร่วม" เพื่อเริ่มเกม</p>
          {sign('กลับไปห้องรอ', () => setActiveTab('LOBBY'))}
        </div>
      );
    }

    if (session.state === 'COUNTDOWN') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '28px' }}>
          <h2 className="lh-display" style={{ fontSize: '52px', color: 'var(--lh-cream)', textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}>เตรียมพร้อม!</h2>
          <span key={countdown} className="lh-seal lh-pop" style={{ width: '240px', height: '240px', fontSize: countdown > 0 ? '120px' : '56px', fontFamily: countdown > 0 ? "'Cinzel', serif" : 'var(--lh-display)', fontWeight: countdown > 0 ? 700 : 400 }}>
            {countdown > 0 ? countdown : 'เริ่ม!'}
          </span>
        </div>
      );
    }

    if (session.state === 'MID_SCOREBOARD') {
      return (
        <div className="lh-parchment lh-flip" style={pageCard}>
          <div className="lh-kicker" style={{ textAlign: 'center' }}>จบช่วง Pre-test</div>
          <h2 className="lh-display" style={{ fontSize: '40px', textAlign: 'center', margin: '6px 0 26px' }}>อันดับหมู่บ้านครึ่งแรก</h2>
          <Ledger houses={Object.values(session.houses)} />
          <div style={{ marginTop: '34px', display: 'flex', justifyContent: 'center' }}>
            {sign(<>เริ่ม Part 1: {PART_TITLES[1]} →</>, () => socket?.emit('hostStartPart', 1), 'lh-glow-pulse')}
          </div>
        </div>
      );
    }

    if (session.state.startsWith('PART_')) {
      const partNum = parseInt(session.state.replace('PART_', ''), 10);
      const done = session.partsCompleted?.[partNum] || [];
      const online = Object.values(session.houses).filter(h => h.isOnline);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '26px' }}>
          <div className="lh-parchment lh-flip" style={{ ...pageCard, textAlign: 'center' }}>
            <span className="lh-seal" aria-hidden="true" style={{ position: 'absolute', top: '26px', right: '30px', width: '80px', height: '80px', fontSize: '30px' }}>{ROMAN[partNum - 1]}</span>
            <div className="lh-kicker">Part {partNum} / 5</div>
            <h2 className="lh-display" style={{ fontSize: '48px', margin: '6px 0 10px' }}>{PART_TITLES[partNum]}</h2>
            <p style={{ fontSize: '20px', color: 'var(--lh-ink-soft)' }}>แต่ละบ้านกำลังทำกิจกรรมบนมือถือ/iPad — บ้านไหนเสร็จแล้ว ไฟจะติด</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px', margin: '30px 0 8px', justifyItems: 'center' }}>
              {[1, 2, 3, 4, 5, 6].map(id => (
                <Cottage key={id} id={id} lit={done.includes(id)} size={130}>
                  <span style={{ marginTop: '6px', fontSize: '15px', fontWeight: 'bold', color: done.includes(id) ? '#2F6B3A' : 'var(--lh-ink-soft)' }}>
                    {done.includes(id) ? '✓ เสร็จแล้ว' : session.houses[id]?.isOnline ? 'กำลังทำ…' : 'ไม่ได้เข้าร่วม'}
                  </span>
                </Cottage>
              ))}
            </div>
            <div style={{ fontSize: '18px', color: 'var(--lh-ink-soft)', marginTop: '14px' }}>
              เสร็จแล้ว <strong style={{ fontFamily: "'Cinzel', serif", fontSize: '26px', color: 'var(--lh-ink)' }}>{done.length}</strong> / {online.length} บ้าน
            </div>
          </div>

          {partNum > 1 && (
            <div className="lh-parchment lh-rise" style={{ width: '100%', maxWidth: '760px', padding: '20px 28px', transform: 'rotate(-0.6deg)', animationDelay: '0.4s' }}>
              <div className="lh-display" style={{ fontSize: '20px', color: 'var(--lh-hood)', marginBottom: '8px' }}>เช้าวันใหม่ — ข่าวจากคืนที่ {partNum - 1}</div>
              {nightNews(session, partNum - 1).map((line, i) => (
                <div key={i} style={{ fontSize: '19px', padding: '3px 0' }}>{line}</div>
              ))}
            </div>
          )}

          {sign(<>เข้าสู่คืนที่ {partNum} 🌙</>, () => socket?.emit('hostStartNightMode'), 'lh-sign--night')}
        </div>
      );
    }

    if (session.state === 'NIGHT_MODE') {
      const awakeId = session.awakeHouseId ?? null;
      const completedPart = session.lastCompletedPart || 1;
      const isLastRound = completedPart === 5;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '78vh', paddingTop: '22vh', gap: '18px', textAlign: 'center' }}>
          {awakeId ? (
            <div key={awakeId} className="lh-pop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={`/houses/${awakeId}.png`} alt="" className="lh-house is-lit" style={{ width: '300px', margin: '-60px 0 -70px' }} />
              <h2 className="lh-display" style={{ fontSize: '64px', color: 'var(--lh-gold-bright)', textShadow: '0 0 40px rgba(243,213,138,0.6)' }}>บ้านที่ {awakeId} ลืมตา…</h2>
              <p style={{ fontSize: '24px', color: 'rgba(246,232,205,0.8)', fontStyle: 'italic' }}>มีบางสิ่งกำลังเกิดขึ้นในความมืด</p>
            </div>
          ) : (
            <>
              <div className="lh-title-in" style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '24px', letterSpacing: '0.4em', color: '#9FB4E0', animationDelay: '1.4s' }}>NIGHT {ROMAN[completedPart - 1]}</div>
              <h2 className="lh-display lh-title-in" style={{ fontSize: '96px', color: '#E8EEFF', textShadow: '0 0 40px rgba(160,190,255,0.55)', animationDelay: '1.6s' }}>คืนที่ {completedPart}</h2>
              <p className="lh-rise" style={{ fontSize: '26px', color: 'rgba(214,225,245,0.8)', animationDelay: '2.4s' }}>ทุกบ้านหลับตาลง… ฟังเสียงที่จะเรียกชื่อบ้านของคุณ</p>
            </>
          )}
          <div style={{ flex: 1 }} />
          {sign(isLastRound ? 'เริ่ม Posttest 📝' : `ถัดไป: Part ${completedPart + 1} →`, () => isLastRound ? socket?.emit('hostFinishParts') : socket?.emit('hostStartPart', completedPart + 1), 'lh-sign--night')}
        </div>
      );
    }

    if (session.state === 'FINISHED') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', alignItems: 'center' }}>
          <div className="lh-parchment lh-flip" style={pageCard}>
            <div className="lh-kicker" style={{ textAlign: 'center' }}>จบการเดินทาง</div>
            <h2 className="lh-display" style={{ fontSize: '42px', textAlign: 'center', margin: '6px 0 26px' }}>อันดับหมู่บ้านทั้งหมด</h2>
            <Ledger houses={Object.values(session.houses)} showPost />
          </div>
          {(() => {
            const joined = Object.values(session.houses).filter(h => h.isOnline);
            const pre = joined.reduce((a, h) => a + h.correctAnswers, 0);
            const post = joined.reduce((a, h) => a + (h.postCorrectAnswers || 0), 0);
            const max = joined.length * 5 || 1;
            return (
              <div className="lh-parchment lh-rise" style={{ ...pageCard, animationDelay: '0.3s', textAlign: 'center' }}>
                <h3 className="lh-display" style={{ fontSize: '28px', marginBottom: '14px' }}>ความรู้ก่อน → หลังการเดินทาง</h3>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '36px' }}>
                  <div><div className="lh-kicker">Pre-test</div><div style={{ fontFamily: "'Cinzel', serif", fontSize: '46px', fontWeight: 700 }}>{Math.round((pre / max) * 100)}%</div></div>
                  <div style={{ fontSize: '40px', color: 'var(--lh-ink-soft)' }}>→</div>
                  <div><div className="lh-kicker">Posttest</div><div className="lh-pop" style={{ fontFamily: "'Cinzel', serif", fontSize: '46px', fontWeight: 700, color: post >= pre ? '#2F6B3A' : 'var(--lh-hood)' }}>{Math.round((post / max) * 100)}%</div></div>
                </div>
                <p style={{ marginTop: '8px', color: 'var(--lh-ink-soft)' }}>ตอบถูกรวมทุกบ้าน: {pre} → {post} จาก {joined.length * 5} ข้อ</p>
              </div>
            );
          })()}
          <div className="lh-parchment lh-rise" style={{ ...pageCard, animationDelay: '0.6s' }}>
            <h3 className="lh-display" style={{ fontSize: '30px', textAlign: 'center', marginBottom: '16px' }}>เรื่องราวตลอด 5 คืน</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{ padding: '14px 18px', borderRadius: '8px', background: 'rgba(122,85,48,0.1)', border: '1px dashed rgba(122,85,48,0.45)' }}>
                  <div className="lh-display" style={{ fontSize: '18px', color: 'var(--lh-hood)', marginBottom: '6px' }}>คืนที่ {n} <span style={{ fontFamily: 'inherit', fontSize: '14px', color: 'var(--lh-ink-soft)' }}>· หลัง {PART_TITLES[n]}</span></div>
                  {nightNews(session, n).map((line, i) => <div key={i} style={{ fontSize: '16px', padding: '2px 0' }}>{line}</div>)}
                </div>
              ))}
            </div>
          </div>
          {sign('กลับห้องรอ (รีเซ็ตเกม) ↺', () => socket?.emit('hostNewRound'), 'lh-sign--quiet')}
        </div>
      );
    }

    if (!question) return <div className="lh-display lh-breathe" style={{ textAlign: 'center', fontSize: '24px', color: 'var(--lh-gold-bright)' }}>กำลังโหลดภารกิจ…</div>;

    const submittedCount = Object.values(session.houses).filter(h => h.hasSubmitted).length;
    const totalOnline = Object.values(session.houses).filter(h => h.isOnline).length;
    const isOpen = session.state === 'QUESTION_OPEN';
    const isReveal = session.state === 'REVEAL';
    const pct = Math.max(0, Math.min(100, (timeRemaining / 30) * 100));

    return (
      <div style={{ maxWidth: '1180px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div key={session.currentQuestionIndex} className="lh-parchment lh-flip" style={{ padding: '30px 44px 36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', marginBottom: '22px' }}>
            <div>
              <div className="lh-kicker">{session.testPhase === 'POST' ? 'Posttest' : 'Pre-test'} · ภารกิจที่ {session.currentQuestionIndex + 1} / 5</div>
              <div style={{ fontSize: '18px', color: 'var(--lh-ink-soft)', marginTop: '4px' }}>ตอบแล้ว <strong style={{ fontFamily: "'Cinzel', serif", fontSize: '24px', color: 'var(--lh-ink)' }}>{submittedCount}</strong> / {totalOnline} บ้าน</div>
            </div>
            <div style={{ position: 'relative', width: '104px', height: '104px', borderRadius: '50%', background: `conic-gradient(${isOpen && timeRemaining <= 10 ? 'var(--lh-hood)' : '#8A5A1E'} ${isOpen ? pct * 3.6 : 0}deg, rgba(122,85,48,0.18) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 1s linear', flexShrink: 0 }}>
              <div style={{ width: '82px', height: '82px', borderRadius: '50%', background: 'var(--lh-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 8px rgba(90,55,25,0.3)' }}>
                <span key={timeRemaining} className={isOpen && timeRemaining <= 10 ? 'lh-pop' : ''} style={{ fontFamily: isOpen ? "'Cinzel', serif" : 'var(--lh-display)', fontWeight: 700, fontSize: isOpen ? '36px' : '18px', color: isOpen && timeRemaining <= 10 ? 'var(--lh-hood)' : 'var(--lh-ink)' }}>
                  {isOpen ? timeRemaining : 'หมดเวลา'}
                </span>
              </div>
            </div>
          </div>

          <h2 className="lh-display" style={{ fontSize: '40px', lineHeight: 1.45, textAlign: 'center', margin: '0 0 30px' }}>{question.text}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px' }}>
            {question.options.map(opt => {
              const isCorrect = isReveal && opt.key === question.correctKey;
              const isWrong = isReveal && !isCorrect;
              const st = OPTION_STYLE[opt.key] || OPTION_STYLE['ง'];
              return (
                <div key={opt.key} className={`lh-strip ${isCorrect ? 'is-right' : ''}`} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '20px', padding: '18px 22px', fontSize: '26px', cursor: 'default', opacity: isWrong ? 0.4 : 1, transition: 'opacity 0.5s' }}>
                  <span className="lh-display" style={{ width: '62px', height: '62px', borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 35% 30%, ${st.color}, ${st.dark} 78%)`, color: '#FBEBD2', fontSize: '30px', boxShadow: '0 4px 0 rgba(0,0,0,0.35)' }}>{opt.key}</span>
                  <span style={{ fontWeight: 700 }}>{opt.text}</span>
                  {isCorrect && <SparkleBurst style={{ right: '60px', top: '50%' }} />}
                  {isCorrect && <span className="lh-stamp lh-display" style={{ position: 'absolute', right: '18px', top: '-16px', padding: '2px 12px', border: '3px double #2F6B3A', borderRadius: '8px', color: '#2F6B3A', background: 'rgba(243,231,203,0.95)', fontSize: '20px' }}>ถูกต้อง!</span>}
                </div>
              );
            })}
          </div>

          {isReveal && revealData?.explanation && (
            <div className="lh-rise" style={{ marginTop: '24px', padding: '16px 22px', borderRadius: '8px', background: 'rgba(122,85,48,0.1)', border: '1px dashed rgba(122,85,48,0.5)', animationDelay: '0.5s' }}>
              <div className="lh-display" style={{ fontSize: '20px', color: 'var(--lh-hood)', marginBottom: '4px' }}>คำอธิบาย</div>
              <p style={{ fontSize: '19px', lineHeight: 1.6 }}>{revealData.explanation}</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.values(session.houses).filter(h => h.isOnline).map(h => {
              const res = isReveal && revealData ? revealData.houseResults[h.houseId] : null;
              const lit = isReveal ? !!res?.correct : h.hasSubmitted;
              return (
                <div key={h.houseId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '96px' }}>
                  <img src={`/houses/${h.houseId}.png`} alt="" className={`lh-house ${lit ? 'is-lit' : 'is-dark'}`} style={{ width: '96px', margin: '-14px 0 -20px' }} />
                  <span className="lh-plaque" style={{ padding: '2px 10px', fontSize: '14px', position: 'relative' }}>
                    บ้าน {h.houseId} {isReveal && res ? (res.correct ? `+${res.scoreDelta}` : '✗') : (h.hasSubmitted ? '✓' : '')}
                  </span>
                </div>
              );
            })}
          </div>
          <div>
            {session.state === 'QUESTION_CLOSED' && sign('เปิดเฉลย ✨', () => socket?.emit('hostReveal'), 'lh-glow-pulse')}
            {isReveal && sign(session.currentQuestionIndex >= 4 ? (session.testPhase === 'POST' ? 'ดูผลสรุปทั้งหมด 🏆' : 'ดูอันดับครึ่งแรก →') : 'ข้อถัดไป →', () => socket?.emit('hostNextQuestion'))}
          </div>
        </div>
      </div>
    );
  };

  const handleAuthenticate = (password: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket) return resolve(false);
      socket.emit('adminLogin', password, (res) => resolve(res.success));
    });
  };

  return (
    <ForestScene night={session.state === 'NIGHT_MODE' && activeTab === 'QUIZ'} fireflies={14} style={{ display: 'flex', flexDirection: 'column', padding: '20px 32px 40px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: '40px', lineHeight: 1, color: 'var(--lh-gold-bright)', textShadow: '0 3px 0 rgba(0,0,0,0.6), 0 0 24px rgba(0,0,0,0.6)' }}>Little Hood</h1>
          <div className="lh-display" style={{ fontSize: '16px', color: 'var(--lh-cream)', textShadow: '0 1px 6px rgba(0,0,0,0.9)', marginTop: '4px' }}>บอร์ดเกมนิทานป่าลึก</div>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {renderTabs()}
          <button
            className="lh-tab"
            onClick={() => {
              if (window.confirm('คุณต้องการรีเซ็ตเกมและลบคะแนนทั้งหมด กลับไปเริ่มใหม่(LOBBY)หรือไม่?')) {
                socket?.emit('hostNewRound');
              }
            }}
            style={{ color: '#F4B3B3', fontFamily: 'inherit', fontWeight: 700 }}
          >
            ↺ รีเซ็ตเกม
          </button>
          <AdminSettingsButton onClick={() => setShowAdminModal(true)} />
        </div>
      </header>

      <main style={{ flex: 1, width: '100%' }}>
        {activeTab === 'LOBBY' && renderLobbyTab()}
        {activeTab === 'QUIZ' && renderQuizTab()}
      </main>

      <AdminControlModal 
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onAuthenticate={handleAuthenticate}
      />

      {playingIntro && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <YouTube 
            videoId="vb5Ue65N86o" 
            opts={{ 
              width: '100%', 
              height: '100%', 
              playerVars: { 
                autoplay: 1,
                controls: 0,
                rel: 0,
                modestbranding: 1,
                cc_load_policy: 1, // Force captions on
                cc_lang_pref: 'zz', // To a non-existent language
                hl: 'zz', // UI language
                iv_load_policy: 3
              } 
            }}
            onReady={(e) => {
              try {
                // Secondary fallback: Try to forcefully disable captions via API
                e.target.unloadModule('captions');
                e.target.unloadModule('cc');
              } catch (err) {}
            }}
            onEnd={() => {
              setPlayingIntro(false);
              setActiveTab('QUIZ');
              socket?.emit('hostStartGame');
            }}
            style={{ width: '100vw', height: '100vh', pointerEvents: 'none' }}
          />
          <button 
            onClick={() => {
              setPlayingIntro(false);
              setActiveTab('QUIZ');
              socket?.emit('hostStartGame');
            }}
            style={{
              position: 'absolute',
              bottom: '40px',
              right: '40px',
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.5)',
              borderRadius: '8px',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              fontSize: '16px'
            }}
          >
            ข้าม (Skip)
          </button>
        </div>
      )}
    </ForestScene>
  );
};

export default HostView;
