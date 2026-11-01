import React from 'react';
import { usePartProgress, PartShell, Section, Note, Box, Quiz, Field, Chips, Pills, CountdownTimer, SummaryCard, DoneScreen, Loading, labelOf, toggleIn } from './kit';
import { PART_QUIZZES, TRAITS, STANCES } from './content';

interface Part2Data {
  quizPicked: string | null;
  cardScene: string;
  cardProblem: string;
  cardConnection: string;
  charName: string;
  traits: string[];
  stance: string | null;
  story: string;
}

const EMPTY: Part2Data = { quizPicked: null, cardScene: '', cardProblem: '', cardConnection: '', charName: '', traits: [], stance: null, story: '' };
const LAST = 5;

const REF_CHARACTERS = [
  { label: 'หนูน้อยหมวกแดง', mono: 'หม', bg: '#9D3543' },
  { label: 'คุณยาย', mono: 'คย', bg: '#2D5A27' },
  { label: 'หมาป่า', mono: 'หป', bg: '#3A3A3A' }
];

const Part2: React.FC<{ houseId: number }> = ({ houseId }) => {
  const { loaded, step, data, update, goStep, allParts } = usePartProgress<Part2Data>(houseId, 2, EMPTY, LAST);
  if (!loaded) return <Loading />;

  const gameName = allParts[1]?.data?.gameName;
  let canAdvance = true;
  if (step === 1) canAdvance = !!data.quizPicked;
  if (step === 3) canAdvance = !!(data.cardScene.trim() && data.cardProblem.trim() && data.cardConnection.trim());
  if (step === 4) canAdvance = !!(data.charName.trim() && data.traits.length && data.stance && data.story.trim());

  return (
    <PartShell part={2} title="ห้องเขียนเรื่อง — ตัวตนตัวละครเสริม" step={step} totalSteps={LAST + 1} canAdvance={canAdvance}
      nextLabel={step === LAST - 1 ? 'เสร็จสิ้นพาร์ท 2' : 'ถัดไป'} onBack={() => goStep(step - 1)} onNext={() => goStep(step + 1)}>

      {step === 0 && (
        <Section title="ทีมพิสูจน์ตัวแล้วที่ห้องแล็บ 🔬">
          {gameName && <Box highlight>เกมของทีมคุณจาก Part 1: <strong>{gameName}</strong></Box>}
          <Note>ตอนนี้ถึงเวลาเข้าป่าจริง — ในป่าแห่งนี้มีตัวละครหลัก 3 ตัวที่ล็อกไว้แล้ว ใช้เป็นแนวทางก่อนออกแบบตัวละครเสริมของทีมคุณเอง</Note>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {REF_CHARACTERS.map((c) => (
              <div key={c.label} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(217,174,110,0.25)', borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontWeight: 'bold' }}>{c.mono}</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{c.label}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {step === 1 && (
        <Section title="ด่านที่ 1 — แนวคิด/เนื้อเรื่องคืออะไร">
          <Box>
            <div><strong style={{ color: '#D9AE6E' }}>Concept</strong> คือแก่นของเกม — ไอเดียหลักที่ทุกอย่างในเกมต้องสอดคล้องกัน</div>
            <div><strong style={{ color: '#D9AE6E' }}>Story</strong> คือสิ่งที่ห่อหุ้มกลไก (mechanic) ให้มีความหมาย ทำให้ผู้เล่นอยากเล่นต่อ ไม่ใช่แค่ทำตามกฎเฉย ๆ</div>
          </Box>
          <Box>
            <div><strong>Catan</strong> — เนื้อเรื่องตั้งถิ่นฐานบนเกาะ ห่อหุ้มกลไกแลกเปลี่ยนทรัพยากร</div>
            <div><strong>Pandemic</strong> — เนื้อเรื่องควบคุมโรคระบาด ห่อหุ้มกลไกร่วมมือกันแก้ปัญหา</div>
            <div><strong>Ticket to Ride</strong> — เนื้อเรื่องเชื่อมเส้นทางรถไฟ ห่อหุ้มกลไกวางแผนเส้นทาง</div>
          </Box>
          <Quiz quiz={PART_QUIZZES[2]} picked={data.quizPicked} onPick={(id) => update({ quizPicked: id })} />
        </Section>
      )}

      {step === 2 && (
        <Section title="ด่านที่ 2 — จั่วการ์ด Character / Setting / Problem">
          <Box>
            <div>1. หยิบการ์ด 1 ใบจากกอง <strong>Character</strong></div>
            <div>2. หยิบการ์ด 1 ใบจากกอง <strong>Setting</strong></div>
            <div>3. หยิบการ์ด 1 ใบจากกอง <strong>Problem</strong></div>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>คุยกันในทีมว่าจะเอา 3 อย่างนี้มาผสมกันเป็นตัวละครเสริมยังไง — เมื่อพร้อมแล้วกดเริ่มจับเวลา</div>
          </Box>
          <CountdownTimer seconds={180} doneText="หมดเวลา! สรุปผลกันในทีมแล้วไปขั้นต่อไปได้เลย" />
        </Section>
      )}

      {step === 3 && (
        <Section title="ด่านที่ 3 — สรุปผลจากการ์ด">
          <Field label="ฉาก/สถานที่ของตัวละครเสริม" value={data.cardScene} onChange={(v) => update({ cardScene: v })} placeholder="เช่น กระท่อมเก่าริมลำธาร" />
          <Field label="ปัญหา/สถานการณ์ที่ตัวละครเผชิญ" value={data.cardProblem} onChange={(v) => update({ cardProblem: v })} placeholder="เช่น หลงทางและหาทางกลับบ้านไม่เจอ" />
          <Field label="เกี่ยวข้องกับโลกหนูน้อยหมวกแดงยังไง" value={data.cardConnection} onChange={(v) => update({ cardConnection: v })} placeholder="เช่น อยู่ฝั่งตะวันออกของป่า ใกล้บ้านคุณยาย" />
        </Section>
      )}

      {step === 4 && (
        <Section title="ด่านที่ 4 — ออกแบบตัวตนตัวละครเสริม">
          <Field label="ชื่อตัวละคร" value={data.charName} onChange={(v) => update({ charName: v })} placeholder="เช่น ยายเฒ่าแห่งหนองน้ำ" />
          <Chips label="ลักษณะนิสัย (เลือกได้หลายอัน)" options={TRAITS} value={data.traits} onToggle={(o) => update((d) => ({ traits: toggleIn(d.traits, o) }))} />
          <Pills label="จุดยืน" options={STANCES} value={data.stance} onChange={(v) => update({ stance: v })} />
          <Field multiline label="เรื่องราวสั้น ๆ (2-3 บรรทัด) ว่าตัวละครนี้โผล่เข้ามาในเรื่องยังไง" value={data.story} onChange={(v) => update({ story: v })} placeholder="พิมพ์เรื่องราวของตัวละครที่นี่..." />
        </Section>
      )}

      {step === LAST && (
        <DoneScreen title="ตัวตนตัวละครเสริมของทีมพร้อมแล้ว!" subtitle="รอผู้สอนพาเข้าสู่คืนที่ 2 บนจอใหญ่ — พาร์ทหน้าจะมาออกแบบว่าตัวละครนี้เล่นยังไงในเกม">
          <SummaryCard rows={[
            ['ชื่อตัวละคร', data.charName],
            ['นิสัย', data.traits.join(', ')],
            ['จุดยืน', labelOf(STANCES, data.stance)],
            ['ฉาก / ปัญหา', `${data.cardScene} / ${data.cardProblem}`],
            ['เรื่องราว', data.story]
          ]} />
        </DoneScreen>
      )}
    </PartShell>
  );
};

export default Part2;
