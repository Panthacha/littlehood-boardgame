import React from 'react';
import { usePartProgress, PartShell, Section, Note, Box, Quiz, Field, Chips, SummaryCard, DoneScreen, Loading, labelOf, toggleIn, GOLD } from './kit';
import { PART_QUIZZES, EQUIPMENT, STANCES, FREQUENCIES, OUTCOMES, GAME_THEME } from './content';

interface Part4Data {
  quizPicked: string | null;
  players: string;
  equipment: string[];
  winCondition: string;
}

const EMPTY: Part4Data = { quizPicked: null, players: '', equipment: [], winCondition: '' };
const LAST = 4;

const Part4: React.FC<{ houseId: number }> = ({ houseId }) => {
  const { loaded, step, data, update, goStep, allParts } = usePartProgress<Part4Data>(houseId, 4, EMPTY, LAST);
  if (!loaded) return <Loading />;

  const p1 = allParts[1]?.data || {};
  const p2 = allParts[2]?.data || {};
  const p3 = allParts[3]?.data || {};

  let canAdvance = true;
  if (step === 1) canAdvance = !!data.quizPicked;
  if (step === 3) canAdvance = !!(data.players.trim() && data.equipment.length && data.winCondition.trim());

  return (
    <PartShell part={4} title="ห้องประกอบต้นแบบ — Blueprint" step={step} totalSteps={LAST + 1} canAdvance={canAdvance}
      nextLabel={step === LAST - 1 ? 'เสร็จสิ้นพาร์ท 4' : 'ถัดไป'} onBack={() => goStep(step - 1)} onNext={() => goStep(step + 1)}>

      {step === 0 && (
        <Section title="มารวมร่างกันเถอะ">
          <Note>พาร์ทนี้จะ "รวมร่าง" ทุกอย่างที่ทีมทำมาตั้งแต่ Part 1-3 ให้เป็นแบบร่างเกมฉบับสมบูรณ์ แล้วเติมส่วนที่ยังขาดให้ครบ</Note>
        </Section>
      )}

      {step === 1 && (
        <Section title="ด่านที่ 1 — design draft ที่ดีต้องมีอะไรบ้าง">
          <Box>
            <div>แบบร่างเกมที่ดีต้องทำให้ <strong style={{ color: GOLD }}>คนอื่นเข้าใจเกมได้ทันที โดยไม่ต้องถามเพิ่ม</strong> — ธีม เรื่องราว กลไก กฎ อุปกรณ์ และเงื่อนไขชนะ ต้องครบและชัดเจน</div>
          </Box>
          <Quiz quiz={PART_QUIZZES[4]} picked={data.quizPicked} onPick={(id) => update({ quizPicked: id })} seed={`house-${houseId}`} />
        </Section>
      )}

      {step === 2 && (
        <Section title="ด่านที่ 2 — Blueprint ของทีมคุณ">
          <Note>ระบบดึงสิ่งที่ทีมทำไว้ใน Part 1-3 มารวมให้อัตโนมัติ</Note>
          <SummaryCard rows={[
            ['จาก Part 1 — ชื่อเกม', p1.gameName],
            ['ธีม', GAME_THEME],
            ['เป้าหมาย', p1.gameGoal]
          ]} />
          <SummaryCard rows={[
            ['จาก Part 2 — ตัวละครเสริม', p2.charName],
            ['นิสัย / จุดยืน', p2.charName ? `${(p2.traits || []).join(', ')} / ${labelOf(STANCES, p2.stance)}` : ''],
            ['เรื่องราว', p2.story]
          ]} />
          <SummaryCard rows={[
            ['จาก Part 3 — ความสามารถ', p3.abilityName],
            ['ความถี่ / ผลลัพธ์', p3.abilityName ? `${labelOf(FREQUENCIES, p3.frequency)} / ${labelOf(OUTCOMES, p3.outcome)}` : ''],
            ['คำอธิบาย', p3.abilityDesc]
          ]} />
        </Section>
      )}

      {step === 3 && (
        <Section title="ด่านที่ 3 — เติมส่วนที่ยังขาด">
          <Field label="จำนวนผู้เล่น" value={data.players} onChange={(v) => update({ players: v })} placeholder="เช่น 4-6 คน" />
          <Chips label="อุปกรณ์ที่ต้องใช้ (เลือกได้หลายอัน)" options={EQUIPMENT} value={data.equipment} onToggle={(o) => update((d) => ({ equipment: toggleIn(d.equipment, o) }))} />
          <Field label="เงื่อนไขชนะ (สรุป 1 ประโยค)" value={data.winCondition} onChange={(v) => update({ winCondition: v })} placeholder="เช่น ทีมที่เก็บคะแนนครบ 10 แต้มก่อนชนะ" />
        </Section>
      )}

      {step === LAST && (
        <DoneScreen title="Blueprint ฉบับเต็มของทีมพร้อมแล้ว!" subtitle="รอผู้สอนพาเข้าสู่คืนที่ 4 บนจอใหญ่ — Blueprint นี้จะถูกใช้ต่อใน Part 5 (Team Dossier)">
          <SummaryCard rows={[
            ['ชื่อเกม', p1.gameName],
            ['จำนวนผู้เล่น', data.players],
            ['อุปกรณ์', data.equipment.join(', ')],
            ['เงื่อนไขชนะ', data.winCondition]
          ]} />
        </DoneScreen>
      )}
    </PartShell>
  );
};

export default Part4;
