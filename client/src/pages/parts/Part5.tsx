import React, { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { usePartProgress, PartShell, Section, Note, Box, Quiz, Field, Chips, Label, SummaryCard, Loading, labelOf, toggleIn, isQuizCorrect, fmt, GOLD } from './kit';
import { PART_QUIZZES, PROBLEMS, STANCES, FREQUENCIES, OUTCOMES, GAME_THEME } from './content';

interface Part5Data {
  quizPicked: string | null;
  stars: number;
  problems: string[];
  improveText: string;
  signaled: boolean;
}

const EMPTY: Part5Data = { quizPicked: null, stars: 0, problems: [], improveText: '', signaled: false };
const LAST = 5;

const PresentTimer: React.FC = () => {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const color = seconds > 90 ? '#A8233A' : seconds >= 60 ? '#2F6B3A' : '#2B1D12';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', padding: '24px 16px', background: 'rgba(122,85,48,0.12)', border: '1px dashed rgba(122,85,48,0.45)', borderRadius: '10px' }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '52px', fontWeight: 'bold', color }}>{fmt(seconds)}</div>
      <div style={{ width: '100%', maxWidth: '360px', height: '10px', borderRadius: '999px', background: 'rgba(122,85,48,0.15)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, Math.round((seconds / 90) * 100))}%`, background: 'linear-gradient(90deg, #8A5A1E, #9D3543)', transition: 'width 1s linear' }} />
      </div>
      {!running && seconds === 0 && <button className="lh-sign" onClick={() => setRunning(true)}>เริ่มพูด</button>}
      {running && <button className="lh-sign lh-sign--quiet" onClick={() => setRunning(false)}>พูดจบแล้ว</button>}
      {!running && seconds > 0 && <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color }}>ใช้เวลา {seconds} วินาที {seconds >= 60 && seconds <= 90 ? '— พอดีเป๊ะ! 👏' : ''}</p>}
      <p style={{ margin: 0, fontSize: '13px', color: 'rgba(43,29,18,0.6)' }}>เป้าหมาย 60-90 วินาที (เขียว = อยู่ในช่วง)</p>
    </div>
  );
};

const Part5: React.FC<{ houseId: number }> = ({ houseId }) => {
  const { session } = useSocket();
  const { loaded, step, data, update, goStep, allParts } = usePartProgress<Part5Data>(houseId, 5, EMPTY, LAST);
  if (!loaded) return <Loading />;

  const p1 = allParts[1]?.data || {};
  const p2 = allParts[2]?.data || {};
  const p3 = allParts[3]?.data || {};
  const p4 = allParts[4]?.data || {};
  const house = session?.houses[houseId];

  let canAdvance = true;
  if (step === 1) canAdvance = !!data.quizPicked;
  if (step === 2) canAdvance = data.stars > 0;

  // Final 3-bucket result, all from real data:
  // ความรู้ = pretest correct (5) + each Part's understanding check (Part 2-5)
  // ภารกิจ = Parts finished (Part 5 counts once the team reaches this screen)
  // เหรียญจากบทบาท = the house's game score (pretest + night-mode steals)
  const quizCorrect = [2, 3, 4].filter((p) => isQuizCorrect(PART_QUIZZES[p], allParts[p]?.data?.quizPicked)).length
    + (isQuizCorrect(PART_QUIZZES[5], data.quizPicked) ? 1 : 0);
  const knowledge = (house?.correctAnswers || 0) + quizCorrect;
  const missions = [1, 2, 3, 4].filter((p) => allParts[p]?.completedAt).length + 1;
  const bars = [
    { label: 'คะแนนความรู้', value: knowledge, max: 9, unit: `${knowledge} / 9 ข้อ`, color: GOLD },
    { label: 'คะแนนภารกิจ', value: missions, max: 5, unit: `${missions} / 5 พาร์ท`, color: '#2F6B3A' },
    { label: 'เหรียญจากบทบาท', value: Math.max(0, house?.score || 0), max: 1000, unit: `${house?.score || 0} เหรียญ`, color: '#9D3543' }
  ];

  return (
    <PartShell part={5} title="ห้องทดสอบและเล่าเรื่อง" step={step} totalSteps={LAST + 1} canAdvance={canAdvance}
      nextLabel={step === LAST - 1 ? 'ดูผลสรุป' : 'ถัดไป'} onBack={() => goStep(step - 1)} onNext={() => goStep(step + 1)}>

      {step === 0 && (
        <Section title="ด่านสุดท้ายแล้ว 🎉">
          <Note>เป้าหมายของพาร์ทนี้คือทดลองเล่นเกมของทีม แล้วเตรียมพรีเซนต์ให้เพื่อนทั้งห้องฟัง</Note>
        </Section>
      )}

      {step === 1 && (
        <Section title="ด่านที่ 1 — การทดสอบเกม (Playtest)">
          <Box>
            <div><strong style={{ color: GOLD }}>Playtest</strong> คือการทดลองเล่นเกมก่อนเผยแพร่จริง เพื่อดูว่าเล่นได้จริงไหม สนุกไหม</div>
            <div>ตัวชี้วัดง่าย ๆ: <strong>เข้าใจกติกาไหม? มีช่วงเบื่อไหม? อยากเล่นซ้ำไหม?</strong></div>
          </Box>
          <Quiz quiz={PART_QUIZZES[5]} picked={data.quizPicked} onPick={(id) => update({ quizPicked: id })} seed={`house-${houseId}`} />
        </Section>
      )}

      {step === 2 && (
        <Section title="ด่านที่ 2 — กรอกผล Playtest">
          <Note>ลองเล่นเกมตัวเองสั้น ๆ (หรือให้เพื่อนทีมอื่นลองเล่น) แล้วกรอกผลด้านล่าง</Note>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Label>ให้คะแนนความสนุก</Label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} aria-label={`${n} ดาว`} onClick={() => update({ stars: n })} style={{
                  width: '48px', height: '48px', borderRadius: '12px', border: '1px solid rgba(122,85,48,0.3)', fontSize: '22px', cursor: 'pointer',
                  background: n <= data.stars ? 'rgba(122,85,48,0.25)' : 'rgba(122,85,48,0.1)', color: n <= data.stars ? GOLD : 'rgba(43,29,18,0.3)'
                }}>★</button>
              ))}
            </div>
          </div>
          <Chips label="ปัญหาที่เจอ (เลือกได้หลายอัน)" options={PROBLEMS} value={data.problems} onToggle={(o) => update((d) => ({ problems: toggleIn(d.problems, o) }))} />
          <Field label="สิ่งที่จะปรับถ้ามีเวลาเพิ่ม" value={data.improveText} onChange={(v) => update({ improveText: v })} placeholder="เช่น ลดเวลาต่อตาให้สั้นลง" />
        </Section>
      )}

      {step === 3 && (
        <Section title="ด่านที่ 3 — Team Dossier (โน้ตพูด)">
          <Note>ใช้หน้านี้เป็นโน้ตตอนพรีเซนต์ ระบบรวมงานของทีมจากทุกพาร์ทมาให้แล้ว</Note>
          <SummaryCard rows={[
            ['ชื่อเกม / เป้าหมาย', p1.gameName ? `${p1.gameName} — ${p1.gameGoal || ''}` : ''],
            ['ธีม', GAME_THEME],
            ['ตัวละครเสริม', p2.charName ? `${p2.charName} (${(p2.traits || []).join(', ')} · ${labelOf(STANCES, p2.stance)})` : ''],
            ['ความสามารถ', p3.abilityName ? `${p3.abilityName} — ${labelOf(FREQUENCIES, p3.frequency)}, ${labelOf(OUTCOMES, p3.outcome)}: ${p3.abilityDesc || ''}` : ''],
            ['กลไก / กฎ', p3.drawnMechanic ? `${p3.drawnMechanic} / ${p3.drawnRule || ''}` : ''],
            ['ผู้เล่น / อุปกรณ์', p4.players ? `${p4.players} · ${(p4.equipment || []).join(', ')}` : ''],
            ['เงื่อนไขชนะ', p4.winCondition]
          ]} />
          <Box highlight>
            <div style={{ fontSize: '11px', color: GOLD, fontWeight: 'bold' }}>ผล PLAYTEST</div>
            <div>ความสนุก: {'★'.repeat(data.stars)} ({data.stars} / 5)</div>
            <div>ปัญหาที่เจอ: {data.problems.join(', ') || '—'}</div>
            <div>สิ่งที่จะปรับ: {data.improveText || '—'}</div>
          </Box>
        </Section>
      )}

      {step === 4 && (
        <Section title="ด่านที่ 4 — พูดนำเสนอ 60-90 วินาที">
          <Note>อ่าน Team Dossier แล้วพูดสด ระบบไม่ตัดจบอัตโนมัติ กะจังหวะเอง</Note>
          <PresentTimer />
        </Section>
      )}

      {step === LAST && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center', padding: '12px 0' }}>
          <img src={`/houses/${houseId}.png`} alt="" className="lh-house is-lit" style={{ width: '180px', margin: '-24px 0 -36px' }} />
          <h3 className="lh-display" style={{ margin: 0, fontSize: '22px' }}>ทีมออกแบบเกมของตัวเองสำเร็จ!</h3>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {bars.map((b) => (
              <div key={b.label} style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  <span style={{ color: GOLD }}>{b.label}</span><span>{b.unit}</span>
                </div>
                <div style={{ height: '14px', borderRadius: '999px', background: 'rgba(122,85,48,0.12)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (b.value / b.max) * 100)}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
          {!data.signaled ? (
            <button className="lh-sign lh-sign--hood lh-glow-pulse" onClick={() => update({ signaled: true })}>ส่งสัญญาณจบกิจกรรมให้ครู</button>
          ) : (
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#2F6B3A' }}>✓ ส่งสัญญาณแล้ว รอผู้สอนพาเข้าสู่คืนสุดท้าย แล้วตามด้วย Posttest</p>
          )}
        </div>
      )}
    </PartShell>
  );
};

export default Part5;
