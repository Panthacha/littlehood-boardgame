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
            <div style={{ ...cardStyle, background: '#111', border: '1px solid #333' }}>
              <h2 style={{ fontSize: '28px', color: '#555', marginBottom: '16px' }}>คืนนี้จงหลับตา...</h2>
              <p style={{ opacity: 0.5 }}>รอฟังเสียงจากผู้ควบคุมเกม</p>
            </div>
          );
        }

        const roleInfo = roleData[house.role as keyof typeof roleData];
        if (!roleInfo) return null;

        return (
          <div style={{ ...cardStyle, background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)', border: '2px solid #D9AE6E' }}>
            <h2 style={{ fontSize: '32px', fontFamily: "'Cinzel', serif", color: '#D9AE6E', marginBottom: '8px' }}>คุณลืมตาแล้ว</h2>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>บทบาท: {roleInfo.name}</div>
            <div style={{ padding: '16px', background: 'rgba(217, 174, 110, 0.1)', borderRadius: '12px', border: '1px solid rgba(217, 174, 110, 0.3)', marginBottom: '24px' }}>
              <strong style={{ color: '#D9AE6E' }}>คำใบ้ของคุณ:</strong>
              <p style={{ marginTop: '8px', fontStyle: 'italic', color: '#ccc' }}>"{roleInfo.hint}"</p>
            </div>
            
            {house.usedNightSkill ? (
              <div style={{ padding: '16px', background: 'rgba(74, 222, 128, 0.2)', borderRadius: '12px', color: '#4ade80', fontWeight: 'bold' }}>
                คุณใช้ทักษะไปแล้วในคืนนี้ ให้หลับตาลง...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '20px', color: '#D9AE6E' }}>ทักษะกลางคืน: {roleInfo.skillName}</h3>
                
                {house.role === 'WOODCUTTER' && house.woodcutterResult ? (
                  <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '12px' }}>
                    <p style={{ color: '#fff', marginBottom: '12px' }}>ระบบสุ่มบ้านผู้ต้องสงสัยมาให้ 3 หลัง มี 1 หลังในนี้เป็น <strong>หมาป่า</strong> แน่นอน:</p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      {house.woodcutterResult.map(h => (
                        <div key={h} style={{ fontSize: '24px', fontWeight: 'bold', color: '#D9AE6E', padding: '12px 20px', background: '#333', borderRadius: '8px' }}>
                          บ้าน {h}
                        </div>
                      ))}
                    </div>
                    <button 
                      style={{ marginTop: '16px', width: '100%', padding: '12px', background: '#D9AE6E', color: '#000', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => socket?.emit('useNightSkill', { houseId })}
                    >
                      รับทราบและหลับตา
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select 
                      id="targetSelect"
                      style={{ padding: '12px', borderRadius: '8px', background: '#333', color: '#fff', border: '1px solid #555', fontSize: '18px' }}
                    >
                      <option value="">-- เลือกบ้านเป้าหมาย --</option>
                      {[1, 2, 3, 4, 5, 6].filter(h => h !== houseId).map(h => (
                        <option key={h} value={h}>บ้านที่ {h}</option>
                      ))}
                    </select>
                    
                    {house.role === 'WITCH' ? (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          style={{ flex: 1, padding: '12px', background: '#4ade80', color: '#000', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                          onClick={() => {
                            const val = (document.getElementById('targetSelect') as HTMLSelectElement).value;
                            if (val) socket?.emit('useNightSkill', { houseId, targetId: parseInt(val), action: 'protect' });
                          }}
                        >
                          🧪 ช่วย (ปกป้อง)
                        </button>
                        <button 
                          style={{ flex: 1, padding: '12px', background: '#ff4757', color: '#fff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                          onClick={() => {
                            const val = (document.getElementById('targetSelect') as HTMLSelectElement).value;
                            if (val) socket?.emit('useNightSkill', { houseId, targetId: parseInt(val), action: 'attack' });
                          }}
                        >
                          ☠️ ฆ่า (โจมตี)
                        </button>
                      </div>
                    ) : (
                      <button 
                        style={{ padding: '12px', background: '#D9AE6E', color: '#000', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => {
                          const val = (document.getElementById('targetSelect') as HTMLSelectElement).value;
                          if (val) {
                            socket?.emit('useNightSkill', { houseId, targetId: parseInt(val) }, (res: any) => {
                               // For RED_RIDING_HOOD, we might want to alert the hint, but let's keep it simple: 
                               // the server currently doesn't return the hint in the callback.
                               // Let's just alert it from the session data!
                               if (house.role === 'RED_RIDING_HOOD') {
                                 const targetRole = session.houses[parseInt(val)].role;
                                 if (targetRole) {
                                   const targetHint = roleData[targetRole as keyof typeof roleData]?.hint;
                                   alert(`คำใบ้ของบ้านที่ ${val} คือ:\n"${targetHint}"`);
                                 }
                               }
                            });
                          }
                        }}
                      >
                        ยืนยันการใช้ทักษะ
                      </button>
                    )}
                  </div>
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

  return (
    <div className="min-h-screen forest-bg p-4 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6 px-4">
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
      
      {renderContent()}
    </div>
  );
};

export default PlayerView;
