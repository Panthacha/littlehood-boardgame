import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Triangle, Square, Circle, Diamond } from 'lucide-react';

const PlayerView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const houseId = parseInt(searchParams.get('house') || '0', 10);
  
  const { socket, session, connected } = useSocket();
  const [error, setError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

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

      case 'FINISHED':
        return (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '32px', fontFamily: "'Cinzel', serif", color: '#D9AE6E', marginBottom: '24px' }}>ภารกิจเสร็จสิ้น!</h2>
            <div style={{ padding: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', marginBottom: '12px' }}>คะแนนรวม: <strong style={{color: '#fff', fontSize: '28px'}}>{house.score}</strong></div>
              <div style={{ fontSize: '18px' }}>ตอบถูก: <strong style={{color: '#4ade80'}}>{house.correctAnswers} / 5</strong> ข้อ</div>
            </div>
            <p style={{ fontSize: '16px', opacity: 0.8 }}>ขอบคุณที่ร่วมออกเดินทาง<br/>รอผู้สอนประกาศผลบนจอใหญ่</p>
          </div>
        );
      
      default:
        return <div style={{ color: 'white', fontSize: '20px' }}>กำลังโหลด...</div>;
    }
  };

  return (
    <div className="min-h-screen forest-bg p-4 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6 px-4">
        <div className="flex flex-col">
          <span className="text-gold font-bold text-xl">บ้านที่ {houseId}</span>
          <span className="text-white opacity-70 text-sm">ผู้เข้าแข่งขัน</span>
        </div>
        <div style={{ 
          background: 'rgba(217, 174, 110, 0.15)', 
          border: '1px solid rgba(217, 174, 110, 0.4)', 
          padding: '8px 16px', 
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <span className="text-gold text-xs font-bold tracking-wider mb-1">SCORE</span>
          <span className="text-white font-bold text-2xl" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {house.score}
          </span>
        </div>
      </div>
      
      {renderContent()}
    </div>
  );
};

export default PlayerView;
