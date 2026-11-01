import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';

interface ClassifyItem {
  id: string;
  label: string;
  isGame: boolean;
  monogram: string;
}

const CLASSIFY_ITEMS: ClassifyItem[] = [
  { id: 'chess', label: 'หมากรุก', isGame: true, monogram: 'หม' },
  { id: 'uno', label: 'ไพ่อูโน', isGame: true, monogram: 'ไพ' },
  { id: 'dice', label: 'ลูกเต๋า', isGame: true, monogram: 'ลู' },
  { id: 'remote', label: 'รีโมททีวี', isGame: false, monogram: 'รี' },
  { id: 'book', label: 'หนังสือเรียน', isGame: false, monogram: 'นส' },
  { id: 'phone', label: 'โทรศัพท์มือถือ', isGame: false, monogram: 'โท' }
];

const PIECE_ITEMS = [
  { id: 'board', label: 'กระดาน', monogram: 'กด' },
  { id: 'card', label: 'การ์ด', monogram: 'กต' },
  { id: 'dice', label: 'เต๋า', monogram: 'ตว' },
  { id: 'pawn', label: 'ตัวเดิน', monogram: 'ตด' }
];

const LABEL_ORDER = ['dice', 'pawn', 'board', 'card'];
const COLORS = ['#2D5A27', '#B88645', '#9D3543'];

interface Part1Data {
  classifyAnswers: Record<string, boolean>;
  matches: Record<string, string>;
  gameName: string;
  gameTheme: string;
  gameGoal: string;
}

const EMPTY_DATA: Part1Data = { classifyAnswers: {}, matches: {}, gameName: '', gameTheme: '', gameGoal: '' };

interface Props {
  houseId: number;
}

const Part1: React.FC<Props> = ({ houseId }) => {
  const { socket } = useSocket();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Part1Data>(EMPTY_DATA);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [wrongLabel, setWrongLabel] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore saved progress on mount (survives refresh / reconnect)
  useEffect(() => {
    if (!socket || !houseId) return;
    socket.emit('getPartProgress', { houseId }, (res: any) => {
      const saved = res?.parts?.[1];
      if (saved) {
        setStep(saved.step ?? 0);
        setData({ ...EMPTY_DATA, ...(saved.data || {}) });
      }
      setLoaded(true);
    });
  }, [socket, houseId]);

  const save = (nextStep: number, nextData: Part1Data, completed: boolean) => {
    if (!socket || !houseId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      socket.emit('savePartProgress', { houseId, partNumber: 1, step: nextStep, data: nextData, completed }, () => {});
    }, 400);
  };

  const updateData = (patch: Partial<Part1Data>) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      save(step, next, false);
      return next;
    });
  };

  const goStep = (n: number) => {
    setStep(n);
    save(n, data, n === 3);
  };

  if (!loaded) {
    return (
      <div style={{ color: '#F6E8CD', textAlign: 'center', padding: '40px' }}>กำลังโหลด...</div>
    );
  }

  const classifyDone = CLASSIFY_ITEMS.every((it) => data.classifyAnswers[it.id] !== undefined);
  const matchDone = PIECE_ITEMS.every((p) => data.matches[p.id]);
  const formDone = data.gameName.trim() && data.gameTheme.trim() && data.gameGoal.trim();

  let canAdvance = true;
  if (step === 0) canAdvance = classifyDone;
  if (step === 1) canAdvance = matchDone;
  if (step === 2) canAdvance = !!formDone;

  const handleClassify = (id: string, answer: boolean) => {
    updateData({ classifyAnswers: { ...data.classifyAnswers, [id]: answer } });
  };

  const handleSelectPiece = (pieceId: string) => {
    if (data.matches[pieceId]) return;
    setSelectedPiece(pieceId);
    setWrongLabel(null);
  };

  const handlePickLabel = (labelId: string) => {
    if (!selectedPiece) return;
    if (data.matches[selectedPiece]) return;
    if (Object.values(data.matches).includes(labelId)) return;
    if (selectedPiece === labelId) {
      updateData({ matches: { ...data.matches, [selectedPiece]: labelId } });
      setSelectedPiece(null);
      setWrongLabel(null);
    } else {
      setWrongLabel(labelId);
      setTimeout(() => setWrongLabel(null), 600);
    }
  };

  const segments = [0, 1, 2, 3];

  return (
    <div style={{ width: '100%', maxWidth: '640px', color: '#F6E8CD', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>
      <div>
        <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D9AE6E', fontWeight: 'bold', marginBottom: '6px' }}>พาร์ท 1</div>
        <h2 style={{ margin: '0 0 12px', fontFamily: "'Cinzel', serif", fontSize: '22px' }}>ห้องแล็บบอร์ดเกม</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {segments.map((i) => (
            <div key={i} style={{ flex: 1, height: '6px', borderRadius: '999px', background: i <= step ? '#D9AE6E' : 'rgba(217,174,110,0.2)' }} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '15px', color: 'rgba(246,232,205,0.8)' }}>แตะเลือกว่า "ใช่บอร์ดเกมไหม?"</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            {CLASSIFY_ITEMS.map((item, i) => {
              const answered = data.classifyAnswers[item.id] !== undefined;
              const picked = data.classifyAnswers[item.id];
              const correct = answered ? picked === item.isGame : null;
              return (
                <div key={item.id} style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${answered ? (correct ? 'rgba(74,222,128,0.5)' : 'rgba(255,107,107,0.4)') : 'rgba(217,174,110,0.2)'}`,
                  borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center'
                }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontWeight: 'bold' }}>{item.monogram}</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{item.label}</div>
                  {!answered ? (
                    <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                      <button onClick={() => handleClassify(item.id, true)} style={{ flex: 1, minHeight: '40px', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.5)', background: 'rgba(74,222,128,0.12)', color: '#8ef0ab', fontWeight: 'bold', cursor: 'pointer' }}>ใช่</button>
                      <button onClick={() => handleClassify(item.id, false)} style={{ flex: 1, minHeight: '40px', borderRadius: '8px', border: '1px solid rgba(255,107,107,0.4)', background: 'rgba(255,107,107,0.1)', color: '#ff9b9b', fontWeight: 'bold', cursor: 'pointer' }}>ไม่ใช่</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: correct ? '#4ade80' : '#D9AE6E' }}>✓ บันทึกแล้ว</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '15px', color: 'rgba(246,232,205,0.8)' }}>แตะชิ้นส่วน แล้วแตะชื่อองค์ประกอบที่ตรงกัน</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PIECE_ITEMS.map((p, i) => {
                const matched = !!data.matches[p.id];
                const isSelected = selectedPiece === p.id;
                return (
                  <button key={p.id} onClick={() => handleSelectPiece(p.id)} disabled={matched} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', minHeight: '48px', padding: '8px 12px', borderRadius: '12px',
                    border: matched ? '1px solid rgba(74,222,128,0.5)' : isSelected ? '2px solid #D9AE6E' : '1px solid rgba(217,174,110,0.25)',
                    background: matched ? 'rgba(74,222,128,0.08)' : isSelected ? 'rgba(217,174,110,0.15)' : 'rgba(0,0,0,0.3)',
                    color: '#F6E8CD', cursor: matched ? 'default' : 'pointer', textAlign: 'left'
                  }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>{p.monogram}</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{p.label}</span>
                    {matched && <span style={{ marginLeft: 'auto', color: '#4ade80', fontWeight: 'bold' }}>✓</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {LABEL_ORDER.map((id) => {
                const piece = PIECE_ITEMS.find((p) => p.id === id)!;
                const matchedByPieceId = Object.keys(data.matches).find((pid) => data.matches[pid] === id);
                const isWrong = wrongLabel === id;
                return (
                  <button key={id} onClick={() => handlePickLabel(id)} disabled={!!matchedByPieceId} style={{
                    minHeight: '48px', padding: '8px 12px', borderRadius: '12px',
                    border: matchedByPieceId ? '1px solid rgba(74,222,128,0.5)' : isWrong ? '1px solid rgba(255,107,107,0.6)' : '1px solid rgba(217,174,110,0.25)',
                    background: matchedByPieceId ? 'rgba(74,222,128,0.08)' : isWrong ? 'rgba(255,107,107,0.12)' : 'rgba(0,0,0,0.3)',
                    color: '#F6E8CD', fontSize: '14px', fontWeight: 'bold', cursor: matchedByPieceId ? 'default' : 'pointer', textAlign: 'left'
                  }}>
                    {piece.label}{matchedByPieceId ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '15px', color: 'rgba(246,232,205,0.8)' }}>เริ่มต้นไอเดียเกมของทีมคุณ สั้น ๆ ก่อน</p>
          {[
            { field: 'gameName' as const, label: 'ชื่อเกม', placeholder: 'เช่น ล่าหมาป่าแห่งป่าใหญ่' },
            { field: 'gameTheme' as const, label: 'ธีม', placeholder: 'เช่น หมู่บ้านกลางป่าในคืนพระจันทร์เต็มดวง' },
            { field: 'gameGoal' as const, label: 'เป้าหมายเกม', placeholder: 'เช่น หาตัวหมาป่าให้เจอก่อนหมู่บ้านถูกจับหมด' }
          ].map(({ field, label, placeholder }) => (
            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#D9AE6E' }}>{label}</label>
              <input
                type="text"
                value={data[field]}
                onChange={(e) => updateData({ [field]: e.target.value } as Partial<Part1Data>)}
                placeholder={placeholder}
                style={{ minHeight: '48px', padding: '0 16px', borderRadius: '12px', border: '1px solid rgba(217,174,110,0.35)', background: 'rgba(0,0,0,0.3)', color: '#F6E8CD', fontSize: '15px' }}
              />
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '2px solid #4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#4ade80' }}>✓</div>
          <h3 style={{ margin: 0, fontSize: '19px' }}>เสร็จพาร์ท 1 แล้ว!</h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(246,232,205,0.7)' }}>รอผู้สอนพาเข้าสู่คืนที่ 1 บนจอใหญ่</p>
          <div style={{ width: '100%', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(217,174,110,0.35)', borderRadius: '16px', padding: '18px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div><div style={{ fontSize: '11px', color: '#D9AE6E', fontWeight: 'bold' }}>ชื่อเกม</div><div style={{ fontSize: '15px' }}>{data.gameName || '—'}</div></div>
            <div><div style={{ fontSize: '11px', color: '#D9AE6E', fontWeight: 'bold' }}>ธีม</div><div style={{ fontSize: '15px' }}>{data.gameTheme || '—'}</div></div>
            <div><div style={{ fontSize: '11px', color: '#D9AE6E', fontWeight: 'bold' }}>เป้าหมายเกม</div><div style={{ fontSize: '15px' }}>{data.gameGoal || '—'}</div></div>
          </div>
        </div>
      )}

      {step < 3 && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: 'linear-gradient(0deg, #0A120B 60%, rgba(10,18,11,0))', padding: '16px 20px 20px' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', gap: '10px' }}>
            {step > 0 && (
              <button onClick={() => goStep(step - 1)} style={{ minHeight: '48px', padding: '0 20px', borderRadius: '12px', border: '1px solid rgba(246,232,205,0.3)', background: 'rgba(0,0,0,0.3)', color: 'rgba(246,232,205,0.85)', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>ย้อนกลับ</button>
            )}
            <button
              onClick={() => canAdvance && goStep(step + 1)}
              disabled={!canAdvance}
              style={{
                flex: 1, minHeight: '48px', borderRadius: '12px', border: 'none',
                background: canAdvance ? 'linear-gradient(135deg, #D9AE6E, #BCA16B)' : 'rgba(255,255,255,0.08)',
                color: canAdvance ? '#101D18' : 'rgba(255,255,255,0.3)',
                fontSize: '16px', fontWeight: 'bold', cursor: canAdvance ? 'pointer' : 'not-allowed'
              }}
            >
              {step === 2 ? 'เสร็จสิ้นพาร์ท 1' : 'ถัดไป'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Part1;
