import { Question } from './types';

export const questions: Question[] = [
  {
    id: 1,
    text: 'ข้อใดคือองค์ประกอบของบอร์ดเกม?',
    options: [
      { key: 'ก', text: 'เมาส์', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'ชิ้นส่วนและกติกา', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'ซีพียู', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'อีเมล', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ข',
    explanation: 'ชิ้นส่วนใช้ประกอบการเล่น ส่วนกติกากำหนดวิธีเล่นและเงื่อนไขของเกม'
  },
  {
    id: 2,
    text: 'เป้าหมายของเกมมีไว้เพื่ออะไร?',
    options: [
      { key: 'ก', text: 'ตกแต่ง', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'บอกผู้เล่นว่าต้องทำอะไรเพื่อชนะ', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'เพิ่มราคา', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'ทำให้กติกายาก', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ข',
    explanation: 'เป้าหมายช่วยให้ผู้เล่นเข้าใจว่าต้องทำอะไรและเกมตัดสินผลอย่างไร'
  },
  {
    id: 3,
    text: 'เกมที่ยุติธรรมหมายถึงอะไร?',
    options: [
      { key: 'ก', text: 'คนเล่นก่อนชนะเสมอ', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'ผู้เล่นมีโอกาสชนะใกล้เคียงกันภายใต้กติกาที่เป็นธรรม', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'คนโกงชนะ', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'ต้องมีเงินเยอะ', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ข',
    explanation: 'กติกาควรลดความได้เปรียบที่ไม่สมเหตุสมผลและเปิดโอกาสให้ผู้เล่นแข่งขันอย่างเป็นธรรม'
  },
  {
    id: 4,
    text: 'หลักการใดทำให้อยากเล่นซ้ำ?',
    options: [
      { key: 'ก', text: 'กติกายากเกินไป', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'จบเร็วเกินไปเสมอ', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'ประสบการณ์ไม่ซ้ำเดิมทุกครั้ง', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'ไม่มีเป้าหมาย', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ค',
    explanation: 'สถานการณ์หรือทางเลือกที่หลากหลายทำให้การเล่นครั้งใหม่ยังน่าสนใจ'
  },
  {
    id: 5,
    text: 'ธีมในบอร์ดเกมคืออะไร?',
    options: [
      { key: 'ก', text: 'เรื่องราวและบรรยากาศของเกม', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'ชื่อผู้เล่น', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'ขนาดกล่อง', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'ราคาขาย', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ก',
    explanation: 'ธีมช่วยสร้างบริบท เรื่องราว และบรรยากาศให้ส่วนต่าง ๆ ของเกมสอดคล้องกัน'
  },
  {
    id: 6,
    text: 'ข้อใดคือองค์ประกอบของบอร์ดเกม?',
    options: [
      { key: 'ก', text: 'เมาส์', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'ชิ้นส่วนและกติกา', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'ซีพียู', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'อีเมล', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ข',
    explanation: 'ชิ้นส่วนใช้ประกอบการเล่น ส่วนกติกากำหนดวิธีเล่นและเงื่อนไขของเกม'
  },
  {
    id: 7,
    text: 'เป้าหมายของเกมมีไว้เพื่ออะไร?',
    options: [
      { key: 'ก', text: 'ตกแต่ง', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'บอกผู้เล่นว่าต้องทำอะไรเพื่อชนะ', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'เพิ่มราคา', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'ทำให้กติกายาก', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ข',
    explanation: 'เป้าหมายช่วยให้ผู้เล่นเข้าใจว่าต้องทำอะไรและเกมตัดสินผลอย่างไร'
  },
  {
    id: 8,
    text: 'เกมที่ยุติธรรมหมายถึงอะไร?',
    options: [
      { key: 'ก', text: 'คนเล่นก่อนชนะเสมอ', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'ผู้เล่นมีโอกาสชนะใกล้เคียงกันภายใต้กติกาที่เป็นธรรม', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'คนโกงชนะ', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'ต้องมีเงินเยอะ', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ข',
    explanation: 'กติกาควรลดความได้เปรียบที่ไม่สมเหตุสมผลและเปิดโอกาสให้ผู้เล่นแข่งขันอย่างเป็นธรรม'
  },
  {
    id: 9,
    text: 'หลักการใดทำให้อยากเล่นซ้ำ?',
    options: [
      { key: 'ก', text: 'กติกายากเกินไป', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'จบเร็วเกินไปเสมอ', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'ประสบการณ์ไม่ซ้ำเดิมทุกครั้ง', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'ไม่มีเป้าหมาย', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ค',
    explanation: 'สถานการณ์หรือทางเลือกที่หลากหลายทำให้การเล่นครั้งใหม่ยังน่าสนใจ'
  },
  {
    id: 10,
    text: 'ธีมในบอร์ดเกมคืออะไร?',
    options: [
      { key: 'ก', text: 'เรื่องราวและบรรยากาศของเกม', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'ชื่อผู้เล่น', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'ขนาดกล่อง', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'ราคาขาย', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ก',
    explanation: 'ธีมช่วยสร้างบริบท เรื่องราว และบรรยากาศให้ส่วนต่าง ๆ ของเกมสอดคล้องกัน'
  }
];
