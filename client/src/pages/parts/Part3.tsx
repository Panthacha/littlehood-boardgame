import React from 'react';
import { usePartProgress, PartShell, Section, Note, Box, Quiz, Field, Pills, SummaryCard, DoneScreen, Loading, labelOf } from './kit';
import { useSocket } from '../../context/SocketContext';
import { Deck, dealFor } from './CardDraw';
import { PART_QUIZZES, MECHANICS, FREQUENCIES, OUTCOMES, STANCES, MECHANIC_CARDS, RULE_CARDS } from './content';

interface Part3Data {
  quizPicked: string | null;
  drawnMechanic: string;
  drawnRule: string;
  applyIdea: string;
  frequency: string | null;
  outcome: string | null;
  abilityName: string;
  abilityDesc: string;
  balance1: string;
  balance2: string;
}

const EMPTY: Part3Data = { quizPicked: null, drawnMechanic: '', drawnRule: '', applyIdea: '', frequency: null, outcome: null, abilityName: '', abilityDesc: '', balance1: '', balance2: '' };
const LAST = 6;
const MONO_COLORS = ['#9D3543', '#2D5A27', '#3A3A3A', '#B88645', '#2D5A27'];

const Part3: React.FC<{ houseId: number }> = ({ houseId }) => {
  const { session } = useSocket();
  const { loaded, step, data, update, goStep, allParts } = usePartProgress<Part3Data>(houseId, 3, EMPTY, LAST);
  if (!loaded) return <Loading />;

  const p2 = allParts[2]?.data || {};
  let canAdvance = true;
  if (step === 1) canAdvance = !!data.quizPicked;
  if (step === 2) canAdvance = !!(data.drawnMechanic && data.drawnRule);
  if (step === 3) canAdvance = !!data.applyIdea.trim();

  // Each game deals the decks differently; each house gets its own card.
  const seed = session?.id || 'littlehood';
  const mechanicCard = dealFor(MECHANIC_CARDS, `${seed}:mechanic`, houseId);
  const ruleCard = dealFor(RULE_CARDS, `${seed}:rule`, houseId);
  if (step === 4) canAdvance = !!(data.frequency && data.outcome && data.abilityName.trim() && data.abilityDesc.trim());
  if (step === 5) canAdvance = !!(data.balance1.trim() && data.balance2.trim());

  return (
    <PartShell part={3} title="ห้องออกแบบกติกา — กลไก & กฎ" step={step} totalSteps={LAST + 1} canAdvance={canAdvance}
      nextLabel={step === LAST - 1 ? 'เสร็จสิ้นพาร์ท 3' : 'ถัดไป'} onBack={() => goStep(step - 1)} onNext={() => goStep(step + 1)}>

      {step === 0 && (
        <Section title="ตัวตนตัวละครเสริมของทีมคุณ (จาก Part 2)">
          <SummaryCard rows={[
            ['ชื่อ', p2.charName],
            ['นิสัย', (p2.traits || []).join(', ')],
            ['จุดยืน', labelOf(STANCES, p2.stance)]
          ]} />
          <Note>ตอนนี้มาออกแบบกันว่าตัวละครนี้ "เล่นยังไง" ในเกม ให้สอดคล้องกับตัวตนที่สร้างไว้</Note>
        </Section>
      )}

      {step === 1 && (
        <Section title="ด่านที่ 1 — กลไกคืออะไร">
          <Box>
            <div><strong style={{ color: '#8A5A1E' }}>Mechanic</strong> คือวิธีที่ผู้เล่นโต้ตอบกับเกม</div>
            <div><strong style={{ color: '#8A5A1E' }}>Rule</strong> คือข้อกำหนดที่ควบคุมกลไกนั้นให้เล่นได้จริง</div>
          </Box>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
            {MECHANICS.map((m, i) => (
              <div key={m} style={{ background: 'rgba(122,85,48,0.1)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: MONO_COLORS[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>{m.slice(0, 2)}</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{m}</div>
              </div>
            ))}
          </div>
          <Quiz quiz={PART_QUIZZES[3]} picked={data.quizPicked} onPick={(id) => update({ quizPicked: id })} />
        </Section>
      )}

      {step === 2 && (
        <Section title="ด่านที่ 2 — จั่วการ์ดกลไก & กฎ">
          <Note>สับไพ่ทั้ง 2 กอง แล้วเลือกมากองละ 1 ใบ — แต่ละบ้านจะได้การ์ดไม่ซ้ำกัน</Note>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
            <Deck label="กลไก" color="#2F6B3A" dark="#163A1C" dealt={mechanicCard} drawn={data.drawnMechanic || null}
              onDraw={(t) => update({ drawnMechanic: t })} />
            <Deck label="กฎ" color="#8E1B2C" dark="#5A0E1A" dealt={ruleCard} drawn={data.drawnRule || null}
              onDraw={(t) => update({ drawnRule: t })} />
          </div>
        </Section>
      )}

      {step === 3 && (
        <Section title="ด่านที่ 3 — เอาการ์ดมาใช้กับตัวละคร">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
            <Box><div style={{ fontSize: '12px', fontWeight: 700, color: '#2F6B3A' }}>กลไกที่ได้</div><div className="lh-display" style={{ fontSize: '17px' }}>{data.drawnMechanic}</div><div style={{ fontSize: '13px', color: 'var(--lh-ink-soft)' }}>{MECHANIC_CARDS.find(c => c.title === data.drawnMechanic)?.desc}</div></Box>
            <Box><div style={{ fontSize: '12px', fontWeight: 700, color: '#8E1B2C' }}>กฎที่ได้</div><div className="lh-display" style={{ fontSize: '17px' }}>{data.drawnRule}</div><div style={{ fontSize: '13px', color: 'var(--lh-ink-soft)' }}>{RULE_CARDS.find(c => c.title === data.drawnRule)?.desc}</div></Box>
          </div>
          <Field multiline label={`จะเอามาปรับใช้กับ${p2.charName ? ` "${p2.charName}"` : 'ตัวละครเสริม'}ยังไง`} value={data.applyIdea} onChange={(v) => update({ applyIdea: v })} placeholder="เช่น ให้ตัวละครแอบดูข้อมูลได้คนเดียวตอนกลางคืน" />
        </Section>
      )}

      {step === 4 && (
        <Section title="ด่านที่ 4 — ออกแบบความสามารถตัวละคร">
          <Pills label="ความถี่ในการใช้" options={FREQUENCIES} value={data.frequency} onChange={(v) => update({ frequency: v })} />
          <Pills label="ผลลัพธ์ของความสามารถ" options={OUTCOMES} value={data.outcome} onChange={(v) => update({ outcome: v })} />
          <Field label="ชื่อความสามารถ" value={data.abilityName} onChange={(v) => update({ abilityName: v })} placeholder="เช่น ตาแห่งความมืด" />
          <Field multiline label="คำอธิบายวิธีใช้ (1-2 ประโยค)" value={data.abilityDesc} onChange={(v) => update({ abilityDesc: v })} placeholder="อธิบายว่าใช้ยังไง เมื่อไหร่..." />
        </Section>
      )}

      {step === 5 && (
        <Section title="ด่านที่ 5 — ลองตรวจสอบความสมดุลดู">
          <Note>ไม่มีคำตอบถูก/ผิด เป็นคำถามให้ลองคิดทบทวนความสามารถของทีม</Note>
          <Field label="ความสามารถนี้ใช้ได้กี่ครั้งต่อเกม เหมาะสมไหม?" value={data.balance1} onChange={(v) => update({ balance1: v })} />
          <Field label="ถ้าทุกทีมมีความสามารถนี้ เกมจะยังสนุกไหม เพราะอะไร?" value={data.balance2} onChange={(v) => update({ balance2: v })} />
        </Section>
      )}

      {step === LAST && (
        <DoneScreen title="ตัวละครเสริมฉบับเต็มของทีมพร้อมแล้ว!" subtitle="รอผู้สอนพาเข้าสู่คืนที่ 3 บนจอใหญ่ — ตัวตน + ความสามารถจะถูกรวมเป็น Blueprint ในพาร์ท 4">
          <SummaryCard rows={[
            ['ตัวละคร', p2.charName],
            ['ชื่อความสามารถ', data.abilityName],
            ['ความถี่ / ผลลัพธ์', `${labelOf(FREQUENCIES, data.frequency)} / ${labelOf(OUTCOMES, data.outcome)}`],
            ['คำอธิบาย', data.abilityDesc],
            ['กลไก + กฎ', `${data.drawnMechanic} + ${data.drawnRule}`]
          ]} />
        </DoneScreen>
      )}
    </PartShell>
  );
};

export default Part3;
