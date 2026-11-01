import React from 'react';
import { usePartProgress, PartShell, Section, Note, Box, Quiz, Field, Pills, CountdownTimer, SummaryCard, DoneScreen, Loading, labelOf } from './kit';
import { PART_QUIZZES, MECHANICS, FREQUENCIES, OUTCOMES, STANCES } from './content';

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
  const { loaded, step, data, update, goStep, allParts } = usePartProgress<Part3Data>(houseId, 3, EMPTY, LAST);
  if (!loaded) return <Loading />;

  const p2 = allParts[2]?.data || {};
  let canAdvance = true;
  if (step === 1) canAdvance = !!data.quizPicked;
  if (step === 3) canAdvance = !!(data.drawnMechanic.trim() && data.drawnRule.trim() && data.applyIdea.trim());
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
        <Section title="ด่านที่ 2 — จั่วการ์ด Mechanic / Rule">
          <Box>
            <div>1. หยิบการ์ด 1 ใบจากกอง <strong>Mechanic</strong></div>
            <div>2. หยิบการ์ด 1 ใบจากกอง <strong>Rule</strong></div>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>จับคู่ 2 ใบนี้เข้าด้วยกัน แล้วคุยกันว่าจะเอามาปรับใช้กับ{p2.charName ? ` "${p2.charName}"` : 'ตัวละครเสริม'}ยังไง — เมื่อพร้อมแล้วกดเริ่มจับเวลา</div>
          </Box>
          <CountdownTimer seconds={180} doneText="หมดเวลา! ไปสรุปผลกันต่อได้เลย" />
        </Section>
      )}

      {step === 3 && (
        <Section title="ด่านที่ 3 — สรุปกลไก+กฎที่จั่วได้">
          <Field label="กลไกที่จั่วได้" value={data.drawnMechanic} onChange={(v) => update({ drawnMechanic: v })} placeholder="เช่น ซ่อนข้อมูล" />
          <Field label="กฎที่จั่วได้" value={data.drawnRule} onChange={(v) => update({ drawnRule: v })} placeholder="เช่น เปิดเผยข้อมูลได้แค่คนเดียว" />
          <Field label="จะเอามาปรับใช้กับตัวละครเสริมยังไง" value={data.applyIdea} onChange={(v) => update({ applyIdea: v })} placeholder="เช่น ให้ตัวละครแอบดูข้อมูลได้คนเดียวตอนกลางคืน" />
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
