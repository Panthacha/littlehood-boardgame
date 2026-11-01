import React from 'react';
import { usePartProgress, PartShell, Section, Note, Box, Quiz, Field, Chips, Pills, SummaryCard, DoneScreen, Loading, labelOf, toggleIn } from './kit';
import { PART_QUIZZES, TRAITS, STANCES, CHARACTER_CARDS, SETTING_CARDS, PROBLEM_CARDS } from './content';
import { useSocket } from '../../context/SocketContext';
import { Deck, dealFor } from './CardDraw';

interface Part2Data {
  quizPicked: string | null;
  drawnCharacter: string; // Character card drawn on screen
  cardScene: string; // Setting card drawn on screen
  cardProblem: string; // Problem card drawn on screen
  cardConnection: string;
  charName: string;
  traits: string[];
  stance: string | null;
  story: string;
}

const EMPTY: Part2Data = { quizPicked: null, drawnCharacter: '', cardScene: '', cardProblem: '', cardConnection: '', charName: '', traits: [], stance: null, story: '' };
const LAST = 5;

// Character cards: /characters/<id>.webp, from the artwork in "charactor/".
const REF_CHARACTERS = [
  { id: 'hood', label: 'หนูน้อยหมวกแดง' },
  { id: 'grandma', label: 'คุณยาย' },
  { id: 'wolf', label: 'หมาป่า' }
];

const Part2: React.FC<{ houseId: number }> = ({ houseId }) => {
  const { session } = useSocket();
  const { loaded, step, data, update, goStep, allParts } = usePartProgress<Part2Data>(houseId, 2, EMPTY, LAST);
  if (!loaded) return <Loading />;

  const gameName = allParts[1]?.data?.gameName;
  let canAdvance = true;
  if (step === 1) canAdvance = !!data.quizPicked;
  if (step === 2) canAdvance = !!(data.drawnCharacter && data.cardScene && data.cardProblem);
  if (step === 3) canAdvance = !!data.cardConnection.trim();

  // Each game deals the decks differently; each house gets its own cards.
  const seed = session?.id || 'littlehood';
  const characterCard = dealFor(CHARACTER_CARDS, `${seed}:character`, houseId);
  const settingCard = dealFor(SETTING_CARDS, `${seed}:setting`, houseId);
  const problemCard = dealFor(PROBLEM_CARDS, `${seed}:problem`, houseId);
  const descOf = (deck: { title: string; desc: string }[], title: string) => deck.find(c => c.title === title)?.desc;
  if (step === 4) canAdvance = !!(data.charName.trim() && data.traits.length && data.stance && data.story.trim());

  return (
    <PartShell part={2} title="ห้องเขียนเรื่อง — ตัวตนตัวละครเสริม" step={step} totalSteps={LAST + 1} canAdvance={canAdvance}
      nextLabel={step === LAST - 1 ? 'เสร็จสิ้นพาร์ท 2' : 'ถัดไป'} onBack={() => goStep(step - 1)} onNext={() => goStep(step + 1)}>

      {step === 0 && (
        <Section title="ทีมพิสูจน์ตัวแล้วที่ห้องแล็บ 🔬">
          {gameName && <Box highlight>เกมของทีมคุณจาก Part 1: <strong>{gameName}</strong></Box>}
          <Note>ตอนนี้ถึงเวลาเข้าป่าจริง — ในป่าแห่งนี้มีตัวละครหลัก 3 ตัวที่ล็อกไว้แล้ว ใช้เป็นแนวทางก่อนออกแบบตัวละครเสริมของทีมคุณเอง</Note>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
            {REF_CHARACTERS.map((c) => (
              <div key={c.label} className="lh-rise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                <img src={`/characters/${c.id}.webp`} alt={c.label} style={{ width: '100%', aspectRatio: '1055 / 1491', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 6px 14px rgba(60,30,10,0.45)' }} />
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{c.label}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {step === 1 && (
        <Section title="ด่านที่ 1 — แนวคิด/เนื้อเรื่องคืออะไร">
          <Box>
            <div><strong style={{ color: '#8A5A1E' }}>Concept</strong> คือแก่นของเกม — ไอเดียหลักที่ทุกอย่างในเกมต้องสอดคล้องกัน</div>
            <div><strong style={{ color: '#8A5A1E' }}>Story</strong> คือสิ่งที่ห่อหุ้มกลไก (mechanic) ให้มีความหมาย ทำให้ผู้เล่นอยากเล่นต่อ ไม่ใช่แค่ทำตามกฎเฉย ๆ</div>
          </Box>
          <Box>
            <div><strong>Catan</strong> — เนื้อเรื่องตั้งถิ่นฐานบนเกาะ ห่อหุ้มกลไกแลกเปลี่ยนทรัพยากร</div>
            <div><strong>Pandemic</strong> — เนื้อเรื่องควบคุมโรคระบาด ห่อหุ้มกลไกร่วมมือกันแก้ปัญหา</div>
            <div><strong>Ticket to Ride</strong> — เนื้อเรื่องเชื่อมเส้นทางรถไฟ ห่อหุ้มกลไกวางแผนเส้นทาง</div>
          </Box>
          <Quiz quiz={PART_QUIZZES[2]} picked={data.quizPicked} onPick={(id) => update({ quizPicked: id })} seed={`house-${houseId}`} />
        </Section>
      )}

      {step === 2 && (
        <Section title="ด่านที่ 2 — จั่วการ์ด Character / Setting / Problem">
          <Note>สับไพ่ทั้ง 3 กอง แล้วเลือกมากองละ 1 ใบ — แต่ละบ้านจะได้การ์ดไม่ซ้ำกัน</Note>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
            <Deck label="ตัวละคร" color="#8A5A1E" dark="#4E3210" dealt={characterCard} drawn={data.drawnCharacter || null}
              onDraw={(t) => update({ drawnCharacter: t })} />
            <Deck label="สถานที่" color="#2F6B3A" dark="#163A1C" dealt={settingCard} drawn={data.cardScene || null}
              onDraw={(t) => update({ cardScene: t })} />
            <Deck label="ปัญหา" color="#8E1B2C" dark="#5A0E1A" dealt={problemCard} drawn={data.cardProblem || null}
              onDraw={(t) => update({ cardProblem: t })} />
          </div>
        </Section>
      )}

      {step === 3 && (
        <Section title="ด่านที่ 3 — ผสมการ์ดเป็นตัวละครเสริม">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            <Box><div style={{ fontSize: '12px', fontWeight: 700, color: '#8A5A1E' }}>ตัวละคร</div><div className="lh-display" style={{ fontSize: '16px' }}>{data.drawnCharacter}</div><div style={{ fontSize: '12px', color: 'var(--lh-ink-soft)' }}>{descOf(CHARACTER_CARDS, data.drawnCharacter)}</div></Box>
            <Box><div style={{ fontSize: '12px', fontWeight: 700, color: '#2F6B3A' }}>สถานที่</div><div className="lh-display" style={{ fontSize: '16px' }}>{data.cardScene}</div><div style={{ fontSize: '12px', color: 'var(--lh-ink-soft)' }}>{descOf(SETTING_CARDS, data.cardScene)}</div></Box>
            <Box><div style={{ fontSize: '12px', fontWeight: 700, color: '#8E1B2C' }}>ปัญหา</div><div className="lh-display" style={{ fontSize: '16px' }}>{data.cardProblem}</div><div style={{ fontSize: '12px', color: 'var(--lh-ink-soft)' }}>{descOf(PROBLEM_CARDS, data.cardProblem)}</div></Box>
          </div>
          <Field multiline label="ตัวละครนี้เกี่ยวข้องกับโลกหนูน้อยหมวกแดงยังไง" value={data.cardConnection} onChange={(v) => update({ cardConnection: v })} placeholder="เช่น อยู่ฝั่งตะวันออกของป่า ใกล้บ้านคุณยาย และเคยช่วยหนูน้อยหาทางกลับบ้าน" />
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
            ['การ์ดที่จั่ว', `${data.drawnCharacter} · ${data.cardScene} · ${data.cardProblem}`],
            ['เรื่องราว', data.story]
          ]} />
        </DoneScreen>
      )}
    </PartShell>
  );
};

export default Part2;
