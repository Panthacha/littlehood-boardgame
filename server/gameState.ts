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
