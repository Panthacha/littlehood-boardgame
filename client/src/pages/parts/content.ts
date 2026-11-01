import type { QuizDef } from './kit';

// Content for Parts 2-5, taken from the approved Claude Design prototypes.
// Quizzes live here (not inside each Part) so Part 5 can score them all.

export const PART_QUIZZES: Record<number, QuizDef> = {
  2: {
    question: 'ข้อใดอธิบาย "เนื้อเรื่อง (Story)" ได้ถูกต้องที่สุด?',
    options: [
      { id: 'a', text: 'กฎกติกาที่บอกว่าทอยเต๋าได้กี่ครั้ง', correct: false },
      { id: 'b', text: 'สิ่งที่ห่อหุ้มกลไกให้มีความหมายและอยากเล่นต่อ', correct: true },
      { id: 'c', text: 'ราคาขายของกล่องเกม', correct: false }
    ]
  },
  3: {
    question: 'ข้อใดคือตัวอย่างของ "กฎ (Rule)" ไม่ใช่ "กลไก (Mechanic)"?',
    options: [
      { id: 'a', text: 'ผู้เล่นทอยเต๋าเพื่อเคลื่อนที่', correct: false },
      { id: 'b', text: 'ห้ามเคลื่อนที่เกิน 6 ช่องต่อตา', correct: true },
      { id: 'c', text: 'ผู้เล่นจั่วการ์ดจากกองกลาง', correct: false }
    ]
  },
  4: {
    question: 'ข้อใดคือ design draft ที่ดี?',
    options: [
      { id: 'a', text: 'มีแค่ชื่อเกมอย่างเดียว', correct: false },
      { id: 'b', text: 'ธีม กลไก กฎ อุปกรณ์ และเงื่อนไขชนะครบถ้วน ชัดเจน', correct: true },
      { id: 'c', text: 'มีแค่ภาพประกอบสวย ๆ', correct: false }
    ]
  },
  5: {
    question: 'ข้อใดคือตัวชี้วัดความสนุกที่ใช้ดูได้ง่าย ๆ ตอน playtest?',
    options: [
      { id: 'a', text: 'ราคาของเกม', correct: false },
      { id: 'b', text: 'ผู้เล่นเข้าใจกติกาไหม มีช่วงเบื่อไหม อยากเล่นซ้ำไหม', correct: true },
      { id: 'c', text: 'จำนวนหน้าในคู่มือการเล่น', correct: false }
    ]
  }
};

export const TRAITS = [
  'ใจดี', 'กล้าหาญ', 'ขี้สงสัย', 'ลึกลับ', 'เจ้าเล่ห์', 'ขี้อาย', 'ซื่อสัตย์', 'ขี้เล่น',
  'ฉลาด', 'ใจร้อน', 'ใจเย็น', 'ขี้กลัว', 'ขี้โม้', 'ขี้เกียจ', 'ขยัน', 'ช่างพูด',
  'เงียบขรึม', 'อารมณ์ดี', 'หัวรั้น', 'ช่างสังเกต', 'เอาแต่ใจ', 'มีน้ำใจ', 'โลภ', 'ขี้ระแวง',
  'ซุ่มซ่าม', 'รอบคอบ', 'ชอบผจญภัย', 'ขี้บ่น', 'ใจกว้าง', 'ขี้อิจฉา', 'มั่นใจในตัวเอง', 'ชอบช่วยเหลือ',
  'ขี้หลงขี้ลืม', 'เป็นผู้นำ', 'รักสัตว์', 'เจ้าระเบียบ'
];
export const STANCES = [
  { id: 'help', label: 'ฝ่ายช่วยหนูน้อย' },
  { id: 'neutral', label: 'ฝ่ายเป็นกลาง' },
  { id: 'mystery', label: 'ฝ่ายลึกลับ' }
];
export const MECHANICS = ['ทอยเต๋า', 'จั่วการ์ด', 'วางตำแหน่ง', 'ต่อรอง', 'ซ่อนข้อมูล'];
export const FREQUENCIES = [
  { id: 'every_night', label: 'ใช้ได้ทุกคืน' },
  { id: 'once', label: 'ใช้ได้ครั้งเดียว' },
  { id: 'day', label: 'ใช้ตอนกลางวัน' }
];
export const OUTCOMES = [
  { id: 'help', label: 'ช่วยเหลือ' },
  { id: 'hinder', label: 'ขัดขวาง' },
  { id: 'reveal', label: 'เปิดเผยข้อมูล' }
];
export const EQUIPMENT = ['บอร์ด', 'การ์ด', 'โทเค็น', 'ลูกเต๋า', 'อื่น ๆ'];
export const PROBLEMS = ['กติกาสับสน', 'เล่นนานไป', 'ไม่มีใครอยากเล่นซ้ำ', 'ไม่มีปัญหา'];

// Part 3 digital card decks. Each house draws one card from each deck; the
// decks are shuffled per game and dealt so no two houses get the same card
// (both decks have more than 6 cards).
export const MECHANIC_CARDS = [
  { title: 'ทอยเต๋าเดิน', desc: 'ทอยลูกเต๋าแล้วเดินตามแต้มที่ได้' },
  { title: 'จั่วการ์ด', desc: 'จั่วการ์ดจากกองกลางเพื่อรับพลังหรือเหตุการณ์' },
  { title: 'วางตำแหน่ง', desc: 'วางตัวหมากลงบนช่องเพื่อยึดพื้นที่หรือทำงาน' },
  { title: 'ต่อรองแลกเปลี่ยน', desc: 'ผู้เล่นคุยตกลงแลกของหรือช่วยเหลือกัน' },
  { title: 'บทบาทลับ', desc: 'แต่ละคนมีบทบาทที่คนอื่นไม่รู้ ต้องเดาจากเบาะแส' },
  { title: 'เก็บสะสมชุด', desc: 'รวบรวมการ์ดหรือของให้ครบชุดเพื่อรับแต้ม' },
  { title: 'ร่วมมือกัน', desc: 'ทุกคนอยู่ทีมเดียวกัน ชนะหรือแพ้ไปด้วยกัน' },
  { title: 'แข่งเข้าเส้นชัย', desc: 'ใครเดินถึงปลายทางก่อนเป็นผู้ชนะ' },
  { title: 'ประมูล', desc: 'เสนอราคาแข่งกันเพื่อให้ได้ของที่ต้องการ' }
];

export const RULE_CARDS = [
  { title: 'ตาละครั้ง', desc: 'ใช้ความสามารถได้แค่ 1 ครั้งต่อตา' },
  { title: 'ห้ามบอกใคร', desc: 'ห้ามเปิดเผยข้อมูลในมือให้คนอื่นเห็น' },
  { title: 'ได้หกเล่นต่อ', desc: 'ถ้าทอยได้ 6 ได้เล่นอีกหนึ่งตา' },
  { title: 'มีค่าใช้จ่าย', desc: 'ต้องจ่าย 1 เหรียญทุกครั้งที่ใช้พลัง' },
  { title: 'มือจำกัด', desc: 'ถือการ์ดในมือได้ไม่เกิน 3 ใบ' },
  { title: 'จับเวลา', desc: 'ต้องตัดสินใจให้เสร็จภายใน 10 วินาที' },
  { title: 'แลกเฉพาะเพื่อนบ้าน', desc: 'แลกเปลี่ยนได้เฉพาะกับคนที่นั่งข้าง ๆ' },
  { title: 'ผิดกติกาถอยหลัง', desc: 'ถ้าทำผิดกติกา ต้องถอยหลัง 2 ช่อง' },
  { title: 'เฉพาะกลางคืน', desc: 'ใช้ความสามารถพิเศษได้เฉพาะตอนกลางคืน' }
];

// The game's theme is fixed — every team designs inside the Little Red Riding
// Hood world, so Part 1 shows it locked instead of asking for one.
export const GAME_THEME = 'หนูน้อยหมวกแดง';
