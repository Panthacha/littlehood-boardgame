import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { AdminSettingsButton } from '../components/AdminSettingsButton';
import { AdminControlModal } from '../components/AdminControlModal';
import { QRCodeSVG } from 'qrcode.react';
import type { Question } from '../types';
import { getCharacter } from '../constants/characters';
import YouTube from 'react-youtube';

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

  if (!connected || !session) {
    return <div className="min-h-screen forest-bg p-6 text-white text-center">กำลังโหลด...</div>;
  }

  const renderTabs = () => (
    <div className="tab-bar">
      <button 
        className={`tab-item ${activeTab === 'LOBBY' ? 'active' : ''}`}
        onClick={() => setActiveTab('LOBBY')}
      >
        ผู้เข้าร่วม
      </button>
      <button 
        className={`tab-item ${activeTab === 'QUIZ' ? 'active' : ''}`}
        onClick={() => setActiveTab('QUIZ')}
      >
        เริ่มภารกิจ
      </button>
    </div>
  );

  const renderLobbyTab = () => {
    const readyHousesCount = Object.values(session.houses).filter(h => h.isOnline).length;
    
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '0 20px',
        animation: 'fadeIn 0.5s ease'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
          {/* Subtle magical glow behind title */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200%', height: '100%', background: 'radial-gradient(ellipse at center, rgba(217, 174, 110, 0.15) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
          
          <h2 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '36px',
            color: '#F6E8CD',
            textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(217, 174, 110, 0.4)',
            marginBottom: '12px',
            position: 'relative',
            zIndex: 1
          }}>
            หมู่บ้านของเราพร้อมออกเดินทางหรือยัง?
          </h2>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(217, 174, 110, 0.3)',
            borderRadius: '20px',
            padding: '6px 20px',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: readyHousesCount === 6 ? '#4ade80' : '#facc15', boxShadow: `0 0 10px ${readyHousesCount === 6 ? '#4ade80' : '#facc15'}` }} />
            <p style={{ color: '#BCAF97', fontSize: '16px', letterSpacing: '0.05em', margin: 0 }}>
              พร้อมแล้ว <strong style={{ color: '#F6E8CD', fontSize: '18px' }}>{readyHousesCount}</strong> จาก 6 บ้าน
            </p>
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          width: '100%',
          marginBottom: '48px',
          position: 'relative',
          zIndex: 1
        }}>
          {Object.values(session.houses).map((house) => {
            const activePlayersCount = house.players.filter(p => p.isOnline).length;
            const isHouseActive = activePlayersCount > 0;
            return (
            <div key={house.houseId} style={{
              position: 'relative',
              borderRadius: '24px',
              padding: '24px',
              textAlign: 'center',
              border: `2px solid ${isHouseActive ? '#D9AE6E' : 'rgba(217, 174, 110, 0.2)'}`,
              boxShadow: isHouseActive ? '0 15px 35px rgba(0,0,0,0.6), inset 0 0 20px rgba(217, 174, 110, 0.3)' : '0 10px 25px rgba(0,0,0,0.5)',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: isHouseActive ? 'translateY(-8px)' : 'none',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '200px'
            }}>
              {/* Background Image with Blur & Darkening */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url('/houses/${house.houseId}.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: isHouseActive ? 'brightness(0.7)' : 'brightness(0.3) grayscale(0.8)',
                zIndex: 0,
                transition: 'all 0.4s ease'
              }} />
              
              {/* Gradient Overlay for Readability */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: isHouseActive 
                  ? 'linear-gradient(to top, rgba(15, 25, 20, 0.95) 0%, rgba(30, 48, 38, 0.3) 50%, rgba(30, 48, 38, 0.1) 100%)'
                  : 'rgba(10, 18, 11, 0.75)',
                zIndex: 1,
              }} />

              {/* Shine effect for online houses */}
              {isHouseActive && (
                <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)', transform: 'skewX(-20deg)', animation: 'shine 3s infinite', zIndex: 2 }} />
              )}
              
              <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '100%' }}>
                <h3 style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '22px',
                  fontWeight: 'bold',
                  color: isHouseActive ? '#F6E8CD' : 'rgba(246, 232, 205, 0.5)',
                  margin: '0 0 12px 0',
                  letterSpacing: '0.05em',
                  textShadow: '0 2px 8px rgba(0,0,0,1)'
                }}>
                  บ้านที่ {house.houseId}
                </h3>
                
                {isHouseActive ? (
                  <div style={{
                    display: 'inline-block',
                    background: 'rgba(74, 222, 128, 0.15)',
                    border: '1px solid rgba(74, 222, 128, 0.4)',
                    color: '#4ade80',
                    padding: '6px 16px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 0 15px rgba(74, 222, 128, 0.15)',
                    backdropFilter: 'blur(4px)'
                  }}>
                    เข้าร่วมแล้ว ({activePlayersCount} คน)
                  </div>
                ) : (
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '14px',
                    fontStyle: 'italic',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '4px 12px',
                    borderRadius: '8px'
                  }}>
                    รอผู้เข้าร่วม...
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
        
        <div style={{ width: '100%', maxWidth: '360px', marginBottom: '60px' }}>
          <button 
            style={{
              width: '100%',
              background: (session.state !== 'LOBBY' || readyHousesCount === 0) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #9D3543, #6D1E26)',
              color: (session.state !== 'LOBBY' || readyHousesCount === 0) ? 'rgba(255,255,255,0.3)' : '#F6E8CD',
              border: (session.state !== 'LOBBY' || readyHousesCount === 0) ? '1px solid rgba(255,255,255,0.1)' : '2px solid #D9AE6E',
              padding: '18px 32px',
              borderRadius: '16px',
              fontSize: '22px',
              fontWeight: 'bold',
              fontFamily: "'Noto Sans Thai', sans-serif",
              cursor: (session.state !== 'LOBBY' || readyHousesCount === 0) ? 'not-allowed' : 'pointer',
              boxShadow: (session.state !== 'LOBBY' || readyHousesCount === 0) ? 'none' : '0 8px 25px rgba(157, 53, 67, 0.5), inset 0 0 15px rgba(217, 174, 110, 0.3)',
              transition: 'all 0.3s',
              transform: (session.state !== 'LOBBY' || readyHousesCount === 0) ? 'none' : 'translateY(0)',
              letterSpacing: '0.05em'
            }}
            onMouseOver={(e) => {
              if (session.state === 'LOBBY' && readyHousesCount > 0) {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(157, 53, 67, 0.7), inset 0 0 20px rgba(217, 174, 110, 0.5)';
              }
            }}
            onMouseOut={(e) => {
              if (session.state === 'LOBBY' && readyHousesCount > 0) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(157, 53, 67, 0.5), inset 0 0 15px rgba(217, 174, 110, 0.3)';
              }
            }}
            onClick={() => {
              setPlayingIntro(true);
            }}
            disabled={session.state !== 'LOBBY' || readyHousesCount === 0}
          >
            เริ่มเกม
          </button>
        </div>
      </div>
    );
  };

  const renderQuizTab = () => {
    if (session.state === 'LOBBY') {
      return (
        <div style={{
          background: 'rgba(10, 18, 11, 0.7)',
          border: '2px solid rgba(217, 174, 110, 0.3)',
          borderRadius: '24px',
          padding: '60px 40px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '40px auto',
          boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ fontSize: '36px', fontFamily: "'Cinzel', serif", color: '#D9AE6E', marginBottom: '24px', fontWeight: 'bold' }}>เกมยังไม่เริ่ม</h2>
          <p style={{ fontSize: '20px', color: '#F6E8CD', marginBottom: '32px', opacity: 0.9 }}>กรุณากลับไปที่แท็บ "ผู้เข้าร่วม" เพื่อเริ่มเกม</p>
          <button 
            style={{
              background: 'linear-gradient(135deg, #1E392A, #2D5A27)',
              color: '#F6E8CD',
              border: '2px solid #4ade80',
              padding: '16px 32px',
              borderRadius: '16px',
              fontSize: '20px',
              fontWeight: 'bold',
              fontFamily: "'Noto Sans Thai', sans-serif",
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(45, 90, 39, 0.6), inset 0 0 15px rgba(74, 222, 128, 0.3)'
            }}
            onClick={() => setActiveTab('LOBBY')}
          >
            กลับไปห้องรอ
          </button>
        </div>
      );
    }

    if (session.state === 'COUNTDOWN') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <h2 style={{ fontSize: '48px', color: 'white', fontWeight: 'bold', marginBottom: '24px', textShadow: '0 4px 15px rgba(0,0,0,0.8)' }}>เตรียมพร้อม!</h2>
          <div style={{ fontSize: '120px', color: '#D9AE6E', fontWeight: 'bold', textShadow: '0 0 40px rgba(217,174,110,0.6)' }}>{countdown > 0 ? countdown : 'เริ่ม!'}</div>
        </div>
      );
    }

    if (session.state === 'MID_SCOREBOARD') {
       const sorted = Object.values(session.houses).sort((a, b) => b.score - a.score);
       return (
          <div style={{
            background: 'linear-gradient(145deg, rgba(30, 48, 38, 0.95), rgba(10, 18, 11, 0.98))',
            border: '2px solid #D9AE6E',
            borderRadius: '32px',
            padding: '48px',
            maxWidth: '800px',
            margin: '0 auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 30px rgba(217, 174, 110, 0.2)',
            backdropFilter: 'blur(15px)'
          }}>
            <h2 style={{ fontSize: '42px', fontFamily: "'Cinzel', serif", fontWeight: 'bold', textAlign: 'center', color: '#D9AE6E', marginBottom: '40px', textShadow: '0 4px 15px rgba(0,0,0,0.8)' }}>
              🏆 สรุปคะแนนครึ่งแรก (Pre-test)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sorted.map((h, i) => (
                <div key={h.houseId} style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '20px 32px', 
                  background: i === 0 ? 'linear-gradient(90deg, rgba(217, 174, 110, 0.3), rgba(217, 174, 110, 0.1))' : 'rgba(0,0,0,0.4)',
                  borderRadius: '16px', 
                  border: `1px solid ${i === 0 ? '#D9AE6E' : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: i === 0 ? '0 0 20px rgba(217, 174, 110, 0.2)' : 'none',
                  transform: i === 0 ? 'scale(1.02)' : 'none',
                  transition: 'all 0.3s'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: i === 0 ? '#D9AE6E' : '#F6E8CD' }}>
                    อันดับ {i + 1} - บ้านที่ {h.houseId} {i === 0 && '👑'}
                  </div>
                  <div style={{ fontSize: '20px', color: i === 0 ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                    <strong>{h.score}</strong> คะแนน (ตอบถูก {h.correctAnswers}/10)
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => socket?.emit('hostStartPostVideo')}
                style={{
                  background: 'linear-gradient(135deg, #D9AE6E, #B88645)',
                  color: '#1a1a1a',
                  border: 'none',
                  padding: '16px 40px',
                  borderRadius: '16px',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  fontFamily: "'Noto Sans Thai', sans-serif",
                  cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(217, 174, 110, 0.6)'
                }}
              >
                ดูคลิปบทเรียน (เข้าสู่ Post-test) ➡️
              </button>
            </div>
          </div>
       );
    }

    if (session.state === 'POST_VIDEO') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '1200px', 
            borderRadius: '24px', 
            overflow: 'hidden', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            border: '4px solid #D9AE6E',
            position: 'relative'
          }}>
            <video 
              src="/0929.mp4" 
              autoPlay 
              controls
              style={{ width: '100%', display: 'block' }}
            />
          </div>
          <button 
            onClick={() => socket?.emit('hostStartPostTest')}
            style={{
              marginTop: '40px',
              background: 'linear-gradient(135deg, #1E392A, #2D5A27)',
              color: '#F6E8CD',
              border: '2px solid #4ade80',
              padding: '16px 48px',
              borderRadius: '16px',
              fontSize: '24px',
              fontWeight: 'bold',
              fontFamily: "'Noto Sans Thai', sans-serif",
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(45, 90, 39, 0.6), inset 0 0 15px rgba(74, 222, 128, 0.3)'
            }}
          >
            เริ่มแบบทดสอบหลังเรียน (Post-test) 🎯
          </button>
        </div>
      );
    }

    if (session.state === 'NIGHT_MODE') {
      const isAwake = session.awakeHouseId !== null && session.awakeHouseId !== undefined;
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', minHeight: '60vh'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(5, 10, 25, 0.95), rgba(0, 5, 15, 0.98))',
            border: isAwake ? '3px solid rgba(217, 174, 110, 0.8)' : '3px solid rgba(112, 161, 255, 0.8)',
            borderRadius: '40px',
            padding: '80px',
            maxWidth: '1000px',
            textAlign: 'center',
            boxShadow: isAwake 
              ? '0 0 80px rgba(217, 174, 110, 0.4), inset 0 0 50px rgba(217, 174, 110, 0.2)'
              : '0 0 80px rgba(112, 161, 255, 0.4), inset 0 0 50px rgba(112, 161, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            transform: 'scale(1.05)',
            transition: 'all 0.5s ease-in-out'
          }}>
            <h2 style={{ 
              fontSize: '84px', 
              fontFamily: "'Cinzel', serif", 
              fontWeight: 'bold', 
              color: isAwake ? '#F6E8CD' : '#D6E4FF', 
              textShadow: isAwake 
                ? '0 0 30px rgba(217,174,110,0.8), 0 0 10px rgba(217,174,110,0.5)'
                : '0 0 30px rgba(112,161,255,0.8), 0 0 10px rgba(112,161,255,0.5)', 
              marginBottom: '30px',
              lineHeight: '1.2'
            }}>
              {isAwake ? `👁️ บ้านที่ ${session.awakeHouseId}` : '🌙 เข้าสู่โหมดกลางคืน...'}
              {isAwake && <div style={{ fontSize: '64px', color: '#D9AE6E', marginTop: '15px' }}>ลืมตาขึ้น...</div>}
            </h2>
            <p style={{ 
              fontSize: '32px', 
              color: isAwake ? 'rgba(217,174,110,0.8)' : 'rgba(112,161,255,0.8)', 
              fontStyle: 'italic',
              fontWeight: '300',
              letterSpacing: '2px'
            }}>
              {isAwake ? '✨ มีบางสิ่งที่กำลังจะเกิดขึ้นในความมืดมิด ✨' : '✨ ทุกบ้านหลับตาลงและรอฟังเสียงสวรรค์เรียกหา ✨'}
            </p>
          </div>
        </div>
      );
    }

    if (session.state === 'FINISHED') {
       // Sort houses by score
       const sorted = Object.values(session.houses).sort((a, b) => b.score - a.score);
       return (
          <div style={{
            background: 'linear-gradient(145deg, rgba(30, 48, 38, 0.95), rgba(10, 18, 11, 0.98))',
            border: '2px solid #D9AE6E',
            borderRadius: '32px',
            padding: '48px',
            maxWidth: '800px',
            margin: '0 auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 30px rgba(217, 174, 110, 0.2)',
            backdropFilter: 'blur(15px)'
          }}>
            <h2 style={{ fontSize: '42px', fontFamily: "'Cinzel', serif", fontWeight: 'bold', textAlign: 'center', color: '#D9AE6E', marginBottom: '40px', textShadow: '0 4px 15px rgba(0,0,0,0.8)' }}>
              🏆 สรุปคะแนนรวมทั้งหมด (Post-test)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sorted.map((h, i) => (
                <div key={h.houseId} style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '20px 32px', 
                  background: i === 0 ? 'linear-gradient(90deg, rgba(217, 174, 110, 0.3), rgba(217, 174, 110, 0.1))' : 'rgba(0,0,0,0.4)',
                  borderRadius: '16px', 
                  border: `1px solid ${i === 0 ? '#D9AE6E' : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: i === 0 ? '0 0 20px rgba(217, 174, 110, 0.2)' : 'none',
                  transform: i === 0 ? 'scale(1.02)' : 'none',
                  transition: 'all 0.3s'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: i === 0 ? '#D9AE6E' : '#F6E8CD' }}>
                    อันดับ {i + 1} - บ้านที่ {h.houseId} {i === 0 && '👑'}
                  </div>
                  <div style={{ fontSize: '20px', color: i === 0 ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                    <strong>{h.score}</strong> คะแนน (ตอบถูก {h.correctAnswers}/10)
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
              <button 
                onClick={() => socket?.emit('hostStartNightMode')}
                style={{
                  background: 'linear-gradient(135deg, #2c3e50, #000000)',
                  color: '#D9AE6E',
                  border: '2px solid #D9AE6E',
                  padding: '16px 40px',
                  borderRadius: '16px',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  fontFamily: "'Noto Sans Thai', sans-serif",
                  cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(217, 174, 110, 0.3)'
                }}
              >
                เข้าสู่โหมดกลางคืน (เล่น Werewolf) 🐺
              </button>
              <button 
                onClick={() => socket?.emit('hostNewRound')}
                style={{
                  background: 'linear-gradient(135deg, #1E392A, #2D5A27)',
                  color: '#F6E8CD',
                  border: '2px solid #4ade80',
                  padding: '16px 40px',
                  borderRadius: '16px',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  fontFamily: "'Noto Sans Thai', sans-serif",
                  cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(45, 90, 39, 0.6), inset 0 0 15px rgba(74, 222, 128, 0.3)'
                }}
              >
                กลับห้องรอ (รีเซ็ตเกม) ↺
              </button>
            </div>
          </div>
       );
    }

    if (!question) return <div>กำลังโหลดข้อ...</div>;

    const submittedCount = Object.values(session.houses).filter(h => h.hasSubmitted).length;
    const totalOnline = Object.values(session.houses).filter(h => h.isOnline).length;

    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        {/* Header Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '40px',
          padding: '24px 48px',
          background: 'linear-gradient(135deg, rgba(30, 48, 38, 0.8) 0%, rgba(10, 18, 11, 0.95) 100%)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          border: '2px solid rgba(217, 174, 110, 0.4)',
          borderBottom: '4px solid #D9AE6E',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(217, 174, 110, 0.1)'
        }}>
          <div style={{ fontSize: '28px', color: '#D9AE6E', fontFamily: "'Cinzel', serif", fontWeight: 'bold', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            ภารกิจที่ {session.currentQuestionIndex + 1} <span style={{opacity: 0.6, fontSize: '22px'}}>/ 10</span>
          </div>
          <div style={{ 
            fontSize: '56px', 
            fontWeight: 'bold', 
            fontFamily: "'Cinzel', serif",
            color: session.state === 'QUESTION_OPEN' && timeRemaining <= 10 ? '#ff4757' : '#F6E8CD',
            textShadow: session.state === 'QUESTION_OPEN' && timeRemaining <= 10 ? '0 0 20px rgba(255, 71, 87, 0.6)' : '0 0 20px rgba(246, 232, 205, 0.4)',
            lineHeight: 1
          }}>
            {session.state === 'QUESTION_OPEN' ? timeRemaining : 'หมดเวลา'}
          </div>
          <div style={{ fontSize: '24px', color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>
            ตอบแล้ว <strong style={{ color: '#4ade80', fontSize: '32px', margin: '0 8px' }}>{submittedCount}</strong> / {totalOnline} บ้าน
          </div>
        </div>

        {/* Question Box */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(30, 48, 38, 0.85), rgba(15, 25, 20, 0.95))',
          border: '2px solid rgba(217, 174, 110, 0.6)',
          borderRadius: '32px',
          padding: '48px',
          marginBottom: '40px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7), inset 0 0 30px rgba(217, 174, 110, 0.15)',
          position: 'relative',
          backdropFilter: 'blur(20px)'
        }}>
          <h2 style={{ 
            fontSize: '42px', 
            fontWeight: 'bold', 
            textAlign: 'center', 
            marginBottom: '48px',
            color: '#F6E8CD',
            textShadow: '0 4px 12px rgba(0,0,0,0.8), 0 0 20px rgba(217, 174, 110, 0.3)',
            lineHeight: '1.5'
          }}>
            {question.text}
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px' 
          }}>
            {question.options.map(opt => {
              let isCorrect = false;
              let isWrong = false;
              if (session.state === 'REVEAL') {
                 isCorrect = opt.key === question.correctKey;
                 isWrong = !isCorrect;
              }
              
              const optionColors: Record<string, string> = {
                'ก': '#ff6b81',
                'ข': '#7bed9f',
                'ค': '#70a1ff',
                'ง': '#eccc68'
              };
              
              return (
                <div 
                  key={opt.key} 
                  style={{
                    padding: '28px 36px',
                    borderRadius: '20px',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    fontSize: '28px',
                    background: isCorrect ? 'linear-gradient(145deg, rgba(74, 222, 128, 0.4), rgba(74, 222, 128, 0.2))' : 'linear-gradient(145deg, rgba(30, 48, 38, 0.6), rgba(10, 18, 11, 0.8))',
                    border: `2px solid ${isCorrect ? '#4ade80' : 'rgba(217, 174, 110, 0.3)'}`,
                    opacity: isWrong ? 0.4 : 1,
                    transform: isCorrect ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isCorrect ? '0 0 30px rgba(74, 222, 128, 0.5), inset 0 0 20px rgba(74, 222, 128, 0.3)' : '0 8px 20px rgba(0,0,0,0.4)',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                >
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: optionColors[opt.key] || '#D9AE6E', 
                    fontSize: '48px',
                    textShadow: '0 4px 10px rgba(0,0,0,0.6)',
                    lineHeight: 1
                  }}>
                    {opt.key}
                  </span>
                  <div style={{ flex: 1, fontWeight: 'bold', color: '#F6E8CD', letterSpacing: '0.02em' }}>{opt.text}</div>
                </div>
              );
            })}
          </div>
        </div>
        
        {session.state === 'REVEAL' && revealData && (
           <div style={{
             background: 'linear-gradient(145deg, rgba(217, 174, 110, 0.15), rgba(10, 18, 11, 0.8))',
             border: '1px solid rgba(217, 174, 110, 0.3)',
             borderLeft: '4px solid #D9AE6E',
             padding: '24px 32px',
             borderRadius: '12px 24px 24px 12px',
             marginBottom: '32px',
             backdropFilter: 'blur(10px)',
             boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(217, 174, 110, 0.1)'
           }}>
              <h3 style={{ fontSize: '22px', fontFamily: "'Cinzel', serif", fontWeight: 'bold', color: '#D9AE6E', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>✨ คำอธิบาย:</h3>
              <p style={{ fontSize: '18px', color: '#F6E8CD', lineHeight: '1.6', opacity: 0.9 }}>{revealData.explanation}</p>
           </div>
        )}

        {/* Footer: Houses & Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.values(session.houses).map(h => {
               if (!h.isOnline) return null;
               
               let resultIcon = '';
               if (session.state === 'REVEAL' && revealData) {
                 const res = revealData.houseResults[h.houseId];
                 resultIcon = res?.correct ? '✅' : '❌';
               }

               const isCorrect = session.state === 'REVEAL' && revealData && revealData.houseResults[h.houseId]?.correct;
               const isWrong = session.state === 'REVEAL' && revealData && !revealData.houseResults[h.houseId]?.correct;

               return (
                  <div key={h.houseId} style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    background: isCorrect ? 'rgba(74, 222, 128, 0.2)' : isWrong ? 'rgba(255, 71, 87, 0.2)' : h.hasSubmitted ? 'rgba(217, 174, 110, 0.2)' : 'rgba(0,0,0,0.5)',
                    color: isCorrect ? '#4ade80' : isWrong ? '#ff4757' : h.hasSubmitted ? '#D9AE6E' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${isCorrect ? 'rgba(74, 222, 128, 0.5)' : isWrong ? 'rgba(255, 71, 87, 0.5)' : h.hasSubmitted ? 'rgba(217, 174, 110, 0.5)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isCorrect ? '0 0 15px rgba(74, 222, 128, 0.2)' : isWrong ? '0 0 15px rgba(255, 71, 87, 0.2)' : 'none'
                  }}>
                    บ้านที่ {h.houseId} {resultIcon}
                  </div>
               )
            })}
          </div>
          
          <div>
            {session.state === 'QUESTION_CLOSED' && (
              <button 
                onClick={() => socket?.emit('hostReveal')}
                style={{
                  background: 'linear-gradient(135deg, #D9AE6E, #B88645)',
                  color: '#1a1a1a',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(217, 174, 110, 0.4)'
                }}
              >
                เปิดเฉลย
              </button>
            )}
            {session.state === 'REVEAL' && (
              <button 
                onClick={() => socket?.emit('hostNextQuestion')}
                style={{
                  background: 'linear-gradient(135deg, #1E392A, #2D5A27)',
                  color: '#F6E8CD',
                  border: '2px solid #4ade80',
                  padding: '16px 32px',
                  borderRadius: '16px',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  fontFamily: "'Noto Sans Thai', sans-serif",
                  cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(45, 90, 39, 0.6), inset 0 0 15px rgba(74, 222, 128, 0.3)'
                }}
              >
                {session.currentQuestionIndex >= 4 ? 'ดูผลสรุป' : 'ข้อถัดไป'} ➔
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleAuthenticate = async (password: string) => {
    // In a real app, this should call an API.
    // For now, we simulate a check.
    if (password === 'admin1234') {
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen forest-bg flex flex-col p-4">
      <header className="flex justify-between items-center mb-6 relative">
        <h1 className="host-title">Little Hood: Into the Woods</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button 
            onClick={() => {
              if (window.confirm('คุณต้องการรีเซ็ตเกมและลบคะแนนทั้งหมด กลับไปเริ่มใหม่(LOBBY)หรือไม่?')) {
                socket?.emit('hostNewRound');
              }
            }}
            style={{
              background: 'rgba(255, 71, 87, 0.2)',
              border: '1px solid #ff4757',
              color: '#ff4757',
              padding: '8px 16px',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 71, 87, 0.4)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 71, 87, 0.2)'}
          >
            <span style={{ fontSize: '20px' }}>🔄</span> รีเซ็ตเกมใหม่
          </button>
          <AdminSettingsButton onClick={() => setShowAdminModal(true)} />
        </div>
      </header>
      
      {renderTabs()}
      
      <div className="flex-1 w-full relative">
        {activeTab === 'LOBBY' && renderLobbyTab()}
        {activeTab === 'QUIZ' && renderQuizTab()}
      </div>

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
    </div>
  );
};

export default HostView;
