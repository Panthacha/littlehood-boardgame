import { Session, HouseData, Player, GameState, NightEvent } from './types';
import { questions } from './data';

export const DEFAULT_EVENT_SLUG = 'LITTLEHOOD'; // matches the slug already baked into the printed QR codes (see generate_qrs.js)
const TOTAL_QUESTIONS = 5;
const QUESTION_TIME_LIMIT = 30; // 30 seconds

// One Session per eventSlug, so multiple classrooms/rounds can run concurrently
// without clobbering each other. Only DEFAULT_EVENT_SLUG is currently driven by
// a host UI; other slugs just get an inert LOBBY session if players join them
// (no host connected to run it yet — host room picking is a future addition).
const sessions = new Map<string, Session>();

function createNewSession(eventSlug: string): Session {
  return {
    id: Math.random().toString(36).substring(2, 9),
    eventSlug,
    state: 'LOBBY',
    currentQuestionIndex: -1,
    countdown: 0,
    timeRemaining: 0,
    houses: {
      1: createEmptyHouse(1),
      2: createEmptyHouse(2),
      3: createEmptyHouse(3),
      4: createEmptyHouse(4),
      5: createEmptyHouse(5),
      6: createEmptyHouse(6),
    }
  };
}

function createEmptyHouse(id: number): HouseData {
  return {
    houseId: id,
    players: [],
    score: 0,
    correctAnswers: 0,
    hasSubmitted: false,
    isOnline: false,
  };
}

export const getSession = (eventSlug: string = DEFAULT_EVENT_SLUG): Session => {
  let session = sessions.get(eventSlug);
  if (!session) {
    session = createNewSession(eventSlug);
    sessions.set(eventSlug, session);
  }
  return session;
};

export const resetSession = (eventSlug: string = DEFAULT_EVENT_SLUG) => {
  const session = createNewSession(eventSlug);
  sessions.set(eventSlug, session);
  return session;
};

// Night Mode now runs once after EVERY Part (5 rounds total across one
// session), not just once at the end — matching Claude.pdf's "one night per
// chapter" design. Role stays fixed per house across all 5 rounds (same
// deterministic mapping every call); isProtected/usedNightSkill reset each
// round so everyone gets a fresh action, but score/injuries/isDead, the
// Woodcutter's narrowing suspect list and session.nightLog carry over and
// accumulate round to round, so each night builds on the last. Whether
// this is round 1 or round 5 for a house is detected by whether it already
// has a role assigned (role is only ever set by this function).
export const initializeNightMode = (eventSlug: string = DEFAULT_EVENT_SLUG) => {
  const currentSession = getSession(eventSlug);
  currentSession.state = 'NIGHT_MODE';
  currentSession.awakeHouseId = null;

  // Fixed house -> role mapping, matching the printed QR cards and
  // constants/characters.ts (house 1 = Red Riding Hood, 2 = Wolf, etc).
  // The "who got the wolf card" randomness already comes from the teacher
  // handing out physical cards to groups fresh each session — shuffling
  // again here just made the in-game role stop matching the card.
  const roles: import('./types').Role[] = [
    'RED_RIDING_HOOD', // house 1
    'WOLF',            // house 2
    'GRANDMA',         // house 3
    'WOODCUTTER',      // house 4
    'HUNTER',          // house 5
    'WITCH'            // house 6
  ];

  // Find wolf house ID for woodcutter
  let wolfHouseId = 1;
  let previousSuspects: number[] | undefined;

  // Assign roles
  for (let i = 1; i <= 6; i++) {
    const role = roles[i - 1];
    if (role === 'WOLF') wolfHouseId = i;

    const house = currentSession.houses[i];
    const isFirstRound = house.role === undefined;
    if (role === 'WOODCUTTER' && !isFirstRound) previousSuspects = house.woodcutterResult;

    currentSession.houses[i] = {
      ...house,
      role,
      isProtected: false,
      usedNightSkill: false,
      woodcutterResult: undefined,
      // Only reset these on the very first round for this house — later
      // rounds keep accumulating injuries/isDead/score.
      injuries: isFirstRound ? 0 : house.injuries,
      isDead: isFirstRound ? false : house.isDead
    };
  }

  // Woodcutter's suspects carry over and narrow night after night, so the
  // investigation builds across the 5 nights instead of restarting: night 1
  // gets 3 suspects (always incl. the wolf), each later night drops one
  // innocent from the previous list until only 2 remain.
  let woodcutterResult: number[];
  if (previousSuspects && previousSuspects.includes(wolfHouseId)) {
    const innocents = previousSuspects.filter(id => id !== wolfHouseId);
    if (previousSuspects.length > 2) {
      innocents.splice(Math.floor(Math.random() * innocents.length), 1);
    }
    woodcutterResult = [wolfHouseId, ...innocents];
  } else {
    const otherHouses = [1,2,3,4,5,6].filter(id => id !== wolfHouseId);
    for (let i = otherHouses.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherHouses[i], otherHouses[j]] = [otherHouses[j], otherHouses[i]];
    }
    woodcutterResult = [wolfHouseId, otherHouses[0], otherHouses[1]];
  }
  // sort to hide which one is wolf
  woodcutterResult.sort((a, b) => a - b);

  for (let i = 1; i <= 6; i++) {
    if (currentSession.houses[i].role === 'WOODCUTTER') {
      currentSession.houses[i].woodcutterResult = woodcutterResult;
    }
  }
};

// The house Grandma guarded on the night before `night`, if any — she can't
// guard the same house two nights in a row (classic Werewolf rule), which is
// what makes each night's choice depend on the last one.
export const grandmaLastTarget = (session: Session, grandmaHouseId: number, night: number): number | undefined => {
  return session.nightLog?.find(e => e.night === night - 1 && e.actorHouseId === grandmaHouseId && e.effect === 'PROTECT')?.targetHouseId;
};

export const joinHouse = (eventSlug: string, socketId: string, houseId: number): HouseData | null => {
  if (houseId < 1 || houseId > 6) return null;
  const currentSession = getSession(eventSlug);
  const house = currentSession.houses[houseId];
  if (!house) return null;

  // Check if player already in this house
  const existingPlayer = house.players.find(p => p.socketId === socketId);
  if (!existingPlayer) {
    house.players.push({ socketId, houseId, isOnline: true });
  } else {
    existingPlayer.isOnline = true;
  }
  updateHouseOnlineStatus(currentSession, houseId);
  return house;
};

// Searches every room (we don't know which eventSlug a disconnecting socket
// belonged to) and returns the slugs that actually changed, so the caller can
// broadcast updates only to those rooms.
export const leaveHouse = (socketId: string): string[] => {
  const affectedSlugs: string[] = [];
  for (const session of sessions.values()) {
    let changed = false;
    for (let id = 1; id <= 6; id++) {
      const house = session.houses[id];
      const player = house.players.find(p => p.socketId === socketId);
      if (player) {
        player.isOnline = false;
        updateHouseOnlineStatus(session, id);
        changed = true;
      }
    }
    if (changed) affectedSlugs.push(session.eventSlug);
  }
  return affectedSlugs;
};

const updateHouseOnlineStatus = (session: Session, houseId: number) => {
  const house = session.houses[houseId];
  if (house) {
    // Keep the house active (lit up) if anyone has ever joined it,
    // because mobile browsers often disconnect sockets when the screen turns off.
    house.isOnline = house.players.length > 0;
  }
};

export const submitAnswer = (eventSlug: string, houseId: number, key: string) => {
  const currentSession = getSession(eventSlug);
  const house = currentSession.houses[houseId];
  if (!house) return false;

  if (currentSession.state !== 'QUESTION_OPEN') return false;
  if (house.hasSubmitted) return false; // Atomic lock, first answer counts

  house.hasSubmitted = true;
  house.selectedKey = key;
  return true;
};

export const processNightSkill = (eventSlug: string, houseId: number, targetId?: number, action?: string) => {
  const currentSession = getSession(eventSlug);
  if (currentSession.state !== 'NIGHT_MODE') return false;

  const house = currentSession.houses[houseId];
  if (!house || house.usedNightSkill || house.isDead) return false;

  const role = house.role;
  if (!role) return false;
  const night = currentSession.lastCompletedPart || 1;
  const target = targetId ? currentSession.houses[targetId] : undefined;
  const events: NightEvent[] = [];
  const log = (effect: NightEvent['effect'], targetHouseId?: number) =>
    events.push({ night, actorHouseId: houseId, actorRole: role, targetHouseId, effect });

  // Shared by Hunter and Witch: protection blocks it, a 2nd injury (this
  // night or carried over from an earlier one) knocks the house out.
  const attack = (t: HouseData) => {
    if (t.isProtected) { log('BLOCKED', t.houseId); return; }
    t.injuries = (t.injuries || 0) + 1;
    if (t.injuries >= 2) { t.isDead = true; log('KILL', t.houseId); }
    else log('INJURE', t.houseId);
  };

  if (role === 'WOLF' && target) {
    target.score -= 100;
    house.score += 100;
    log('STEAL', target.houseId);
  } else if (role === 'GRANDMA' && target) {
    if (grandmaLastTarget(currentSession, houseId, night) === target.houseId) return false;
    target.isProtected = true;
    log('PROTECT', target.houseId);
  } else if (role === 'HUNTER' && target) {
    attack(target);
  } else if (role === 'WITCH' && target && action === 'protect') {
    target.isProtected = true;
    log('PROTECT', target.houseId);
  } else if (role === 'WITCH' && target && action === 'attack') {
    attack(target);
  } else if (role === 'RED_RIDING_HOOD' && target) {
    log('PEEK', target.houseId);
  } else if (role === 'WOODCUTTER') {
    log('INVESTIGATE');
  } else {
    return false;
  }

  house.usedNightSkill = true;
  currentSession.nightLog = [...(currentSession.nightLog || []), ...events];
  return true;
};

export const calculateScores = (eventSlug: string = DEFAULT_EVENT_SLUG) => {
  const currentSession = getSession(eventSlug);
  const question = questions[currentSession.currentQuestionIndex];
  if (!question) return {};

  const timeTaken = currentSession.startTime ? (Date.now() - currentSession.startTime) / 1000 : 0;
  let timeRemaining = QUESTION_TIME_LIMIT - timeTaken;
  if (timeRemaining < 0) timeRemaining = 0;

  const results: Record<number, { correct: boolean; scoreDelta: number }> = {};

  for (let id = 1; id <= 6; id++) {
    const house = currentSession.houses[id];
    let scoreDelta = 0;
    let isCorrect = false;

    if (house.hasSubmitted && house.selectedKey === question.correctKey) {
      isCorrect = true;
      let bonus = Math.floor(30 * (timeRemaining / QUESTION_TIME_LIMIT));
      if (bonus < 0) bonus = 0;
      if (bonus > 30) bonus = 30;
      scoreDelta = 100 + bonus;

      house.score += scoreDelta;
      house.correctAnswers += 1;
    }

    results[id] = { correct: isCorrect, scoreDelta };
  }

  return results;
};

export const setGameState = (eventSlug: string, state: GameState) => {
  getSession(eventSlug).state = state;
};

export const startCountdown = (eventSlug: string, onTick: (count: number) => void, onComplete: () => void) => {
  const currentSession = getSession(eventSlug);
  currentSession.countdown = 3;
  setGameState(eventSlug, 'COUNTDOWN');

  const interval = setInterval(() => {
    currentSession.countdown -= 1;
    onTick(currentSession.countdown);
    if (currentSession.countdown <= 0) {
      clearInterval(interval);
      onComplete();
    }
  }, 1000);
};

export const startQuestionTimer = (eventSlug: string, onTick: (time: number) => void, onComplete: () => void) => {
  const currentSession = getSession(eventSlug);
  currentSession.timeRemaining = QUESTION_TIME_LIMIT;
  currentSession.startTime = Date.now();
  setGameState(eventSlug, 'QUESTION_OPEN');

  // Clear submitted state for all houses
  for (let id = 1; id <= 6; id++) {
    currentSession.houses[id].hasSubmitted = false;
    currentSession.houses[id].selectedKey = undefined;
  }

  const interval = setInterval(() => {
    if (currentSession.state !== 'QUESTION_OPEN') {
      clearInterval(interval);
      return;
    }

    const elapsed = (Date.now() - currentSession.startTime!) / 1000;
    currentSession.timeRemaining = Math.max(0, Math.ceil(QUESTION_TIME_LIMIT - elapsed));

    onTick(currentSession.timeRemaining);

    // Check if all online houses submitted
    let allSubmitted = true;
    for (let id = 1; id <= 6; id++) {
      if (currentSession.houses[id].isOnline && !currentSession.houses[id].hasSubmitted) {
        allSubmitted = false;
        break;
      }
    }

    if (currentSession.timeRemaining <= 0 || allSubmitted) {
      clearInterval(interval);
      setGameState(eventSlug, 'QUESTION_CLOSED');
      currentSession.timeRemaining = 0;
      onComplete();
    }
  }, 1000);
};

export const nextQuestion = (eventSlug: string = DEFAULT_EVENT_SLUG) => {
  const currentSession = getSession(eventSlug);
  currentSession.currentQuestionIndex += 1;
  return currentSession.currentQuestionIndex;
};
