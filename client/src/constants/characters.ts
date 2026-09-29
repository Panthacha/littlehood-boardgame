export const CHARACTERS = [
  { id: 1, name: 'หนูน้อยหมวกแดง', icon: '👧', color: '#E63946' },
  { id: 2, name: 'หมาป่า', icon: '🐺', color: '#6c757d' },
  { id: 3, name: 'คุณยาย', icon: '👵', color: '#a8dadc' },
  { id: 4, name: 'คนตัดไม้', icon: '🪓', color: '#D9AE6E' },
  { id: 5, name: 'นายพราน', icon: '🏹', color: '#2a9d8f' },
  { id: 6, name: 'แม่มด', icon: '🧙‍♀️', color: '#9c6644' }
];

export const getCharacter = (id: number | string) => {
  return CHARACTERS.find(c => c.id === Number(id)) || { id: Number(id), name: `บ้านที่ ${id}`, icon: '🏠', color: '#FFF' };
};
