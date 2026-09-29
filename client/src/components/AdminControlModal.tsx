import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, KeyRound, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (password: string) => Promise<boolean>;
}

export const AdminControlModal: React.FC<Props> = ({ 
  isOpen, onClose, onAuthenticate 
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation state
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimOpen, setIsAnimOpen] = useState(isOpen);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isOpen) {
      setShouldRender(true);
      document.body.classList.add('modal-open');
      setPassword('');
      setError(false);
      
      // Allow DOM to mount before triggering animation
      requestAnimationFrame(() => {
        setIsAnimOpen(true);
      });
      
      // Focus after animation
      timeoutId = setTimeout(() => {
        try {
          inputRef.current?.focus({ preventScroll: true });
        } catch (e) {
          inputRef.current?.focus();
        }
      }, 300);
    } else {
      setIsAnimOpen(false);
      document.body.classList.remove('modal-open');
      
      // Wait for animation to finish before unmounting
      timeoutId = setTimeout(() => {
        setShouldRender(false);
      }, 250);
    }
    
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => document.body.classList.remove('modal-open');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  if (!shouldRender) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isLoading) return;
    
    setIsLoading(true);
    setError(false);
    
    // Simulate slight delay for checking
    await new Promise(r => setTimeout(r, 400));
    
    const isValid = await onAuthenticate(password);
    if (!isValid) {
      setError(true);
      setPassword('');
      inputRef.current?.focus();
    } else {
      navigate('/admin');
      onClose();
    }
    setIsLoading(false);
  };

  return (
    <div className={`admin-modal-overlay ${isAnimOpen ? 'admin-modal-dialog-enter-active' : 'admin-modal-dialog-exit'}`}
         onClick={handleClose}
         role="dialog"
         aria-modal="true"
         aria-labelledby="admin-modal-title">
      
      <div className={`admin-modal-dialog ${isAnimOpen ? 'admin-modal-dialog-enter-active' : 'admin-modal-dialog-exit'}`}
           onClick={e => e.stopPropagation()}>
        
        <div className="admin-corner-tl" />
        <div className="admin-corner-tr" />
        <div className="admin-corner-bl" />
        <div className="admin-corner-br" />
        <div className="admin-inner-border" />

        <button 
          type="button"
          onClick={handleClose}
          className="admin-close-btn"
          aria-label="ปิดหน้าต่าง"
        >
          <X size={24} />
        </button>

        <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="admin-badge">
              <KeyRound size={28} />
            </div>
            <div className="admin-badge-text">RESTRICTED AREA</div>
            <h2 id="admin-modal-title" className="admin-title">ความลับแห่งป่า</h2>
            <p className="admin-subtitle">กรอกรหัสผ่านเพื่อเข้าสู่การจัดการเกม</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left' }}>
            <label className="admin-label">รหัสผ่านผู้ดูแล</label>
            
            <div className={`admin-password-field ${error ? 'has-error' : ''}`}>
              <Lock size={20} style={{ color: 'rgba(217,174,110,0.8)', flexShrink: 0 }} />
              
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="กรอกรหัสผ่าน"
                className="admin-password-input"
                style={{ letterSpacing: showPassword || !password ? 'normal' : '0.2em' }}
              />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="admin-icon-btn"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <div className="admin-error-text">
              {error && (
                <>
                  <AlertCircle size={16} style={{ marginRight: '4px', flexShrink: 0 }} />
                  รหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง
                </>
              )}
            </div>
            
            <button 
              type="submit" 
              disabled={!password || isLoading}
              className="admin-submit-button"
            >
              {isLoading ? (
                <>
                  <div style={{ width: '20px', height: '20px', border: '2px solid rgba(246,232,205,0.3)', borderTopColor: '#F6E8CD', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  กำลังตรวจสอบ...
                </>
              ) : (
                <>
                  <KeyRound size={18} style={{ opacity: 0.8 }} />
                  ปลดล็อกความลับ
                </>
              )}
            </button>
            
            <div className="admin-footer-text">
              สำหรับผู้ดูแลเกมเท่านั้น
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
