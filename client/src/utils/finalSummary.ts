import type { HouseData, Session } from '../types';
import { ROLE_NAMES } from './nightRecap';

// End-of-game summary per house, shared by the big screen and the phones.
//
// "คะแนนการเดินทาง" (journey %) blends the three things the session is
// about: what the house learned (Posttest), what it built (Parts done) and
// whether it made it through the 4 nights:
//   40% Posttest correct + 40% Parts finished + 20% survival
// survival: unhurt 100, injured but standing 50, knocked out 0.

export const JOURNEY_WEIGHTS = { knowledge: 0.4, missions: 0.4, survival: 0.2 };

export type SurvivalStatus = 'safe' | 'injured' | 'down';

export interface HouseSummary {
  house: HouseData;
  houseId: number;
  roleName: string | null;
  status: SurvivalStatus;
  statusLabel: string;
  prePct: number;
  postPct: number;
  missionsDone: number;
  missionPct: number;
  survivalPct: number;
  journeyPct: number;
  stolenFrom: number;   // times the wolf stole from this house
  attacked: number;     // attacks that landed (injured / knocked out)
  saved: number;        // attacks blocked by a protector
  rank: number;         // by journey %, then coins
}

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

export const houseSummaries = (session: Session): HouseSummary[] => {
  const log = session.nightLog || [];
  const joined = Object.values(session.houses).filter(h => h.isOnline || h.claimed);
  const rows = joined.map((h): Omit<HouseSummary, 'rank'> => {
    const status: SurvivalStatus = h.isDead ? 'down' : (h.injuries || 0) > 0 ? 'injured' : 'safe';
    const missionsDone = [1, 2, 3, 4, 5].filter(p => session.partsCompleted?.[p]?.includes(h.houseId)).length;
    const prePct = pct(h.correctAnswers, 5);
    const postPct = pct(h.postCorrectAnswers || 0, 5);
    const missionPct = pct(missionsDone, 5);
    const survivalPct = status === 'safe' ? 100 : status === 'injured' ? 50 : 0;
    const on = (effect: string) => log.filter(e => e.targetHouseId === h.houseId && e.effect === effect).length;
    return {
      house: h,
      houseId: h.houseId,
      roleName: h.role ? ROLE_NAMES[h.role] : null,
      status,
      statusLabel: status === 'safe' ? 'รอดปลอดภัย' : status === 'injured' ? 'รอด (บาดเจ็บ)' : 'ล้มลง',
      prePct,
      postPct,
      missionsDone,
      missionPct,
      survivalPct,
      journeyPct: Math.round(postPct * JOURNEY_WEIGHTS.knowledge + missionPct * JOURNEY_WEIGHTS.missions + survivalPct * JOURNEY_WEIGHTS.survival),
      stolenFrom: on('STEAL'),
      attacked: on('INJURE') + on('KILL'),
      saved: on('BLOCKED')
    };
  });
  return rows
    .sort((a, b) => b.journeyPct - a.journeyPct || b.house.score - a.house.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
};

export interface ClassSummary {
  houses: number;
  survived: number;
  survivedPct: number;
  prePct: number;
  postPct: number;
  missionPct: number;
  journeyPct: number;
}

export const classSummary = (rows: HouseSummary[]): ClassSummary => {
  const n = rows.length || 1;
  const avg = (f: (r: HouseSummary) => number) => Math.round(rows.reduce((a, r) => a + f(r), 0) / n);
  const survived = rows.filter(r => r.status !== 'down').length;
  return {
    houses: rows.length,
    survived,
    survivedPct: pct(survived, rows.length),
    prePct: avg(r => r.prePct),
    postPct: avg(r => r.postPct),
    missionPct: avg(r => r.missionPct),
    journeyPct: avg(r => r.journeyPct)
  };
};
