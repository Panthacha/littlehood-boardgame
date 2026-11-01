import { useEffect, useRef } from 'react';
import type { Session } from '../types';
import { gameOutcome } from '../utils/nightRecap';
import { buzz, play } from './sfx';

// Sounds driven by game-state changes (so they fire no matter who caused
// the change). Nothing plays for the state a page first loads into — only
// for changes after that.

const onlineCount = (s: Session) => Object.values(s.houses).filter(h => h.isOnline).length;
const doneCount = (s: Session) => Object.values(s.partsCompleted || {}).reduce((a, l) => a + l.length, 0);
const submittedCount = (s: Session) => Object.values(s.houses).filter(h => h.hasSubmitted).length;

// Shared countdown / question-timer ticks.
const useTimerTicks = (state: string | undefined, countdown: number, timeRemaining: number) => {
  const prevCountdown = useRef<number | null>(null);
  useEffect(() => {
    if (state === 'COUNTDOWN' && prevCountdown.current !== null && countdown !== prevCountdown.current) {
      play(countdown > 0 ? 'tick' : 'go');
    }
    prevCountdown.current = countdown;
  }, [countdown, state]);

  const prevTime = useRef<number | null>(null);
  useEffect(() => {
    if (state === 'QUESTION_OPEN' && prevTime.current !== null && timeRemaining !== prevTime.current && timeRemaining > 0 && timeRemaining <= 5) {
      play('tickUrgent');
    }
    prevTime.current = timeRemaining;
  }, [timeRemaining, state]);
};

// Big screen (teacher).
export const useHostSounds = (session: Session | null, countdown: number, timeRemaining: number) => {
  const prev = useRef<Session | null>(null);
  useTimerTicks(session?.state, countdown, timeRemaining);

  useEffect(() => {
    const p = prev.current;
    prev.current = session;
    if (!session || !p) return;

    if (session.state !== p.state) {
      switch (session.state) {
        case 'QUESTION_OPEN': play('start'); break;
        case 'QUESTION_CLOSED': play('gong'); break;
        case 'REVEAL': play('reveal'); break;
        case 'MID_SCOREBOARD': play('fanfare'); break;
        case 'NIGHT_MODE': play('night'); setTimeout(() => play('howl'), 2300); break;
        case 'FINISHED': play(gameOutcome(session)?.villagersWin === false ? 'defeat' : 'victory'); break;
        default:
          if (session.state.startsWith('PART_')) play('page');
      }
      return;
    }
    if (session.state === 'NIGHT_MODE' && session.awakeHouseId !== p.awakeHouseId) {
      play(session.awakeHouseId ? 'bell' : 'sleep');
    }
    if (onlineCount(session) > onlineCount(p)) play('lantern');           // a house joined
    if (doneCount(session) > doneCount(p)) play('complete');               // a house finished a Part
    if (session.state === 'QUESTION_OPEN' && submittedCount(session) > submittedCount(p)) play('select'); // a house answered
  }, [session]);
};

// A player's phone.
export const usePlayerSounds = (session: Session | null, houseId: number, countdown: number, timeRemaining: number) => {
  const prev = useRef<Session | null>(null);
  useTimerTicks(session?.state, countdown, timeRemaining);

  useEffect(() => {
    const p = prev.current;
    prev.current = session;
    if (!session || !p) return;
    const me = session.houses[houseId];
    const before = p.houses[houseId];

    if (session.state !== p.state) {
      switch (session.state) {
        case 'QUESTION_OPEN': play('start'); break;
        case 'MID_SCOREBOARD': play('complete'); break;
        case 'NIGHT_MODE': play('night'); break;
        case 'FINISHED': {
          const outcome = gameOutcome(session);
          if (!outcome) { play('victory'); break; }
          const won = me?.role === 'WOLF' ? !outcome.villagersWin : outcome.villagersWin;
          play(won ? 'victory' : 'defeat');
          break;
        }
      }
    }
    // this house is called to wake up at night: bell + vibration
    if (session.state === 'NIGHT_MODE' && session.awakeHouseId === houseId && p.awakeHouseId !== houseId) {
      play('bell');
      buzz([120, 80, 120]);
    }
    if (me && before) {
      if (me.score > before.score) play('coin');
      if (session.state === 'NIGHT_MODE' && !before.isDead && me.isDead) play('defeat');
    }
  }, [session, houseId]);
};
