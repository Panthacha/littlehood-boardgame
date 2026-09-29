export type GameState = 'LOBBY' | 'COUNTDOWN' | 'QUESTION_OPEN' | 'QUESTION_CLOSED' | 'REVEAL' | 'FINISHED';

export interface Question {
  id: number;
  text: string;
  options: {
    key: string;
    text: string;
    shape: string;
    color: string;
  }[];
  correctKey: string;
  explanation: string;
}

export interface Player {
  socketId: string;
  houseId: number;
  isOnline: boolean;
}

export interface HouseData {
  houseId: number;
  players: Player[];
  score: number;
  correctAnswers: number;
  hasSubmitted: boolean;
  selectedKey?: string;
  isOnline: boolean;
}

export interface Session {
  id: string;
  eventSlug: string;
  state: GameState;
  currentQuestionIndex: number;
  countdown: number; // For 3-2-1
  timeRemaining: number; // For question timer
  houses: Record<number, HouseData>;
  startTime?: number; // timestamp when question started
}

// Client to Server Events
export interface ClientToServerEvents {
  joinLobby: (data: { eventSlug: string; houseId: number }, callback: (res: any) => void) => void;
  submitAnswer: (data: { sessionId: string; houseId: number; key: string }, callback: (res: any) => void) => void;
  // Host events
  hostJoin: (callback: (res: any) => void) => void;
  hostStartGame: () => void;
  hostNextQuestion: () => void;
  hostReveal: () => void;
  hostShowSummary: () => void;
  hostNewRound: () => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  gameStateUpdate: (session: Session) => void;
  questionUpdate: (data: { question: Question | null; index: number; total: number }) => void;
  timeUpdate: (data: { timeRemaining: number }) => void;
  countdownUpdate: (data: { countdown: number }) => void;
  houseSubmitted: (data: { houseId: number }) => void; // Emitted when a house submits an answer
  revealAnswer: (data: { correctKey: string; explanation: string; houseResults: Record<number, { correct: boolean; scoreDelta: number }> }) => void;
}
