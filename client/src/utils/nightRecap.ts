import type { NightEvent, Session } from '../types';

// "Morning news" for one night: only what the village could notice the next
// day (who was robbed, hurt, knocked out, or saved), never who did it — that
// stays secret like in Werewolf. The teacher's admin screen shows the full log.
export const nightNews = (session: Session, night: number): string[] => {
  const events = (session.nightLog || []).filter((e: NightEvent) => e.night === night);
  const lines: string[] = [];
  for (const e of events) {
    if (e.effect === 'STEAL') lines.push(`🐺 บ้านที่ ${e.targetHouseId} ถูกขโมยไป 100 คะแนน`);
    else if (e.effect === 'INJURE') lines.push(`❤️‍🩹 บ้านที่ ${e.targetHouseId} ได้รับบาดเจ็บ (ถ้าเจ็บอีกครั้งจะล้มลง)`);
    else if (e.effect === 'KILL') lines.push(`☠️ บ้านที่ ${e.targetHouseId} ล้มลง ใช้ทักษะกลางคืนไม่ได้อีกแล้ว`);
    else if (e.effect === 'BLOCKED') lines.push(`🛡️ มีคนพยายามทำร้ายบ้านที่ ${e.targetHouseId} แต่มีผู้ปกป้องไว้ได้`);
  }
  return lines.length ? lines : ['🌤️ เป็นคืนที่สงบ ไม่มีใครถูกทำร้าย'];
};

export const ROLE_NAMES: Record<string, string> = {
  RED_RIDING_HOOD: 'หนูน้อยหมวกแดง',
  WOLF: 'หมาป่า',
  GRANDMA: 'คุณยาย',
  WOODCUTTER: 'คนตัดไม้',
  HUNTER: 'นายพราน',
  WITCH: 'แม่มด',
};

const EFFECT_TEXT: Record<NightEvent['effect'], string> = {
  STEAL: 'ขโมยคะแนน',
  PROTECT: 'ปกป้อง',
  INJURE: 'โจมตี (บาดเจ็บ)',
  KILL: 'โจมตี (ล้มลง)',
  BLOCKED: 'โจมตีแต่ถูกกันไว้',
  PEEK: 'ดูคำใบ้',
  INVESTIGATE: 'สืบหาหมาป่า',
};

// Full line for the admin log, actor included.
export const describeEvent = (e: NightEvent): string =>
  `บ้าน ${e.actorHouseId} (${ROLE_NAMES[e.actorRole]}) ${EFFECT_TEXT[e.effect]}${e.targetHouseId ? ` → บ้าน ${e.targetHouseId}` : ''}`;

// Who won the werewolf side of the game: villagers win if the wolf's house
// was knocked out (2 injuries) within the 4 nights, otherwise the wolf wins.
// null until roles exist (night mode never played).
export interface GameOutcome { villagersWin: boolean; wolfHouseId: number; title: string; story: string }

export const gameOutcome = (session: Session): GameOutcome | null => {
  const wolf = Object.values(session.houses).find(h => h.role === 'WOLF');
  if (!wolf) return null;
  return wolf.isDead
    ? {
        villagersWin: true, wolfHouseId: wolf.houseId,
        title: 'หมู่บ้านรอดพ้นจากหมาป่าแล้ว!',
        story: 'ชาวบ้านร่วมมือกันขับไล่หมาป่าออกจากผืนป่าได้สำเร็จ แสงตะเกียงกลับมาส่องสว่างทุกบ้านอีกครั้ง'
      }
    : {
        villagersWin: false, wolfHouseId: wolf.houseId,
        title: 'หมาป่าครองผืนป่า…',
        story: 'เสียงหอนดังก้องไปทั่วป่า หมาป่าซ่อนตัวรอดมาได้ตลอด 4 คืน คราวหน้าชาวบ้านต้องสังเกตเบาะแสให้ดีกว่านี้'
      };
};
