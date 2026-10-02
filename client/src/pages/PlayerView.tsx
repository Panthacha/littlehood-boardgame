import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Triangle, Square, Circle, Diamond, Eye, Shield, Skull, Target, Search } from 'lucide-react';

const roleData = {
  RED_RIDING_HOOD: { name: 'หนูน้อยหมวกแดง', hint: 'ฉันได้รับมอบหมายให้นำบางสิ่งไปยังปลายทาง แต่ระหว่างทางกลับพบทางเลือกที่ไม่ควรเลือก', skillName: 'ตรวจสอบคำใบ้บทบาท', icon: <Search /> },
  GRANDMA: { name: 'คุณยาย', hint: 'ฉันกลายเป็นเป้าหมายของผู้ที่ไม่ได้มีเจตนาดี', skillName: 'ปกป้องบ้าน 1 หลัง', icon: <Shield /> },
  WOLF: { name: 'หมาป่า', hint: 'ความผิดพลาดของคนอื่นคือช่องทางที่ทำให้แผนของฉันสำเร็จ', skillName: 'ขโมยคะแนน (100 คะแนน)', icon: <Skull /> },
  HUNTER: { name: 'นายพราน', hint: 'ก่อนที่ฉันจะพบใคร ฉันต้องรู้ก่อนว่า “กำลังตามหาอะไร”', skillName: 'โจมตีบ้าน 1 หลัง', icon: <Target /> },
  WOODCUTTER: { name: 'คนตัดไม้', hint: 'การตัดสินใจของฉันเกิดขึ้นจากสิ่งที่พบ ไม่ใช่จากคำขอของคนที่เกี่ยวข้อง', skillName: 'ค้นหาบ้านหมาป่า', icon: <Eye /> },
  WITCH: { name: 'แม่มด', hint: 'การพบฉันอาจเป็นจุดเริ่มต้นของความหวัง หรือจุดสิ้นสุดของทุกอย่าง', skillName: 'ใช้เวทมนตร์ (ช่วย หรือ ฆ่า)', icon: <Triangle /> }
};

const PlayerView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const houseId = parseInt(searchParams.get('house') || '0', 10);
  
  const { socket, session, connected } = useSocket();
  const [error, setError] = useState('');
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

    socket.emit('joinLobby', { eventSlug: sessionId || '', houseId }, (res) => {
      if (res.error) {
        setError(res.error);
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
  }, [socket, connected, sessionId, houseId]);

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
    return <div className="min-h-screen forest-bg p-6 text-center text-white">{error}</div>;
  }

  if (!session) {
    return <div className="min-h-screen forest-bg p-6 text-center text-white">กำลังโหลด...</div>;
  }

  const house = session.houses[houseId];
  if (!house) return <div className="min-h-screen forest-bg p-6">ไม่พบบ้าน</div>;

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
    const cardStyle = {
      background: 'rgba(10, 18, 11, 0.7)',
      border: '2px solid rgba(217, 174, 110, 0.3)',
      borderRadius: '24px',
      padding: '32px',
      textAlign: 'center' as const,
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(10px)',
      color: '#F6E8CD',
      width: '100%',
      maxWidth: '400px'
    };

    switch (session.state) {
      case 'LOBBY':
        return (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '28px', fontFamily: "'Cinzel', serif", marginBottom: '16px', color: '#D9AE6E' }}>รอผู้สอนเปิดเกม</h2>
            <p style={{ fontSize: '18px', opacity: 0.8 }}>คุณอยู่ในบ้านที่ {houseId}</p>
          </div>
        );
      
      case 'COUNTDOWN':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <h2 style={{ fontSize: '32px', color: 'white', fontWeight: 'bold', marginBottom: '24px', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>เตรียมพร้อม!</h2>
            <div style={{ fontSize: '80px', color: '#D9AE6E', fontWeight: 'bold', textShadow: '0 0 20px rgba(217,174,110,0.5)' }}>{countdown > 0 ? countdown : 'เริ่ม!'}</div>
          </div>
        );

      case 'QUESTION_OPEN':
        return (
          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{...cardStyle, padding: '24px'}}>
              <h2 style={{ fontSize: '24px', fontFamily: "'Cinzel', serif", color: '#D9AE6E', marginBottom: '8px' }}>ข้อที่ {session.currentQuestionIndex + 1}</h2>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: timeRemaining <= 10 ? '#ff4757' : '#4ade80', textShadow: '0 0 10px rgba(0,0,0,0.5)', marginBottom: '8px' }}>{timeRemaining} วินาที</div>
              <p style={{ fontSize: '16px', opacity: 0.8 }}>ดูโจทย์บนจอใหญ่ แล้วเลือกคำตอบ</p>
              
              {house.hasSubmitted && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(74, 222, 128, 0.2)', border: '1px solid #4ade80', borderRadius: '12px', color: '#4ade80', fontWeight: 'bold' }}>
                  ✅ ส่งคำตอบแล้ว รอเฉลย
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { key: 'ก', icon: <Triangle size={32} fill="currentColor" />, color: '#ff6b81', bg: 'rgba(255,107,129,0.15)' },
                { key: 'ข', icon: <Diamond size={32} fill="currentColor" />, color: '#7bed9f', bg: 'rgba(123,237,159,0.15)' },
                { key: 'ค', icon: <Circle size={32} fill="currentColor" />, color: '#70a1ff', bg: 'rgba(112,161,255,0.15)' },
                { key: 'ง', icon: <Square size={32} fill="currentColor" />, color: '#eccc68', bg: 'rgba(236,204,104,0.15)' }
              ].map(opt => {
                const isSelected = house.hasSubmitted && (house.selectedKey || selectedKey) === opt.key;
                const isDimmed = house.hasSubmitted && !isSelected;
                
                return (
                  <button 
                    key={opt.key}
                    onClick={() => handleSubmit(opt.key)}
                    disabled={house.hasSubmitted}
                    style={{
                      padding: '32px 0',
                      borderRadius: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      background: isSelected ? opt.color : opt.bg,
                      color: isSelected ? '#1a1a1a' : opt.color,
                      border: `2px solid ${opt.color}`,
                      opacity: isDimmed ? 0.3 : 1,
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: isSelected ? `0 0 20px ${opt.color}` : 'none',
                      transition: 'all 0.3s ease',
                      cursor: house.hasSubmitted ? 'default' : 'pointer'
                    }}
                  >
                    {opt.icon}
                    <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{opt.key}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'QUESTION_CLOSED':
        return (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '32px', fontFamily: "'Cinzel', serif", color: '#ff4757', marginBottom: '16px' }}>หมดเวลา</h2>
            <p style={{ fontSize: '18px', opacity: 0.8, marginBottom: '24px' }}>กำลังรอเฉลยบนจอใหญ่...</p>
            {house.hasSubmitted ? (
               <div style={{ padding: '16px', background: 'rgba(74, 222, 128, 0.2)', borderRadius: '12px', border: '1px solid #4ade80', color: '#4ade80', fontSize: '20px', fontWeight: 'bold' }}>
                 ส่งคำตอบแล้ว: {house.selectedKey || selectedKey}
               </div>
            ) : (
               <div style={{ padding: '16px', background: 'rgba(255, 71, 87, 0.2)', borderRadius: '12px', border: '1px solid #ff4757', color: '#ff4757', fontSize: '20px', fontWeight: 'bold' }}>
                 ไม่ได้ส่งคำตอบ
               </div>
            )}
          </div>
        );

      case 'REVEAL':
        return (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '24px', fontFamily: "'Cinzel', serif", color: '#D9AE6E', marginBottom: '24px' }}>ผลการตอบข้อที่ {session.currentQuestionIndex + 1}</h2>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', marginBottom: '24px', textShadow: '0 0 15px rgba(255,255,255,0.3)' }}>
              คะแนนปัจจุบัน: {house.score}
            </div>
            <p style={{ fontSize: '16px', opacity: 0.6 }}>รอผู้สอนเริ่มกิจกรรมถัดไป...</p>
          </div>
        );

      case 'MID_SCOREBOARD':
        return (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '28px', fontFamily: "'Cinzel', serif", color: '#D9AE6E', marginBottom: '16px' }}>จบช่วง Pre-test</h2>
            <p style={{ fontSize: '18px', opacity: 0.8, marginBottom: '24px' }}>ดูสรุปคะแนนครึ่งแรกบนจอใหญ่เลยครับ!</p>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '24px', textShadow: '0 0 15px rgba(255,255,255,0.3)' }}>
              คะแนนของคุณ: {house.score}
            </div>
          </div>
        );

      case 'POST_VIDEO':
        return (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '28px', fontFamily: "'Cinzel', serif", color: '#D9AE6E', marginBottom: '16px' }}>ช่วงคลิปบทเรียน 🎬</h2>
            <p style={{ fontSize: '18px', opacity: 0.8, marginBottom: '24px' }}>กรุณาตั้งใจดูและฟังคลิปบทเรียนบนจอใหญ่นะครับ เดี๋ยวเราจะมีแบบทดสอบ Post-test ท้ายบทเรียน!</p>
          </div>
        );

      case 'NIGHT_MODE':
        if (session.awakeHouseId !== houseId) {
          return (
            <div style={{ ...cardStyle, background: 'rgba(17, 17, 17, 0.9)', border: '1px solid #333' }}>
              <h2 style={{ fontSize: '28px', color: '#aaa', marginBottom: '16px' }}>คืนนี้จงหลับตา...</h2>
              <p style={{ opacity: 0.5, color: '#fff' }}>รอฟังเสียงจากผู้ควบคุมเกม</p>
            </div>
          );
        }

        const roleInfo = roleData[house.role as keyof typeof roleData];
        if (!roleInfo) return null;

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
                    ระบบสุ่มผู้ต้องสงสัยมาให้ 3 หลัง มี 1 หลังเป็น <strong>หมาป่า</strong> แน่นอน 🔍
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
                    const isDimmed = isOwnHouse || (house.role === 'WOODCUTTER' && !isSuspect);
                    
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
                        disabled={actionUsed || house.usedNightSkill || isOwnHouse || isDead}
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
                          cursor: (actionUsed || house.usedNightSkill || isOwnHouse || isDead) ? 'default' : 'pointer',
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

      case 'FINISHED':
        return (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '32px', fontFamily: "'Cinzel', serif", color: '#D9AE6E', marginBottom: '24px' }}>ภารกิจเสร็จสิ้น!</h2>
            <div style={{ padding: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', marginBottom: '12px' }}>คะแนนรวมทั้งหมด: <strong style={{color: '#fff', fontSize: '28px'}}>{house.score}</strong></div>
              <div style={{ fontSize: '18px' }}>ตอบถูกรวม: <strong style={{color: '#4ade80'}}>{house.correctAnswers} / 10</strong> ข้อ</div>
            </div>
            <p style={{ fontSize: '16px', opacity: 0.8 }}>ขอบคุณที่ร่วมออกเดินทาง<br/>รอผู้สอนประกาศผลบนจอใหญ่</p>
          </div>
        );
      
      default:
        return <div style={{ color: 'white', fontSize: '20px' }}>กำลังโหลด...</div>;
    }
  };

  const isNightMode = session.state === 'NIGHT_MODE';

  return (
    <div className="min-h-screen" style={isNightMode ? {
      backgroundImage: 'url(/village-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'bottom',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px',
      position: 'relative'
    } : {}} >
      {/* Background layer for non-night mode */}
      {!isNightMode && <div className="forest-bg" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} />}
      
      {!isNightMode && (
        <div className="w-full flex justify-between items-center mb-6 px-4" style={{ zIndex: 1 }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(217, 174, 110, 0.25) 0%, rgba(30, 48, 38, 0.6) 100%)',
            border: '2px solid rgba(217, 174, 110, 0.5)',
            padding: '16px 28px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '180px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.5), inset 0 0 15px rgba(217, 174, 110, 0.15)'
          }}>
            <span style={{ 
              color: '#D9AE6E', 
              fontFamily: "'Cinzel', serif", 
              fontWeight: 'bold', 
              fontSize: '28px',
              textShadow: '0 0 12px rgba(217, 174, 110, 0.6)',
              letterSpacing: '0.05em',
              lineHeight: 1.2
            }}>
              บ้านที่ {houseId}
            </span>
            <span style={{ color: '#F6E8CD', opacity: 0.9, fontSize: '16px', marginTop: '4px', fontWeight: 'bold', letterSpacing: '0.05em' }}>ผู้เข้าแข่งขัน</span>
          </div>

          <div style={{ 
            background: 'linear-gradient(135deg, rgba(217, 174, 110, 0.25) 0%, rgba(30, 48, 38, 0.6) 100%)',
            border: '2px solid rgba(217, 174, 110, 0.5)',
            padding: '16px 28px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '180px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.5), inset 0 0 15px rgba(217, 174, 110, 0.15)'
          }}>
            <span style={{ 
              color: '#D9AE6E', 
              fontFamily: "'Cinzel', serif", 
              fontWeight: 'bold', 
              fontSize: '16px',
              textShadow: '0 0 12px rgba(217, 174, 110, 0.6)',
              letterSpacing: '0.1em'
            }}>SCORE</span>
            <span style={{ color: '#fff', fontSize: '36px', fontWeight: 'bold', marginTop: '2px', textShadow: '0 4px 8px rgba(0,0,0,0.8)', lineHeight: 1 }}>
              {house.score}
            </span>
          </div>
        </div>
      )}
      
      <div style={{ zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default PlayerView;
