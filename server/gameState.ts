import { Session, HouseData, Player, GameState } from './types';
import { questions } from './data';

const DEFAULT_EVENT_SLUG = 'forest-festival';
const TOTAL_QUESTIONS = 5;
const QUESTION_TIME_LIMIT = 30; // 30 seconds

// We will maintain a single default session for simplicity based on the prompt's scope
let currentSession: Session = createNewSession();

function createNewSession(): Session {
  return {
    id: Math.random().toString(36).substring(2, 9),
    eventSlug: DEFAULT_EVENT_SLUG,
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

export const getSession = () => currentSession;

export const resetSession = () => {
  currentSession = createNewSession();
  return currentSession;
};

export const initializeNightMode = () => {
  currentSession.state = 'NIGHT_MODE';
  currentSession.awakeHouseId = null;
  
  const roles: import('./types').Role[] = [
    'RED_RIDING_HOOD', 
    'GRANDMA', 
    'WOLF', 
    'HUNTER', 
    'WOODCUTTER', 
    'WITCH'
  ];
  
  // Shuffle roles
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  // Find wolf house ID for woodcutter
  let wolfHouseId = 1;
  
  // Assign roles
  for (let i = 1; i <= 6; i++) {
    const role = roles[i - 1];
    if (role === 'WOLF') wolfHouseId = i;
    
    currentSession.houses[i] = {
      ...currentSession.houses[i],
      role: role,
      isProtected: false,
      injuries: 0,
      isDead: false,
      usedNightSkill: false,
      woodcutterResult: undefined
    };
  }
  
  // Setup woodcutter result (3 random houses including the wolf)
  const otherHouses = [1,2,3,4,5,6].filter(id => id !== wolfHouseId);
  // shuffle other houses
  for (let i = otherHouses.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherHouses[i], otherHouses[j]] = [otherHouses[j], otherHouses[i]];
  }
  const woodcutterResult = [wolfHouseId, otherHouses[0], otherHouses[1]];
  // sort to hide which one is wolf
  woodcutterResult.sort((a, b) => a - b);
  
  for (let i = 1; i <= 6; i++) {
    if (currentSession.houses[i].role === 'WOODCUTTER') {
      currentSession.houses[i].woodcutterResult = woodcutterResult;
    }
  }
};

export const joinHouse = (socketId: string, houseId: number): HouseData | null => {
  if (houseId < 1 || houseId > 6) return null;
  const house = currentSession.houses[houseId];
  if (!house) return null;

  // Check if player already in this house
  const existingPlayer = house.players.find(p => p.socketId === socketId);
  if (!existingPlayer) {
    house.players.push({ socketId, houseId, isOnline: true });
  } else {
    existingPlayer.isOnline = true;
  }
  updateHouseOnlineStatus(houseId);
  return house;
};

export const leaveHouse = (socketId: string) => {
  for (let id = 1; id <= 6; id++) {
    const house = currentSession.houses[id];
    const player = house.players.find(p => p.socketId === socketId);
    if (player) {
      player.isOnline = false;
      updateHouseOnlineStatus(id);
    }
  }
};

const updateHouseOnlineStatus = (houseId: number) => {
  const house = currentSession.houses[houseId];
  if (house) {
    // Keep the house active (lit up) if anyone has ever joined it, 
    // because mobile browsers often disconnect sockets when the screen turns off.
    house.isOnline = house.players.length > 0;
  }
};

export const submitAnswer = (houseId: number, key: string) => {
  const house = currentSession.houses[houseId];
  if (!house) return false;
  
  if (currentSession.state !== 'QUESTION_OPEN') return false;
  if (house.hasSubmitted) return false; // Atomic lock, first answer counts

  house.hasSubmitted = true;
  house.selectedKey = key;
  return true;
};

export const processNightSkill = (houseId: number, targetId?: number, action?: string) => {
  if (currentSession.state !== 'NIGHT_MODE') return false;
  
  const house = currentSession.houses[houseId];
  if (!house || house.usedNightSkill) return false;

  const role = house.role;
  let success = false;

  if (role === 'WOLF' && targetId) {
    const target = currentSession.houses[targetId];
    if (target && target.score >= 100) {
      target.score -= 100;
      house.score += 100;
      success = true;
    } else if (target) {
      // steal whatever they have
      house.score += target.score;
      target.score = 0;
      success = true;
    }
  } else if (role === 'GRANDMA' && targetId) {
    const target = currentSession.houses[targetId];
    if (target) {
      target.isProtected = true;
      success = true;
    }
  } else if (role === 'HUNTER' && targetId) {
    const target = currentSession.houses[targetId];
    if (target) {
      if (!target.isProtected) {
        target.injuries = (target.injuries || 0) + 1;
        if (target.injuries >= 2) target.isDead = true;
      }
      success = true;
    }
  } else if (role === 'WITCH' && targetId && action) {
    const target = currentSession.houses[targetId];
    if (target) {
      if (action === 'protect') {
        target.isProtected = true;
        success = true;
      } else if (action === 'attack') {
        if (!target.isProtected) {
          target.injuries = (target.injuries || 0) + 1;
          if (target.injuries >= 2) target.isDead = true;
        }
        success = true;
      }
    }
  } else if (role === 'RED_RIDING_HOOD' || role === 'WOODCUTTER') {
    // Skills that just view information don't need server state mutations besides marking used
    success = true;
  }

  if (success) {
    house.usedNightSkill = true;
  }
  return success;
};

export const calculateScores = () => {
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

export const setGameState = (state: GameState) => {
  currentSession.state = state;
};

export const startCountdown = (onTick: (count: number) => void, onComplete: () => void) => {
  currentSession.countdown = 3;
  setGameState('COUNTDOWN');
  
  const interval = setInterval(() => {
    currentSession.countdown -= 1;
    onTick(currentSession.countdown);
    if (currentSession.countdown <= 0) {
      clearInterval(interval);
      onComplete();
    }
  }, 1000);
};

export const startQuestionTimer = (onTick: (time: number) => void, onComplete: () => void) => {
  currentSession.timeRemaining = QUESTION_TIME_LIMIT;
  currentSession.startTime = Date.now();
  setGameState('QUESTION_OPEN');
  
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
      setGameState('QUESTION_CLOSED');
      currentSession.timeRemaining = 0;
      onComplete();
    }
  }, 1000);
};

export const nextQuestion = () => {
  currentSession.currentQuestionIndex += 1;
  return currentSession.currentQuestionIndex;
};
