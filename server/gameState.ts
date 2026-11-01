import { Session, HouseData, Player, GameState, NightEvent, Role, Question } from './types';

// Character printed on each card; the card's QR link is /join/<slug>?house=<card>.
export const CARD_ROLES: Record<number, Role> = {
  1: 'RED_RIDING_HOOD',
  2: 'WOLF',
  3: 'GRANDMA',
  4: 'WOODCUTTER',
  5: 'HUNTER',
  6: 'WITCH'
};
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

// Night Mode runs once after each of Parts 1-4 (4 rounds across one
// session), not just once at the end — matching Claude.pdf's "one night per
// chapter" design. Role stays fixed per house across all 4 rounds (same
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

  // Roles come from the physical character cards, not the house number:
  // each card's QR link carries its character (?house=1..6 on the printed
  // cards means card 1..6, see CARD_ROLES), and the house is picked
  // separately on the join page. A role is fixed the first night and kept
  // for all 4 nights. Houses that joined without a card get the roles no
  // card claimed, in card order, so every night still has all 6 roles.
  const firstNight = Object.values(currentSession.houses).every(h => h.role === undefined);
  const roleOf: Record<number, Role> = {};
  if (firstNight) {
    const used = new Set<Role>();
    for (let i = 1; i <= 6; i++) {
      const r = currentSession.houses[i].cardRole;
      if (r && !used.has(r)) { roleOf[i] = r; used.add(r); }
    }
    const leftover = Object.values(CARD_ROLES).filter(r => !used.has(r));
    for (let i = 1; i <= 6; i++) if (!roleOf[i]) roleOf[i] = leftover.shift()!;
  } else {
    for (let i = 1; i <= 6; i++) roleOf[i] = currentSession.houses[i].role!;
  }

  // Find wolf house ID for woodcutter
  let wolfHouseId = 2;
  let previousSuspects: number[] | undefined;

  // Assign roles
  for (let i = 1; i <= 6; i++) {
    const role = roleOf[i];
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

  // Woodcutter (role_summary.md): usable on the first night only. Night 1
  // draws 3 suspects, one of them always the wolf; on later nights the
  // woodcutter keeps that same clue but has no action left.
  for (let i = 1; i <= 6; i++) {
    const h = currentSession.houses[i];
    if (h.role !== 'WOODCUTTER') continue;
    if (previousSuspects) {
      h.woodcutterResult = previousSuspects;
      h.usedNightSkill = true;
      continue;
    }
    const otherHouses = [1,2,3,4,5,6].filter(id => id !== wolfHouseId);
    for (let k = otherHouses.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [otherHouses[k], otherHouses[j]] = [otherHouses[j], otherHouses[k]];
    }
    // sorted so the order doesn't reveal which one is the wolf
    h.woodcutterResult = [wolfHouseId, otherHouses[0], otherHouses[1]].sort((a, b) => a - b);
  }
};


// One device per house. The first device (a random id the browser keeps in
// localStorage) to join a house claims it for the rest of the session; that
// same device can rejoin after a refresh or the phone sleeping, other
// devices are refused. Keyed by session id, so a reset frees every house.
// The teacher can free a house from Admin (e.g. the group's phone died).
const houseClaims = new Map<string, Map<number, string>>();
const claimsFor = (session: Session) => {
  let m = houseClaims.get(session.id);
  if (!m) { m = new Map(); houseClaims.set(session.id, m); }
  return m;
};

export const houseOwnedBy = (eventSlug: string, deviceId: string): number | null => {
  for (const [houseId, owner] of claimsFor(getSession(eventSlug))) if (owner === deviceId) return houseId;
  return null;
};

export const releaseHouse = (eventSlug: string, houseId: number) => {
  const session = getSession(eventSlug);
  claimsFor(session).delete(houseId);
  const house = session.houses[houseId];
  if (!house) return;
  house.claimed = false;
  house.players = [];
  if (house.role === undefined) house.cardRole = undefined;
  house.isOnline = false;
};

export const joinHouse = (eventSlug: string, socketId: string, houseId: number, deviceId?: string, card?: number): HouseData | 'TAKEN' | 'ALREADY_IN_OTHER_HOUSE' | 'CARD_USED' | null => {
  if (houseId < 1 || houseId > 6) return null;
  const claims = claimsFor(getSession(eventSlug));
  const device = deviceId || `socket:${socketId}`; // old clients without an id
  const owner = claims.get(houseId);
  if (owner && owner !== device) return 'TAKEN';
  const currentSession = getSession(eventSlug);
  const otherHouse = houseOwnedBy(eventSlug, device);
  if (otherHouse !== null && otherHouse !== houseId) {
    // Picked the wrong house: free to switch before the game starts, locked after.
    if (currentSession.state !== 'LOBBY') return 'ALREADY_IN_OTHER_HOUSE';
    releaseHouse(eventSlug, otherHouse);
  }
  const cardRole = card ? CARD_ROLES[card] : undefined;
  if (cardRole && Object.values(currentSession.houses).some(h => h.houseId !== houseId && h.cardRole === cardRole)) {
    return 'CARD_USED';
  }
  claims.set(houseId, device);
  const house = currentSession.houses[houseId];
  if (!house) return null;
  house.claimed = true;
  // Roles lock in on the first night; a card scanned after that changes nothing.
  if (cardRole && house.role === undefined) house.cardRole = cardRole;

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
  // only the house the teacher has woken may act
  if (currentSession.awakeHouseId !== houseId) return false;

  const role = house.role;
  if (!role) return false;
  const night = currentSession.lastCompletedPart || 1;
  const target = targetId ? currentSession.houses[targetId] : undefined;
  // targets: another house that is still standing
  if (target && (target.houseId === houseId || target.isDead)) return false;
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

  // Grandma / Witch-help: a shield lasts the WHOLE night (role_summary.md),
  // so it also cancels attacks that already landed on this house earlier
  // tonight — the order the teacher wakes houses in doesn't matter.
  const protect = (t: HouseData) => {
    t.isProtected = true;
    log('PROTECT', t.houseId);
    for (const e of currentSession.nightLog || []) {
      if (e.night !== night || e.targetHouseId !== t.houseId) continue;
      if (e.effect !== 'INJURE' && e.effect !== 'KILL') continue;
      t.injuries = Math.max(0, (t.injuries || 0) - 1);
      t.isDead = false;
      e.effect = 'BLOCKED';
    }
  };

  if (role === 'WOLF' && target) {
    target.score -= 100;
    house.score += 100;
    log('STEAL', target.houseId);
  } else if (role === 'GRANDMA' && target) {
    protect(target);
  } else if (role === 'HUNTER' && target) {
    attack(target);
  } else if (role === 'WITCH' && target && action === 'protect') {
    protect(target);
  } else if (role === 'WITCH' && target && action === 'attack') {
    attack(target);
  } else if (role === 'RED_RIDING_HOOD' && target) {
    log('PEEK', target.houseId);
  } else if (role === 'WOODCUTTER' && night === 1) {
    log('INVESTIGATE');
  } else {
    return false;
  }

  house.usedNightSkill = true;
  currentSession.nightLog = [...(currentSession.nightLog || []), ...events];
  return true;
};

// Pre-test/Posttest choices are shuffled per game and per phase, so the
// answer isn't always in the same slot and the Posttest's order differs
// from the Pre-test's (same questions, so the scores still compare). The
// keys ก ข ค ง and their shapes/colors stay in place; only the texts move,
// and correctKey follows its text. Deterministic from the session id, so
// every call (host screen, scoring, reveal) sees the same order.
const seededRandom = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Which slot (0-3) holds the correct answer for each question of this run:
// every slot is used across the 5 questions (one slot twice), in a random
// order per game and phase — so the answer is neither always ข nor a streak.
const answerSlots = (session: Session): number[] => {
  const rand = seededRandom(`${session.id}:${session.testPhase || 'PRE'}:slots`);
  const slots = [0, 1, 2, 3, Math.floor(rand() * 4)];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
};

export const questionFor = (session: Session, index: number): Question | undefined => {
  const q = questions[index];
  if (!q) return undefined;
  const rand = seededRandom(`${session.id}:${session.testPhase || 'PRE'}:${index}`);
  const correctText = q.options.find(o => o.key === q.correctKey)!.text;
  const wrong = q.options.map(o => o.text).filter(t => t !== correctText);
  for (let i = wrong.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
  }
  const slot = answerSlots(session)[index % 5] % q.options.length;
  const texts = [...wrong.slice(0, slot), correctText, ...wrong.slice(slot)];
  const options = q.options.map((o, i) => ({ ...o, text: texts[i] }));
  return { ...q, options, correctKey: options[slot].key };
};

// The question as players/host may see it before the reveal: no answer.
export const publicQuestionFor = (session: Session, index: number) => {
  const q = questionFor(session, index);
  if (!q) return null;
  const { correctKey, explanation, ...rest } = q;
  return rest;
};

export const calculateScores = (eventSlug: string = DEFAULT_EVENT_SLUG) => {
  const currentSession = getSession(eventSlug);
  const question = questionFor(currentSession, currentSession.currentQuestionIndex);
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
      if (currentSession.testPhase === 'POST') house.postCorrectAnswers = (house.postCorrectAnswers || 0) + 1;
      else house.correctAnswers += 1;
    }

    results[id] = { correct: isCorrect, scoreDelta };
  }

  return results;
};

// After night 5: run the same 5 questions again as the Posttest. Score
// points still count toward the house total; correct answers are kept
// apart (postCorrectAnswers) so the end screen can compare before/after.
export const startPosttest = (eventSlug: string = DEFAULT_EVENT_SLUG) => {
  const currentSession = getSession(eventSlug);
  currentSession.testPhase = 'POST';
  currentSession.currentQuestionIndex = -1;
  currentSession.awakeHouseId = null;
  for (let id = 1; id <= 6; id++) currentSession.houses[id].postCorrectAnswers = 0;
};

export const setGameState = (eventSlug: string, state: GameState) => {
  getSession(eventSlug).state = state;
};

export const startCountdown = (eventSlug: string, onTick: (count: number) => void, onComplete: () => void) => {
  const currentSession = getSession(eventSlug);
  currentSession.countdown = 3;
  setGameState(eventSlug, 'COUNTDOWN');

  const interval = setInterval(() => {
    // The host reset the game mid-countdown: stop, don't start a question in the new session.
    if (getSession(eventSlug) !== currentSession) {
      clearInterval(interval);
      return;
    }
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
    if (currentSession.state !== 'QUESTION_OPEN' || getSession(eventSlug) !== currentSession) {
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
