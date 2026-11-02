import React from 'react';
import { ForestScene } from '../theme/Forest';
import { play, type Sfx } from '../sound/sfx';
import { SoundToggle } from '../sound/SoundToggle';

// /sounds — listen to every sound effect (also handy for checking the
// classroom speakers before a session). Not linked from the game screens.
const GROUPS: { title: string; items: [Sfx, string][] }[] = [
  { title: 'ปุ่มและการเลือก', items: [['tap', 'กดปุ่มไม้'], ['select', 'เลือก / ตอบ'], ['lantern', 'ตะเกียงติด (เข้าบ้าน)']] },
  { title: 'คำถาม Pre-test / Posttest', items: [['tick', 'นับถอยหลัง 3-2-1'], ['go', 'เริ่ม!'], ['start', 'คำถามขึ้น'], ['tickUrgent', '5 วินาทีสุดท้าย'], ['gong', 'หมดเวลา'], ['reveal', 'เปิดเฉลย'], ['coin', 'ได้เหรียญ'], ['fanfare', 'ตารางอันดับ']] },
  { title: 'Part 1–5', items: [['page', 'พลิกหน้า (เปลี่ยนด่าน)'], ['correct', 'ตอบถูก'], ['wrong', 'ตอบผิด'], ['shuffle', 'สับไพ่'], ['flip', 'พลิกการ์ด'], ['stamp', 'ประทับตรา (จบ Part)'], ['complete', 'สำเร็จ']] },
  { title: 'กลางคืน', items: [['night', 'เข้าสู่กลางคืน'], ['howl', 'หมาป่าหอน'], ['bell', 'เรียกบ้านลืมตา'], ['sleep', 'หลับตาทุกบ้าน'], ['magic', 'เวทมนตร์ (หนูน้อย / คนตัดไม้)'], ['shield', 'โล่ (คุณยาย / แม่มดช่วย)'], ['attack', 'ธนู (นายพราน / แม่มดฆ่า)']] },
  { title: 'ผลสรุป', items: [['victory', 'ชนะ'], ['defeat', 'แพ้']] }
];

const SoundTest: React.FC = () => (
  <ForestScene image="/village-bg.jpg">
    <div style={{ minHeight: '100vh', padding: '28px 16px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '100%', maxWidth: '760px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="lh-display" style={{ fontSize: '28px', color: 'var(--lh-gold-bright)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>ทดลองฟังเสียง</h1>
        <SoundToggle />
      </div>
      {GROUPS.map(g => (
        <div key={g.title} className="lh-parchment" style={{ width: '100%', maxWidth: '760px', padding: '18px 20px' }}>
          <h2 className="lh-display" style={{ fontSize: '20px', marginBottom: '12px' }}>{g.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {g.items.map(([name, label]) => (
              <button key={name} className="lh-strip" onClick={() => play(name)} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span aria-hidden="true">▶</span>{label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  </ForestScene>
);

export default SoundTest;
