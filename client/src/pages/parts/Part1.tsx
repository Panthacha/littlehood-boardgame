import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { PartShell, Section, Note, Field, SummaryCard, DoneScreen, Loading, GOLD } from './kit';
import { GAME_THEME } from './content';
import { SparkleBurst } from '../../theme/Forest';

interface ClassifyItem {
  id: string;
  label: string;
  isGame: boolean;
}

// Pictures: /part1/<id>.webp, made from the framed artwork in "six panels/".
const CLASSIFY_ITEMS: ClassifyItem[] = [
  { id: 'chess', label: 'หมากรุก', isGame: true },
  { id: 'uno', label: 'ไพ่อูโน', isGame: true },
  { id: 'dice', label: 'ลูกเต๋า', isGame: true },
  { id: 'remote', label: 'รีโมททีวี', isGame: false },
  { id: 'book', label: 'หนังสือเรียน', isGame: false },
  { id: 'phone', label: 'โทรศัพท์มือถือ', isGame: false }
];

const PIECE_ITEMS = [
  { id: 'board', label: 'กระดาน', monogram: 'กด' },
  { id: 'card', label: 'การ์ด', monogram: 'กต' },
  { id: 'dice', label: 'เต๋า', monogram: 'ตว' },
  { id: 'pawn', label: 'ตัวเดิน', monogram: 'ตด' }
];

const LABEL_ORDER = ['dice', 'pawn', 'board', 'card'];
const COLORS = ['#2F5A2A', '#8A5A1E', '#8E1B2C'];

interface Part1Data {
  classifyAnswers: Record<string, boolean>;
  matches: Record<string, string>;
  gameName: string;
  gameTheme: string;
  gameGoal: string;
}

const EMPTY_DATA: Part1Data = { classifyAnswers: {}, matches: {}, gameName: '', gameTheme: GAME_THEME, gameGoal: '' };

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
        setData({ ...EMPTY_DATA, ...(saved.data || {}), gameTheme: GAME_THEME });
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

  if (!loaded) return <Loading />;

  const classifyDone = CLASSIFY_ITEMS.every((it) => data.classifyAnswers[it.id] !== undefined);
  const matchDone = PIECE_ITEMS.every((p) => data.matches[p.id]);
  const formDone = data.gameName.trim() && data.gameGoal.trim();

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

  const tile = (bg: string, size = 48): React.CSSProperties => ({
    width: size, height: size, borderRadius: 10, background: bg, color: '#F6E8CD', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: size > 40 ? 15 : 12,
    boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.25)'
  });

  return (
    <PartShell part={1} title="ห้องแล็บบอร์ดเกม" step={step} totalSteps={4} canAdvance={canAdvance}
      nextLabel={step === 2 ? 'เสร็จสิ้นพาร์ท 1' : 'ถัดไป'} onBack={() => goStep(step - 1)} onNext={() => goStep(step + 1)}>

      {step === 0 && (
        <Section title="สิ่งไหนคือบอร์ดเกม?">
          <Note>แตะ "ใช่" หรือ "ไม่ใช่" ให้ครบทุกชิ้น</Note>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
            {CLASSIFY_ITEMS.map((item) => {
              const answered = data.classifyAnswers[item.id] !== undefined;
              const correct = answered ? data.classifyAnswers[item.id] === item.isGame : null;
              return (
                <div key={item.id} className={answered && !correct ? 'lh-strip is-wrong' : ''} style={{
                  position: 'relative', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center',
                  background: answered ? (correct ? 'rgba(47,107,58,0.12)' : 'rgba(168,35,58,0.1)') : 'rgba(255,250,238,0.5)',
                  border: `2px solid ${answered ? (correct ? 'rgba(47,107,58,0.55)' : 'rgba(168,35,58,0.45)') : 'rgba(122,85,48,0.3)'}`
                }}>
                  {/* square slot; the picture keeps its own shape so the rounding trims its white corners */}
                  <div style={{ width: '100%', maxWidth: '170px', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={`/part1/${item.id}.webp`} alt={item.label} style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', borderRadius: '9%', boxShadow: '0 4px 10px rgba(60,30,10,0.35)' }} />
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{item.label}</div>
                  {!answered ? (
                    <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                      <button className="lh-strip" onClick={() => handleClassify(item.id, true)} style={{ flex: 1, minHeight: '42px', padding: 0, textAlign: 'center', color: '#2F6B3A' }}>ใช่</button>
                      <button className="lh-strip" onClick={() => handleClassify(item.id, false)} style={{ flex: 1, minHeight: '42px', padding: 0, textAlign: 'center', color: 'var(--lh-hood)' }}>ไม่ใช่</button>
                    </div>
                  ) : (
                    <div className="lh-pop" style={{ fontSize: '13px', fontWeight: 'bold', color: correct ? '#2F6B3A' : 'var(--lh-hood)' }}>
                      {correct ? '✓ ถูกต้อง' : `✗ ${item.isGame ? 'เป็นเกมนะ' : 'ไม่ใช่เกมนะ'}`}
                    </div>
                  )}
                  {answered && correct && <SparkleBurst style={{ left: '50%', top: '36px' }} />}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {step === 1 && (
        <Section title="จับคู่ชิ้นส่วนเกม">
          <Note>แตะชิ้นส่วนทางซ้าย แล้วแตะชื่อที่ตรงกันทางขวา</Note>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PIECE_ITEMS.map((p, i) => {
                const matched = !!data.matches[p.id];
                const isSelected = selectedPiece === p.id;
                return (
                  <button key={p.id} onClick={() => handleSelectPiece(p.id)} disabled={matched} aria-pressed={isSelected}
                    className={`lh-strip ${matched ? 'is-right' : isSelected ? 'is-on' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', opacity: 1, filter: 'none', boxShadow: matched ? 'none' : undefined }}>
                    <span style={tile(COLORS[i % COLORS.length], 32)}>{p.monogram}</span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {LABEL_ORDER.map((id) => {
                const piece = PIECE_ITEMS.find((p) => p.id === id)!;
                const matchedByPieceId = Object.keys(data.matches).find((pid) => data.matches[pid] === id);
                const isWrong = wrongLabel === id;
                return (
                  <button key={id} onClick={() => handlePickLabel(id)} disabled={!!matchedByPieceId}
                    className={`lh-strip ${matchedByPieceId ? 'is-right' : isWrong ? 'is-wrong' : ''}`}
                    style={{ opacity: 1, filter: 'none', boxShadow: matchedByPieceId ? 'none' : undefined }}>
                    {piece.label}{matchedByPieceId ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section title="ไอเดียเกมแรกของทีม">
          <Note>เริ่มต้นสั้น ๆ ก่อน เดี๋ยวพาร์ทถัดไปจะต่อยอดจากตรงนี้</Note>
          <Field label="ชื่อเกม" value={data.gameName} onChange={(v) => updateData({ gameName: v })} placeholder="เช่น ล่าหมาป่าแห่งป่าใหญ่" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: GOLD }}>ธีม (ธีมหลักของเกม เปลี่ยนไม่ได้)</span>
            <div aria-readonly="true" className="lh-input" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(168,35,58,0.08)', borderStyle: 'dashed', fontWeight: 700 }}>
              <span aria-hidden="true">🔒</span>{GAME_THEME}
            </div>
          </div>
          <Field label="เป้าหมายเกม" value={data.gameGoal} onChange={(v) => updateData({ gameGoal: v })} placeholder="เช่น หาตัวหมาป่าให้เจอก่อนหมู่บ้านถูกจับหมด" />
        </Section>
      )}

      {step === 3 && (
        <DoneScreen title="เสร็จพาร์ท 1 แล้ว!" subtitle="รอผู้สอนพาเข้าสู่คืนที่ 1 บนจอใหญ่">
          <SummaryCard rows={[['ชื่อเกม', data.gameName], ['ธีม', GAME_THEME], ['เป้าหมายเกม', data.gameGoal]]} />
        </DoneScreen>
      )}
    </PartShell>
  );
};

export default Part1;
