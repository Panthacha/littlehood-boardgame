import React from 'react';
import { useNavigate } from 'react-router-dom';

const Cover: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    // Navigate to Host view
    navigate('/host');
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        cursor: 'pointer', backgroundColor: 'black', overflow: 'hidden', zIndex: 0
      }}
      onClick={handleStart}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleStart();
      }}
      tabIndex={0}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          zIndex: -1
        }}
      >
        <source src="/intro.mp4" type="video/mp4" />
      </video>

      {/* Dark gradient overlay to make text pop and add cinematic feel */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(14,26,23,0.9) 100%)',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* Enhanced text overlapping the video */}
      <div style={{
        position: 'absolute',
        bottom: '12%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        textAlign: 'center',
        zIndex: 10,
        pointerEvents: 'none'
      }}>
        <p style={{
          color: 'rgba(246, 232, 205, 0.95)', // Creamy white
          fontSize: '20px',
          textTransform: 'uppercase',
          letterSpacing: '0.4em',
          fontWeight: 400,
          fontFamily: "'Cinzel', serif, sans-serif",
          textShadow: '0 4px 12px rgba(0,0,0,1), 0 0 20px rgba(217,174,110,0.4)',
          animation: 'cinematic-pulse 2.5s ease-in-out infinite',
          margin: 0
        }}>
          Tap anywhere to start
        </p>
        
        {/* Magical decorative line */}
        <div style={{
          width: '60px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(217,174,110,0.8), transparent)',
          margin: '16px auto 0',
          boxShadow: '0 0 10px rgba(217,174,110,0.5)'
        }} />
      </div>
    </div>
  );
};

export default Cover;
