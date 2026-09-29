import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Settings, ArrowLeft, RotateCcw, Users, SkipForward } from 'lucide-react';

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

        {/* Card: Player Management (Placeholder) */}
        <section className="admin-card disabled">
          <div className="admin-card-header">
            <Users color="#D9AE6E" size={24} />
            <h2 className="admin-card-title">จัดการผู้เล่น</h2>
          </div>
          
          <div className="admin-card-content">
             <button className="admin-btn-disabled">
               เตะผู้เล่นที่ไม่ได้ใช้งาน
             </button>
             <button className="admin-btn-disabled">
               แก้ไขคะแนน
             </button>
             <div className="admin-coming-soon">
               Coming Soon
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
