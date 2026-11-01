import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Settings, ArrowLeft, RotateCcw, Users, SkipForward } from 'lucide-react';
import { ROLE_NAMES, describeEvent } from '../utils/nightRecap';

const AdminView: React.FC = () => {
  const navigate = useNavigate();
  const { socket, connected, session } = useSocket();

  useEffect(() => {
    // Optionally: check if truly admin (if you had a token or state)
    // For now, since they just entered the password to get here, we trust it.
  }, []);

  const handleResetGame = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตเกมทั้งหมด? (ระบบจะพาทุกคนกลับไปห้องรอ)')) {
      socket?.emit('hostNewRound');
    }
  };

  return (
    <div className="admin-dashboard-container">
      {/* Decorative background elements */}
      <div className="admin-bg-blob" style={{ top: '-10%', left: '-5%', width: '400px', height: '400px' }} />
      <div className="admin-bg-blob" style={{ bottom: '-10%', right: '-5%', width: '400px', height: '400px' }} />

      {/* Header */}
      <header className="admin-header">
        <button 
          onClick={() => navigate('/host')}
          className="admin-back-btn"
          title="กลับไปหน้า Host"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="admin-header-title-box">
          <div className="admin-header-icon">
            <Settings size={28} />
          </div>
          <div>
            <div className="admin-header-subtitle">
              System Active
            </div>
            <h1 className="admin-header-title">
              ADMIN DASHBOARD
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="admin-grid">
        
        {/* Card: Night Mode Controls */}
        <section className="admin-card" style={{ gridColumn: '1 / -1' }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">🐺 ควบคุมโหมดกลางคืน (Werewolf Phase)</h2>
          </div>
          
          <div className="admin-card-content">
            {session?.state === 'NIGHT_MODE' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', width: '100%' }}>
                <div style={{ gridColumn: '1 / -1', marginBottom: '16px', fontSize: '18px', fontWeight: 'bold', color: '#D9AE6E' }}>
                  คืนที่ {session.lastCompletedPart || 1} (หลังจบ Part {session.lastCompletedPart || 1})
                </div>
                <div style={{ gridColumn: '1 / -1', marginBottom: '16px' }}>
                  <button 
                    style={{ padding: '12px 24px', background: '#333', color: '#fff', borderRadius: '8px', cursor: 'pointer', border: '1px solid #555' }}
                    onClick={() => socket?.emit('hostWakeUpHouse', null)}
                  >
                    หลับตาทุกบ้าน 🌙
                  </button>
                </div>
                {[1, 2, 3, 4, 5, 6].map(id => {
                  const house = session.houses[id];
                  const isAwake = session.awakeHouseId === id;
                  return (
                    <div key={id} style={{ 
                      padding: '16px', 
                      background: isAwake ? 'rgba(217, 174, 110, 0.2)' : 'rgba(0,0,0,0.3)', 
                      border: isAwake ? '2px solid #D9AE6E' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px'
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#D9AE6E', marginBottom: '8px' }}>
                        บ้านที่ {id} {isAwake ? '👁️' : '😴'}
                      </div>
                      <div style={{ marginBottom: '8px', color: '#fff' }}>
                        บทบาท: <strong>{house?.role ? ROLE_NAMES[house.role] : '???'}</strong>
                      </div>
                      <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '12px' }}>
                        ทักษะ: {house?.usedNightSkill ? 'ใช้แล้ว ✅' : 'ยังไม่ใช้ ❌'} <br/>
                        ป้องกัน: {house?.isProtected ? '🛡️' : '-'} | เจ็บ: {house?.injuries || 0} | สถานะ: {house?.isDead ? '💀' : '❤️'}
                      </div>
                      <button
                        onClick={() => socket?.emit('hostWakeUpHouse', id)}
                        style={{
                          width: '100%', padding: '8px', borderRadius: '8px', border: 'none',
                          background: isAwake ? '#555' : '#4ade80', color: isAwake ? '#fff' : '#1a1a1a',
                          fontWeight: 'bold', cursor: 'pointer'
                        }}
                      >
                        {isAwake ? 'กำลังลืมตา' : 'เรียกให้ลืมตา'}
                      </button>
                    </div>
                  );
                })}
                <div style={{ gridColumn: '1 / -1', marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', color: '#ddd' }}>
                  <div style={{ fontWeight: 'bold', color: '#D9AE6E', marginBottom: '8px' }}>บันทึกทุกคืน (เห็นเฉพาะผู้สอน)</div>
                  {[1, 2, 3, 4, 5].filter(n => n <= (session.lastCompletedPart || 1)).map(n => {
                    const events = (session.nightLog || []).filter(e => e.night === n);
                    return (
                      <div key={n} style={{ marginBottom: '8px' }}>
                        <strong>คืนที่ {n}:</strong>{' '}
                        {events.length ? events.map(describeEvent).join(' · ') : 'ยังไม่มีใครใช้ทักษะ'}
                      </div>
                    );
                  })}
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      const done = session.lastCompletedPart || 1;
                      if (done === 5) socket?.emit('hostFinishParts');
                      else socket?.emit('hostStartPart', done + 1);
                    }}
                    style={{ padding: '14px 32px', background: '#D9AE6E', color: '#1a1a1a', borderRadius: '12px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', border: 'none' }}
                  >
                    {(session.lastCompletedPart || 1) === 5 ? 'จบคืนสุดท้าย ดูผลสรุป 🏆' : `จบคืนนี้ → ไป Part ${(session.lastCompletedPart || 1) + 1}`}
                  </button>
                </div>
              </div>
            ) : (
              <p className="admin-status-text">
                * โหมดกลางคืนจะเปิดอัตโนมัติหลังจบแต่ละ Part (กดปุ่ม "เข้าสู่คืนที่ N" บนจอใหญ่)
              </p>
            )}
          </div>
        </section>

        {/* Card: Core Controls */}
        <section className="admin-card">
          <div className="admin-card-header">
            <RotateCcw color="#D9AE6E" size={24} />
            <h2 className="admin-card-title">การควบคุมหลัก</h2>
          </div>
          
          <div className="admin-card-content">
            <button 
              className="admin-btn-danger"
              onClick={handleResetGame}
            >
              <RotateCcw size={22} />
              รีเซ็ตเกม (เริ่มใหม่ทั้งหมด)
            </button>
            <p className="admin-status-text">
              * การกระทำนี้จะล้างคะแนนและส่งผู้เล่นทุกคนกลับห้องรอ
            </p>
          </div>
        </section>

        {/* Card: Player Management — each house is locked to one device */}
        <section className="admin-card">
          <div className="admin-card-header">
            <Users color="#D9AE6E" size={24} />
            <h2 className="admin-card-title">จัดการบ้าน (1 บ้าน = 1 เครื่อง)</h2>
          </div>

          <div className="admin-card-content">
            <p className="admin-status-text" style={{ marginBottom: '8px' }}>
              * ถ้ากลุ่มไหนต้องเปลี่ยนเครื่อง (แบตหมด/เข้าผิดบ้าน) กด "ปล่อยบ้าน" แล้วให้เครื่องใหม่สแกนเข้ามา คะแนนของบ้านยังอยู่ครบ
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', width: '100%' }}>
              {[1, 2, 3, 4, 5, 6].map(id => {
                const h = session?.houses[id];
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', color: '#F6E8CD' }}>
                    <span>บ้าน {id} {h?.claimed ? '🔒' : '—'}</span>
                    <button
                      disabled={!h?.claimed}
                      onClick={() => {
                        if (window.confirm(`ปล่อยบ้านที่ ${id} ให้เครื่องอื่นเข้าได้?`)) socket?.emit('adminReleaseHouse', id);
                      }}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #D9AE6E', background: 'transparent', color: '#D9AE6E', fontWeight: 'bold', cursor: h?.claimed ? 'pointer' : 'default' }}
                    >
                      ปล่อยบ้าน
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Card: Question Controls (Placeholder) */}
        <section className="admin-card disabled">
          <div className="admin-card-header">
            <SkipForward color="#D9AE6E" size={24} />
            <h2 className="admin-card-title">จัดการคำถาม</h2>
          </div>
          
          <div className="admin-card-content">
             <button className="admin-btn-disabled">
               บังคับข้ามไปข้อถัดไป
             </button>
             <button className="admin-btn-disabled">
               เพิ่มเวลา (+10s)
             </button>
             <div className="admin-coming-soon">
               Coming Soon
             </div>
          </div>
        </section>

      </main>

      {/* Footer Info */}
      <footer className="admin-footer">
        <p>LITTLE HOOD: INTO THE WOODS - ADMIN SYSTEM VER 1.0</p>
      </footer>
    </div>
  );
};

export default AdminView;
