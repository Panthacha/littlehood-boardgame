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

export const TRAITS = ['ใจดี', 'กล้าหาญ', 'ขี้สงสัย', 'ลึกลับ', 'เจ้าเล่ห์', 'ขี้อาย', 'ซื่อสัตย์', 'ขี้เล่น'];
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
export const CHECKLIST = [
  { id: 'board', label: 'ร่างบอร์ด' },
  { id: 'cards', label: 'ทำการ์ด' },
  { id: 'tokens', label: 'ทำโทเค็น' },
  { id: 'playtest', label: 'ทดลองเล่นเอง' }
];
export const PROBLEMS = ['กติกาสับสน', 'เล่นนานไป', 'ไม่มีใครอยากเล่นซ้ำ', 'ไม่มีปัญหา'];
