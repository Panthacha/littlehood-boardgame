import { Question } from './types';

export const questions: Question[] = [
  {
    id: 1,
    text: 'ข้อใดคือองค์ประกอบของบอร์ดเกม?',
    options: [
      { key: 'ก', text: 'จอภาพและลำโพง', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'สัญญาณอินเทอร์เน็ต', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'ชิ้นส่วนและกติกา', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'แอปและบัญชีผู้ใช้', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ค',
    explanation: 'ชิ้นส่วนใช้ประกอบการเล่น ส่วนกติกากำหนดวิธีเล่นและเงื่อนไขของเกม'
  },
  {
    id: 2,
    text: 'เป้าหมายของเกมมีไว้เพื่ออะไร?',
    options: [
      { key: 'ก', text: 'ทำให้กล่องเกมดูสวยขึ้น', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'บอกว่าใครต้องเล่นก่อนในแต่ละรอบ', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'กำหนดจำนวนการ์ดในกอง', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'บอกว่าต้องทำอะไรจึงจะชนะ', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ง',
    explanation: 'เป้าหมายช่วยให้ผู้เล่นเข้าใจว่าต้องทำอะไรและเกมตัดสินผลอย่างไร'
  },
  {
    id: 3,
    text: 'เกมที่ยุติธรรมหมายถึงอะไร?',
    options: [
      { key: 'ก', text: 'ทุกคนมีโอกาสชนะใกล้เคียงกัน', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'คนที่เล่นก่อนจะได้เปรียบเสมอ', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'คนมีอุปกรณ์มากกว่าชนะ', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'ตัดสินผลแพ้ชนะจากอายุ', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ก',
    explanation: 'กติกาควรลดความได้เปรียบที่ไม่สมเหตุสมผลและเปิดโอกาสให้ผู้เล่นแข่งขันอย่างเป็นธรรม'
  },
  {
    id: 4,
    text: 'หลักการใดทำให้อยากเล่นซ้ำ?',
    options: [
      { key: 'ก', text: 'กติกายาวและซับซ้อนมาก', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'แต่ละรอบเกิดเรื่องไม่ซ้ำเดิม', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'ทุกรอบจบแบบเดียวกันเสมอ', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'ผู้ชนะเป็นคนเดิมทุกครั้งที่เล่น', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ข',
    explanation: 'สถานการณ์หรือทางเลือกที่หลากหลายทำให้การเล่นครั้งใหม่ยังน่าสนใจ'
  },
  {
    id: 5,
    text: 'ธีมในบอร์ดเกมคืออะไร?',
    options: [
      { key: 'ก', text: 'จำนวนผู้เล่นที่ต้องใช้ในแต่ละรอบ', shape: 'triangle', color: 'orange' },
      { key: 'ข', text: 'ขนาดและสีของกล่องเกม', shape: 'diamond', color: 'blue' },
      { key: 'ค', text: 'เวลาที่ใช้เล่นจนจบเกม', shape: 'circle', color: 'green' },
      { key: 'ง', text: 'เรื่องราวและบรรยากาศของเกม', shape: 'square', color: 'purple' }
    ],
    correctKey: 'ง',
    explanation: 'ธีมช่วยสร้างบริบท เรื่องราว และบรรยากาศให้ส่วนต่าง ๆ ของเกมสอดคล้องกัน'
  }
];
