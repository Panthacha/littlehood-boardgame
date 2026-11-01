import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { nightNews, gameOutcome } from '../utils/nightRecap';
import { ForestScene } from '../theme/Forest';
import { getDeviceId } from '../utils/deviceId';
import { Triangle, Square, Circle, Diamond, Eye, Shield, Skull, Target, Search } from 'lucide-react';
import Part1 from './parts/Part1';
import Part2 from './parts/Part2';
import Part3 from './parts/Part3';
import Part4 from './parts/Part4';
import Part5 from './parts/Part5';

const roleData = {
  RED_RIDING_HOOD: { name: 'หนูน้อยหมวกแดง', hint: 'ฉันได้รับมอบหมายให้นำบางสิ่งไปยังปลายทาง แต่ระหว่างทางกลับพบทางเลือกที่ไม่ควรเลือก', skillName: 'ตรวจสอบคำใบ้บทบาท', icon: <Search /> },
  GRANDMA: { name: 'คุณยาย', hint: 'ฉันกลายเป็นเป้าหมายของผู้ที่ไม่ได้มีเจตนาดี', skillName: 'ปกป้องบ้าน 1 หลัง', icon: <Shield /> },
  WOLF: { name: 'หมาป่า', hint: 'ความผิดพลาดของคนอื่นคือช่องทางที่ทำให้แผนของฉันสำเร็จ', skillName: 'ขโมยคะแนน (100 คะแนน)', icon: <Skull /> },
  HUNTER: { name: 'นายพราน', hint: 'ก่อนที่ฉันจะพบใคร ฉันต้องรู้ก่อนว่า “กำลังตามหาอะไร”', skillName: 'โจมตีบ้าน 1 หลัง', icon: <Target /> },
  WOODCUTTER: { name: 'คนตัดไม้', hint: 'การตัดสินใจของฉันเกิดขึ้นจากสิ่งที่พบ ไม่ใช่จากคำขอของคนที่เกี่ยวข้อง', skillName: 'ค้นหาบ้านหมาป่า', icon: <Eye /> },
  WITCH: { name: 'แม่มด', hint: 'การพบฉันอาจเป็นจุดเริ่มต้นของความหวัง หรือจุดสิ้นสุดของทุกอย่าง', skillName: 'ใช้เวทมนตร์ (ช่วย หรือ ฆ่า)', icon: <Triangle /> }
};

// Parchment card for the simple waiting/result states. Defined at module level
// so it isn't remounted (and its page-turn animation replayed) on every update.
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="lh-parchment lh-flip" style={{ padding: '30px 24px', textAlign: 'center', width: '100%', maxWidth: '400px' }}>{children}</div>
);

const PlayerView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const houseId = parseInt(searchParams.get('house') || '0', 10);
  // character card scanned on the join page (decides the night role)
  const cardParam = parseInt(searchParams.get('card') || '', 10);
  const card = cardParam >= 1 && cardParam <= 6 ? cardParam : undefined;
  
  const { socket, session, connected } = useSocket();
  const [error, setError] = useState('');
  // true once the server accepted this tab into the house; used to notice
  // when it's later removed (teacher pressed "ปล่อยบ้าน", or this browser
  // entered another house in another tab — tabs share one device id)
  const [joined, setJoined] = useState(false);
  const [rejoinTick, setRejoinTick] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // New states for Night Mode redesign
  const [witchAction, setWitchAction] = useState<'protect' | 'attack' | null>(null);
  const [showHint, setShowHint] = useState<{ targetId: number; hint: string } | null>(null);
  const [hintCountdown, setHintCountdown] = useState(0);
  const [wolfEarned, setWolfEarned] = useState(false);
  const [actionUsed, setActionUsed] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);

  useEffect(() => {
    if (!socket || !connected || !houseId) return;

    setJoined(false);
    socket.emit('joinLobby', { eventSlug: sessionId || '', houseId, deviceId: getDeviceId(), card }, (res) => {
      if (res.error) {
        setError(res.error);
      } else {
        setError('');
        setJoined(true);
      }
    });

    const onTimeUpdate = (data: { timeRemaining: number }) => setTimeRemaining(data.timeRemaining);
    const onCountdown = (data: { countdown: number }) => setCountdown(data.countdown);

    socket.on('timeUpdate', onTimeUpdate);
    socket.on('countdownUpdate', onCountdown);

    return () => {
      socket.off('timeUpdate', onTimeUpdate);
      socket.off('countdownUpdate', onCountdown);
    };
  }, [socket, connected, sessionId, houseId, card, rejoinTick]);

  // Night Mode now repeats after every Part — clear last round's local UI state
  // so the house can act again in the new round.
  const nightRound = session?.state === 'NIGHT_MODE' ? session.lastCompletedPart : undefined;
  const currentNight = session?.lastCompletedPart || 1;
  useEffect(() => {
    if (nightRound === undefined) return;
    setWitchAction(null);
    setShowHint(null);
    setHintCountdown(0);
    setWolfEarned(false);
    setActionUsed(false);
    setSelectedTarget(null);
  }, [nightRound]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showHint && hintCountdown > 0) {
      timer = setTimeout(() => {
        setHintCountdown(prev => prev - 1);
      }, 1000);
    } else if (showHint && hintCountdown === 0) {
      // Auto-close hint when time is up
      setShowHint(null);
      setActionUsed(true); // Lock the action
    }
    return () => clearTimeout(timer);
  }, [showHint, hintCountdown]);

  if (error) {
    const taken = error === 'TAKEN' || error === 'ALREADY_IN_OTHER_HOUSE' || error === 'CARD_USED';
    return (
      <ForestScene image="/village-bg.jpg">
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <Card>
            <img src={`/houses/${houseId}.png`} alt="" className="lh-house is-dark" style={{ width: '170px', margin: '-24px auto -34px' }} />
            <h2 className="lh-display" style={{ fontSize: '24px', margin: '0 0 10px' }}>
              {error === 'TAKEN' ? `บ้านที่ ${houseId} มีคนเข้าแล้ว` : error === 'CARD_USED' ? 'การ์ดนี้ถูกใช้ที่บ้านอื่นแล้ว' : taken ? 'เครื่องนี้อยู่บ้านอื่นแล้ว' : 'เข้าบ้านไม่ได้'}
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--lh-ink-soft)', marginBottom: '18px' }}>
              {taken ? 'แต่ละบ้านเข้าได้ 1 เครื่องเท่านั้น ถ้าเป็นบ้านของกลุ่มคุณจริง ให้ผู้สอนกด "ปล่อยบ้าน" ในหน้า Admin' : error}
            </p>
            <a href={`/join/${sessionId || 'LITTLEHOOD'}`} className="lh-sign" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>กลับไปเลือกบ้าน</a>
          </Card>
        </div>
      </ForestScene>
    );
  }

  if (!session) {
    return <div className="min-h-screen forest-bg p-6 text-center text-white">กำลังโหลด...</div>;
  }

  const house = session.houses[houseId];
  if (!house) return <div className="min-h-screen forest-bg p-6">ไม่พบบ้าน</div>;

  const removed = joined && !!socket?.id && !house.players.some(p => p.socketId === socket.id);
  if (removed) {
    return (
      <ForestScene image="/village-bg.jpg">
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <Card>
            <img src={`/houses/${houseId}.png`} alt="" className="lh-house is-dark" style={{ width: '170px', margin: '-24px auto -34px' }} />
            <h2 className="lh-display" style={{ fontSize: '24px', margin: '0 0 10px' }}>เครื่องนี้ออกจากบ้านที่ {houseId} แล้ว</h2>
            <p style={{ fontSize: '15px', color: 'var(--lh-ink-soft)', marginBottom: '18px', lineHeight: 1.6 }}>
              ผู้สอนกด "ปล่อยบ้าน" หรือเบราว์เซอร์นี้เปิดเข้าบ้านอื่นในอีกแท็บ (1 เครื่องอยู่ได้ 1 บ้าน)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              <button className="lh-sign" onClick={() => setRejoinTick(t => t + 1)}>เข้าบ้านที่ {houseId} อีกครั้ง</button>
              <a href={`/join/${sessionId || 'LITTLEHOOD'}`} className="lh-sign lh-sign--quiet" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>เลือกบ้านใหม่</a>
            </div>
          </Card>
        </div>
      </ForestScene>
    );
  }

  const handleSubmit = (key: string) => {
    if (session.state !== 'QUESTION_OPEN' || house.hasSubmitted) return;
    setSelectedKey(key);
    socket?.emit('submitAnswer', { sessionId: session.id, houseId, key }, (res) => {
      if (res.error) {
        console.error(res.error);
      }
    });
  };

  const renderContent = () => {
    // Parchment card used by the simple waiting/result states
    const cardStyle: React.CSSProperties = { padding: '30px 24px', textAlign: 'center', width: '100%', maxWidth: '400px' };
    const kicker = (t: string) => <div className="lh-kicker" style={{ marginBottom: '6px' }}>{t}</div>;
    const title = (t: React.ReactNode) => <h2 className="lh-display" style={{ fontSize: '26px', margin: '0 0 10px', lineHeight: 1.3 }}>{t}</h2>;

    switch (session.state) {
      case 'LOBBY':
        return (
          <Card>
            <img src={`/houses/${houseId}.png`} alt="" className="lh-house is-lit" style={{ width: '190px', margin: '-30px auto -40px' }} />
            {kicker('Little Hood')}
            {title('รอผู้สอนเปิดเกม')}
            <p className="lh-breathe" style={{ fontSize: '16px', color: 'var(--lh-ink-soft)' }}>บ้านที่ {houseId} จุดตะเกียงรอแล้ว…</p>
          </Card>
        );

      case 'COUNTDOWN':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '55vh', gap: '12px' }}>
            <h2 className="lh-display" style={{ fontSize: '30px', color: 'var(--lh-cream)', textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>เตรียมพร้อม!</h2>
            <span key={countdown} className="lh-seal lh-pop" style={{ width: '150px', height: '150px', fontSize: countdown > 0 ? '72px' : '34px', fontFamily: countdown > 0 ? "'Cinzel', serif" : 'var(--lh-display)', fontWeight: countdown > 0 ? 700 : 400 }}>
              {countdown > 0 ? countdown : 'เริ่ม!'}
            </span>
          </div>
        );

      case 'QUESTION_OPEN': {
        const urgent = timeRemaining <= 10;
        return (
          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div className="lh-parchment lh-flip" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                {kicker(`${session.testPhase === 'POST' ? 'Posttest' : 'Pre-test'} · ข้อ ${session.currentQuestionIndex + 1} / 5`)}
                <div style={{ fontSize: '15px', color: 'var(--lh-ink-soft)' }}>ดูโจทย์บนจอใหญ่ แล้วเลือกคำตอบ</div>
              </div>
              <span key={timeRemaining} className={urgent ? 'lh-pop' : ''} style={{ fontFamily: "'Cinzel', serif", fontSize: '34px', fontWeight: 700, color: urgent ? 'var(--lh-hood)' : 'var(--lh-ink)', minWidth: '56px', textAlign: 'right' }}>{timeRemaining}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px' }}>
              {[
                { key: 'ก', icon: <Triangle size={30} fill="currentColor" />, color: '#A8233A', dark: '#5A0E1A' },
                { key: 'ข', icon: <Diamond size={30} fill="currentColor" />, color: '#2F6B3A', dark: '#163A1C' },
                { key: 'ค', icon: <Circle size={30} fill="currentColor" />, color: '#2C4F8A', dark: '#14284A' },
                { key: 'ง', icon: <Square size={30} fill="currentColor" />, color: '#B07A1E', dark: '#5A3C0A' }
              ].map(opt => {
                const isSelected = house.hasSubmitted && (house.selectedKey || selectedKey) === opt.key;
                const isDimmed = house.hasSubmitted && !isSelected;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSubmit(opt.key)}
                    disabled={house.hasSubmitted}
                    aria-label={`ตอบข้อ ${opt.key}`}
                    className={isSelected ? 'lh-pop' : ''}
                    style={{
                      aspectRatio: '1 / 1', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                      background: `radial-gradient(circle at 35% 30%, ${opt.color}, ${opt.dark} 78%)`,
                      color: '#FBEBD2', border: `4px solid ${isSelected ? 'var(--lh-gold-bright)' : 'rgba(0,0,0,0.35)'}`,
                      boxShadow: isSelected ? '0 0 0 6px rgba(243,213,138,0.35), 0 0 36px rgba(243,213,138,0.7)' : '0 8px 0 rgba(0,0,0,0.45), inset 0 0 0 6px rgba(255,255,255,0.08)',
                      opacity: isDimmed ? 0.3 : 1, filter: isDimmed ? 'grayscale(0.6)' : 'none',
                      cursor: house.hasSubmitted ? 'default' : 'pointer', transition: 'opacity 0.3s, transform 0.1s'
                    }}
                  >
                    {opt.icon}
                    <span className="lh-display" style={{ fontSize: '30px', lineHeight: 1 }}>{opt.key}</span>
                  </button>
                );
              })}
            </div>
            {house.hasSubmitted && (
              <div className="lh-plaque lh-rise" style={{ alignSelf: 'center', padding: '8px 18px' }}>
                <span className="lh-display" style={{ fontSize: '16px' }}>ส่งคำตอบแล้ว — รอเฉลยบนจอใหญ่</span>
              </div>
            )}
          </div>
        );
      }

      case 'QUESTION_CLOSED':
        return (
          <Card>
            {kicker(`ภารกิจที่ ${session.currentQuestionIndex + 1}`)}
            {title('หมดเวลา!')}
            <p style={{ fontSize: '16px', color: 'var(--lh-ink-soft)', marginBottom: '18px' }}>กำลังรอเฉลยบนจอใหญ่…</p>
            {house.hasSubmitted ? (
              <div className="lh-stamp lh-display" style={{ display: 'inline-block', padding: '6px 18px', border: '3px double #2F6B3A', borderRadius: '8px', color: '#2F6B3A', fontSize: '20px' }}>
                ตอบ {house.selectedKey || selectedKey}
              </div>
            ) : (
              <div className="lh-stamp lh-display" style={{ display: 'inline-block', padding: '6px 18px', border: '3px double var(--lh-hood)', borderRadius: '8px', color: 'var(--lh-hood)', fontSize: '20px' }}>
                ไม่ได้ส่งคำตอบ
              </div>
            )}
          </Card>
        );

      case 'REVEAL':
        return (
          <Card>
            {kicker(`เฉลยภารกิจที่ ${session.currentQuestionIndex + 1}`)}
            {title('ดูเฉลยบนจอใหญ่')}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', margin: '6px 0 14px' }}>
              <span className="lh-coin" style={{ width: '30px', height: '30px' }} />
              <span key={house.score} className="lh-pop" style={{ fontFamily: "'Cinzel', serif", fontSize: '40px', fontWeight: 700 }}>{house.score}</span>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--lh-ink-soft)' }}>รอผู้สอนเริ่มกิจกรรมถัดไป…</p>
          </Card>
        );

      case 'MID_SCOREBOARD':
        return (
          <Card>
            {kicker('จบช่วง Pre-test')}
            {title('ดูอันดับบนจอใหญ่!')}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', margin: '6px 0' }}>
              <span className="lh-coin" style={{ width: '30px', height: '30px' }} />
              <span className="lh-pop" style={{ fontFamily: "'Cinzel', serif", fontSize: '40px', fontWeight: 700 }}>{house.score}</span>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--lh-ink-soft)' }}>ต่อไป: Part 1 ห้องแล็บบอร์ดเกม</p>
          </Card>
        );

      case 'PART_1':
      case 'PART_2':
      case 'PART_3':
      case 'PART_4':
      case 'PART_5': {
        const PartView = { PART_1: Part1, PART_2: Part2, PART_3: Part3, PART_4: Part4, PART_5: Part5 }[session.state];
        return (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <PartView key={session.state} houseId={houseId} />
          </div>
        );
      }

      case 'NIGHT_MODE':
        if (session.awakeHouseId !== houseId) {
          return (
            <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center', paddingTop: '34vh' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '13px', letterSpacing: '0.35em', color: '#9FB4E0' }}>NIGHT {['I', 'II', 'III', 'IV', 'V'][currentNight - 1]}</div>
              <h2 className="lh-display lh-breathe" style={{ fontSize: '30px', color: '#E8EEFF', textShadow: '0 0 30px rgba(160,190,255,0.5)' }}>คืนที่ {currentNight} — จงหลับตา…</h2>
              <p style={{ color: 'rgba(214,225,245,0.7)', fontSize: '15px' }}>ฟังเสียงผู้ควบคุมเกม เมื่อถึงตาบ้านของคุณ หน้าจอจะสว่างขึ้น</p>
              {currentNight > 1 && (
                <div className="lh-parchment lh-rise" style={{ marginTop: '12px', width: '100%', textAlign: 'left', padding: '16px 18px', opacity: 0.92, animationDelay: '1.2s' }}>
                  <div className="lh-display" style={{ fontSize: '16px', color: 'var(--lh-hood)', marginBottom: '6px' }}>ข่าวจากคืนที่ {currentNight - 1}</div>
                  {nightNews(session, currentNight - 1).map((line, i) => <div key={i} style={{ padding: '2px 0', fontSize: '15px' }}>{line}</div>)}
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(122,85,48,0.4)', fontSize: '15px', fontWeight: 'bold' }}>
                    บ้านของคุณ: {house.isDead ? '☠️ ล้มลงแล้ว' : (house.injuries ? '❤️‍🩹 บาดเจ็บ 1 ครั้ง' : '❤️ ปลอดภัยดี')}
                  </div>
                </div>
              )}
            </div>
          );
        }

        const roleInfo = roleData[house.role as keyof typeof roleData];
        if (!roleInfo) return null;
        // Grandma can't guard the same house two nights in a row (server enforces it too).
        const grandmaBlocked = house.role === 'GRANDMA'
          ? session.nightLog?.find(e => e.night === currentNight - 1 && e.actorHouseId === houseId && e.effect === 'PROTECT')?.targetHouseId
          : undefined;

        return (
          <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* Wooden Sign Header */}
            <div style={{
              backgroundColor: '#613F22',
              backgroundImage: 'linear-gradient(to bottom, #7A5333, #4E311A)',
              border: '6px solid #362211',
              borderRadius: '24px',
              padding: '24px 60px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.6), inset 0 2px 5px rgba(255,255,255,0.2)',
              textAlign: 'center',
              marginBottom: '60px',
              position: 'relative',
              zIndex: 10
            }}>
              {/* Wooden Sign Straps */}
              <div style={{ position: 'absolute', top: '-15px', left: '30px', width: '16px', height: '35px', background: 'linear-gradient(to right, #8B6B4C, #C3A37C, #8B6B4C)', borderRadius: '4px', border: '3px solid #2B1B0D', zIndex: -1, boxShadow: '0 4px 8px rgba(0,0,0,0.5)' }}></div>
              <div style={{ position: 'absolute', top: '-15px', right: '30px', width: '16px', height: '35px', background: 'linear-gradient(to right, #8B6B4C, #C3A37C, #8B6B4C)', borderRadius: '4px', border: '3px solid #2B1B0D', zIndex: -1, boxShadow: '0 4px 8px rgba(0,0,0,0.5)' }}></div>
              
              <h1 style={{ fontSize: '48px', color: '#FDF1E1', textShadow: '2px 4px 6px rgba(0,0,0,0.9)', margin: 0, fontWeight: '900', letterSpacing: '1px' }}>
                {roleInfo.icon} คุณคือ{roleInfo.name}
              </h1>
              <p style={{ fontSize: '24px', color: '#F3D2A4', textShadow: '1px 2px 4px rgba(0,0,0,0.9)', marginTop: '12px', fontWeight: 'bold' }}>
                {house.role === 'WITCH' && !witchAction 
                  ? 'คุณเลือกที่จะทำอะไรในคืนนี้' 
                  : (house.role === 'WOODCUTTER' 
                      ? 'คุณเลือกที่จะสำรวจความจริง' 
                      : `คุณเลือกที่จะ${witchAction === 'protect' || house.role === 'GRANDMA' ? 'ปกป้อง' : (witchAction === 'attack' || house.role === 'HUNTER' ? 'โจมตี' : 'ใช้ทักษะกับ')}บ้านหลังไหน`)}
              </p>
            </div>

            {(house.usedNightSkill || actionUsed) && !showHint && !wolfEarned ? (
              <div style={{ padding: '24px', background: 'rgba(0,0,0,0.7)', borderRadius: '16px', color: '#fff', fontSize: '24px', border: '2px solid #555' }}>
                คุณใช้ทักษะไปแล้วในคืนนี้ ให้หลับตาลง...
              </div>
            ) : house.role === 'WITCH' && !witchAction ? (
              <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
                <button 
                  style={{ padding: '24px 48px', background: 'linear-gradient(to bottom, #4ade80, #22c55e)', color: '#000', borderRadius: '20px', fontWeight: 'bold', fontSize: '28px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.5)', border: '4px solid #166534' }}
                  onClick={() => setWitchAction('protect')}
                >
                  🧪 ช่วย (ปกป้อง)
                </button>
                <button 
                  style={{ padding: '24px 48px', background: 'linear-gradient(to bottom, #ff4757, #e84118)', color: '#fff', borderRadius: '20px', fontWeight: 'bold', fontSize: '28px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.5)', border: '4px solid #7f1d1d' }}
                  onClick={() => setWitchAction('attack')}
                >
                  ☠️ ฆ่า (โจมตี)
                </button>
              </div>
            ) : showHint ? (
              <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.85)', padding: '40px 32px', borderRadius: '24px', border: '4px solid #D9AE6E', boxShadow: '0 0 40px rgba(217,174,110,0.3)' }}>
                <h3 style={{ fontSize: '28px', color: '#D9AE6E', marginBottom: '24px' }}>คำใบ้บทบาทของบ้านที่ {showHint.targetId}</h3>
                <p style={{ fontSize: '28px', color: '#fff', fontStyle: 'italic', marginBottom: '40px' }}>"{showHint.hint}"</p>
                <div style={{ fontSize: '80px', color: '#ff4757', fontWeight: 'bold', textShadow: '0 0 30px rgba(255,71,87,0.8)' }}>{hintCountdown}</div>
                <p style={{ color: '#ccc', marginTop: '24px', fontSize: '18px' }}>กำลังปิดอัตโนมัติ...</p>
              </div>
            ) : (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {house.role === 'WITCH' && witchAction && (
                  <button 
                    style={{ padding: '12px 24px', background: 'rgba(0,0,0,0.6)', border: '2px solid #ccc', color: '#ccc', borderRadius: '12px', cursor: 'pointer', fontSize: '18px', marginBottom: '24px', fontWeight: 'bold' }}
                    onClick={() => setWitchAction(null)}
                  >
                    ↩ กลับไปเลือกพลังใหม่
                  </button>
                )}

                {house.role === 'WOODCUTTER' && house.woodcutterResult && (
                  <div style={{ background: 'rgba(0,0,0,0.7)', padding: '16px 24px', borderRadius: '16px', color: '#fff', marginBottom: '24px', fontSize: '20px', border: '1px solid #555' }}>
                    {currentNight === 1
                      ? <>ระบบสุ่มผู้ต้องสงสัยมาให้ {house.woodcutterResult.length} หลัง มี 1 หลังเป็น <strong>หมาป่า</strong> แน่นอน 🔍</>
                      : <>เบาะแสจากคืนก่อนช่วยตัดผู้บริสุทธิ์ออก เหลือผู้ต้องสงสัย {house.woodcutterResult.length} หลัง มี 1 หลังเป็น <strong>หมาป่า</strong> แน่นอน 🔍</>}
                  </div>
                )}
                
                {grandmaBlocked && (
                  <div style={{ background: 'rgba(0,0,0,0.7)', padding: '16px 24px', borderRadius: '16px', color: '#fff', marginBottom: '24px', fontSize: '20px', border: '1px solid #555' }}>
                    เมื่อคืนคุณปกป้องบ้านที่ {grandmaBlocked} ไปแล้ว คืนนี้ต้องเลือกบ้านอื่น 🛡️
                  </div>
                )}

                {wolfEarned && (
                  <div style={{ background: 'rgba(255, 215, 0, 0.9)', color: '#000', padding: '24px 40px', borderRadius: '24px', border: '4px solid #B8860B', textAlign: 'center', fontWeight: 'bold', fontSize: '36px', boxShadow: '0 0 40px rgba(255,215,0,0.6)', margin: '16px 0', zIndex: 50, position: 'absolute', top: '50%', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <img src="/icons/steal.png" alt="Steal" style={{ width: '80px', height: '80px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }} />
                    You Earn 100 Points!
                  </div>
                )}

                {/* Village Layout */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', maxWidth: '900px', paddingBottom: '100px', marginTop: '20px' }}>
                  {[1, 2, 3, 4, 5, 6].map(h => {
                    const isOwnHouse = h === houseId;
                    const isSuspect = house.role === 'WOODCUTTER' && house.woodcutterResult?.includes(h);
                    const isDimmed = isOwnHouse || (house.role === 'WOODCUTTER' && !isSuspect) || h === grandmaBlocked;
                    
                    const targetHouseData = session.houses[h];
                    const isProtected = targetHouseData?.isProtected;
                    const isDead = targetHouseData?.isDead;
                    const injuries = targetHouseData?.injuries || 0;

                    // Calculate staggered position
                    let translateY = '0px';
                    if (h === 2) translateY = '30px';
                    if (h === 4 || h === 6) translateY = '60px';
                    if (h === 5) translateY = '90px';
                    
                    return (
                      <button 
                        key={h}
                        disabled={actionUsed || house.usedNightSkill || isOwnHouse || isDead || h === grandmaBlocked}
                        onClick={() => {
                          if (house.role === 'WOODCUTTER') {
                            socket?.emit('useNightSkill', { houseId }, () => setActionUsed(true));
                            return;
                          }

                          setSelectedTarget(h);
                          const action = house.role === 'WITCH' ? witchAction! : undefined;
                          
                          socket?.emit('useNightSkill', { houseId, targetId: h, action }, (res: any) => {
                            if (house.role === 'RED_RIDING_HOOD') {
                              const targetRole = session.houses[h]?.role;
                              const targetHint = targetRole ? roleData[targetRole as keyof typeof roleData]?.hint : 'ไม่ทราบข้อมูล';
                              setShowHint({ targetId: h, hint: targetHint || 'ไม่ทราบข้อมูล' });
                              setHintCountdown(5);
                            } else if (house.role === 'WOLF') {
                              setWolfEarned(true);
                              setTimeout(() => setActionUsed(true), 2500); 
                            } else {
                              setTimeout(() => setActionUsed(true), 1500);
                            }
                          });
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: (actionUsed || house.usedNightSkill || isOwnHouse || isDead || h === grandmaBlocked) ? 'default' : 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          opacity: isDead ? 0.3 : ((actionUsed || house.usedNightSkill) && selectedTarget !== h ? 0.3 : (isDimmed ? 0.4 : 1)),
                          position: 'relative',
                          transform: `translateY(${translateY}) ${selectedTarget === h ? 'scale(1.15)' : 'scale(1)'}`,
                          width: '260px',
                          margin: '10px'
                        }}
                      >
                        {/* Hover/Active Glow Effect underneath */}
                        <div style={{
                          position: 'absolute',
                          top: '10%', left: '10%', right: '10%', bottom: '20%',
                          background: selectedTarget === h ? (witchAction === 'protect' || house.role === 'GRANDMA' ? 'rgba(74, 222, 128, 0.5)' : 'rgba(255, 71, 87, 0.5)') : 'transparent',
                          borderRadius: '50%',
                          filter: 'blur(30px)',
                          zIndex: -1,
                          transition: 'all 0.3s'
                        }} />

                        <img 
                          src={`/houses/${h}.png`} 
                          alt={`บ้าน ${h}`} 
                          style={{ 
                            width: '100%', 
                            height: '200px', 
                            objectFit: 'contain', 
                            filter: isDead ? 'grayscale(100%) brightness(50%)' : 'drop-shadow(0 20px 25px rgba(0,0,0,0.8))',
                          }} 
                        />
                        
                        {/* Status Badges on the House itself */}
                        <div style={{ position: 'absolute', top: '10px', display: 'flex', gap: '8px', zIndex: 15, fontSize: '32px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.8))' }}>
                          {isProtected && <img src="/icons/protect.png" alt="Protected" style={{ width: '40px', height: '40px' }} />}
                          {isDead ? '☠️' : (injuries === 1 ? '❤️🩹' : '')}
                        </div>

                        {/* House Label / Wooden Sign */}
                        <div style={{ 
                          background: 'linear-gradient(to bottom, #70441D, #4A2B11)', 
                          color: '#FFE0B2', 
                          border: '4px solid #2D1A0A', 
                          borderRadius: '12px', 
                          padding: '8px 24px', 
                          marginTop: '-25px', 
                          position: 'relative', 
                          zIndex: 2,
                          fontWeight: 'bold',
                          fontSize: '20px',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.8), inset 0 2px 5px rgba(255,255,255,0.2)',
                          textShadow: '1px 2px 3px rgba(0,0,0,0.8)'
                        }}>
                          บ้าน {h} {isOwnHouse && '(ของคุณ)'} {isSuspect && '🔍'}
                        </div>
                        
                        {/* Feedback Badges (Active selection) */}
                        {selectedTarget === h && (
                          <div style={{ position: 'absolute', top: '-20px', right: '0', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.9))', zIndex: 20, animation: 'bounce 0.5s ease' }}>
                            {(house.role === 'GRANDMA' || witchAction === 'protect') && <img src="/icons/protect.png" alt="Protect" style={{ width: '80px', height: '80px' }} />}
                            {(house.role === 'HUNTER' || witchAction === 'attack') && <img src="/icons/attack.png" alt="Attack" style={{ width: '80px', height: '80px' }} />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {house.role === 'WOODCUTTER' && (
                  <button 
                    style={{ marginTop: '40px', padding: '16px 48px', background: '#D9AE6E', color: '#000', borderRadius: '16px', fontWeight: 'bold', fontSize: '24px', cursor: 'pointer', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}
                    onClick={() => socket?.emit('useNightSkill', { houseId }, () => setActionUsed(true))}
                    disabled={actionUsed || house.usedNightSkill}
                  >
                    รับทราบและหลับตา
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 'FINISHED': {
        const outcome = gameOutcome(session);
        const isWolf = house.role === 'WOLF';
        const won = outcome ? (isWolf ? !outcome.villagersWin : outcome.villagersWin) : null;
        return (
          <Card>
            <img src={`/houses/${houseId}.png`} alt="" className="lh-house is-lit" style={{ width: '200px', margin: '-34px auto -44px' }} />
            {kicker(outcome ? (outcome.villagersWin ? 'ชาวบ้านชนะ' : 'หมาป่าชนะ') : 'ภารกิจเสร็จสิ้น')}
            {title(outcome ? outcome.title : 'ขอบคุณที่ร่วมออกเดินทาง')}
            {outcome && (
              <>
                <p style={{ fontSize: '15px', color: 'var(--lh-ink-soft)', lineHeight: 1.6, marginBottom: '10px' }}>{outcome.story}</p>
                <div className="lh-stamp lh-display" style={{ display: 'inline-block', margin: '4px 0 6px', padding: '4px 16px', borderRadius: '8px', fontSize: '18px', border: `3px double ${won ? '#2F6B3A' : 'var(--lh-hood)'}`, color: won ? '#2F6B3A' : 'var(--lh-hood)' }}>
                  {isWolf ? (won ? 'คุณคือหมาป่า — ชนะ!' : 'คุณคือหมาป่า — ถูกจับได้แล้ว') : (won ? 'ฝ่ายชาวบ้าน — ชนะ!' : 'ฝ่ายชาวบ้าน — แพ้')}
                </div>
                <p style={{ fontSize: '14px', color: 'var(--lh-ink-soft)' }}>หมาป่าคือบ้านที่ {outcome.wolfHouseId}</p>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', margin: '10px 0 16px' }}>
              <div><div style={{ fontSize: '13px', color: 'var(--lh-ink-soft)', fontWeight: 'bold' }}>เหรียญรวม</div><div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><span className="lh-coin" /><strong style={{ fontFamily: "'Cinzel', serif", fontSize: '30px' }}>{house.score}</strong></div></div>
              <div><div style={{ fontSize: '13px', color: 'var(--lh-ink-soft)', fontWeight: 'bold' }}>Pre → Post</div><strong style={{ fontFamily: "'Cinzel', serif", fontSize: '30px' }}>{house.correctAnswers} → {house.postCorrectAnswers || 0}</strong><span style={{ fontSize: '14px' }}> /5</span></div>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--lh-ink-soft)' }}>ขอบคุณที่ร่วมออกเดินทาง</p>
          </Card>
        );
      }

      default:
        return <div className="lh-display lh-breathe" style={{ color: 'var(--lh-gold-bright)', fontSize: '20px' }}>กำลังโหลด…</div>;
    }
  };

  const isNightMode = session.state === 'NIGHT_MODE';
  const awake = isNightMode && session.awakeHouseId === houseId;

  return (
    <ForestScene image="/village-bg.jpg" night={isNightMode && !awake} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0 24px' }}>
      {!isNightMode && (
        <div style={{ width: '100%', maxWidth: '640px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '0 16px', marginBottom: '22px' }}>
          <div className="lh-plaque">
            <img src={`/houses/${houseId}.png`} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', margin: '-8px 0' }} />
            <span className="lh-display" style={{ fontSize: '18px' }}>บ้านที่ {houseId}</span>
          </div>
          <div className="lh-plaque" style={{ padding: '6px 14px' }}>
            <span className="lh-coin" />
            <span key={house.score} className="lh-pop" style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '20px' }}>{house.score}</span>
          </div>
        </div>
      )}

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: isNightMode ? '0 16px' : '0 16px' }}>
        {renderContent()}
      </div>
    </ForestScene>
  );
};

export default PlayerView;
