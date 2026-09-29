import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Map, Sparkles } from 'lucide-react';
import { CHARACTERS } from '../constants/characters';

const JoinView: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const { connected } = useSocket();
  const [searchParams] = useSearchParams();
  
  const initialHouse = parseInt(searchParams.get('house') || '0', 10);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(
    initialHouse > 0 && initialHouse <= 6 ? initialHouse : null
  );

  const houses = [1, 2, 3, 4, 5, 6];

  const handleConfirm = () => {
    if (selectedHouse) {
      navigate(`/play/${eventSlug}?house=${selectedHouse}`);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen forest-bg flex items-center justify-center">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: '#D9AE6E' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(217,174,110,0.3)', borderTopColor: '#D9AE6E', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '18px', letterSpacing: '0.1em' }}>กำลังเชื่อมต่อสู่ผืนป่า...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen forest-bg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Dark overlay for better contrast */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(14,26,23,0.6) 0%, rgba(10,18,11,0.95) 100%)', pointerEvents: 'none' }} />

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(15, 25, 20, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(217, 174, 110, 0.2)',
        borderTop: '1px solid rgba(217, 174, 110, 0.4)',
        borderRadius: '32px',
        padding: '40px 24px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 20px rgba(217, 174, 110, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '28px'
      }}>
        
        {/* Header Icon */}
        <div style={{ 
          width: '72px', 
          height: '72px', 
          borderRadius: '50%', 
          border: '2px solid #D9AE6E', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#101D18', 
          boxShadow: '0 0 30px rgba(217, 174, 110, 0.4), inset 0 0 15px rgba(255,255,255,0.5)', 
          background: 'linear-gradient(135deg, #F6E8CD, #D9AE6E)' 
        }}>
          <Map size={36} strokeWidth={2.5} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#D9AE6E', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.8 }}>
            Event: {eventSlug}
          </div>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '32px', color: '#F6E8CD', margin: 0, textShadow: '0 2px 15px rgba(0,0,0,0.8)' }}>
            เลือกบ้านของคุณ
          </h2>
          <p style={{ color: '#BCAF97', fontSize: '15px', margin: '12px 0 0 0', lineHeight: 1.5 }}>
            ดูหมายเลขบ้านจากการ์ดของคุณ<br/>แล้วเลือกเพื่อยืนยันตัวตน
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', width: '100%', marginTop: '8px' }}>
          {houses.map((id) => {
            const isSelected = selectedHouse === id;
            return (
              <button
                key={id}
                onClick={() => setSelectedHouse(id)}
                style={{
                  position: 'relative',
                  height: '110px',
                  background: isSelected ? 'linear-gradient(145deg, rgba(217, 174, 110, 0.2), rgba(217, 174, 110, 0.05))' : 'rgba(0,0,0,0.4)',
                  border: isSelected ? '2px solid #D9AE6E' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isSelected ? '#F6E8CD' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: isSelected ? '0 10px 25px rgba(217, 174, 110, 0.3), inset 0 0 15px rgba(217, 174, 110, 0.2)' : 'none',
                  transform: isSelected ? 'scale(1.05) translateY(-5px)' : 'scale(1) translateY(0)',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                {isSelected && (
                  <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent)', transform: 'skewX(-20deg)', animation: 'shine 2s infinite' }} />
                )}
                
                <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: "'Cinzel', serif", textShadow: isSelected ? '0 0 10px rgba(217,174,110,0.5)' : 'none' }}>
                  บ้าน {id}
                </div>
                
                {isSelected && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#D9AE6E', animation: 'fadeIn 0.3s ease' }}>
                    <Sparkles size={16} />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ width: '100%', minHeight: '64px', marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
          {selectedHouse ? (
            <button 
              onClick={handleConfirm}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #D9AE6E, #BCA16B)',
                color: '#101D18',
                border: 'none',
                padding: '18px',
                borderRadius: '16px',
                fontWeight: 'bold',
                fontSize: '20px',
                boxShadow: '0 10px 25px rgba(217, 174, 110, 0.4), inset 0 -3px 5px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span>ยืนยันเข้าบ้านที่ {selectedHouse}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </button>
          ) : (
            <div style={{
              width: '100%',
              padding: '18px',
              borderRadius: '16px',
              border: '2px dashed rgba(217,174,110,0.3)',
              color: 'rgba(217,174,110,0.5)',
              textAlign: 'center',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              โปรดเลือกบ้านของคุณ
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinView;
