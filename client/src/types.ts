export type GameState = 'LOBBY' | 'COUNTDOWN' | 'QUESTION_OPEN' | 'QUESTION_CLOSED' | 'REVEAL' | 'MID_SCOREBOARD' | 'PART_1' | 'PART_2' | 'PART_3' | 'PART_4' | 'PART_5' | 'FINISHED' | 'NIGHT_MODE';

export type Role = 'RED_RIDING_HOOD' | 'GRANDMA' | 'WOLF' | 'HUNTER' | 'WOODCUTTER' | 'WITCH';

// One entry per night skill use. The full log (with actor) is for the
// teacher's admin screen; the big screen and players only ever see the
// actor-less "morning news" built from it (client/src/utils/nightRecap.ts).
export type NightEffect = 'STEAL' | 'PROTECT' | 'INJURE' | 'KILL' | 'BLOCKED' | 'PEEK' | 'INVESTIGATE';

export interface NightEvent {
  night: number;
  actorHouseId: number;
  actorRole: Role;
  targetHouseId?: number;
  effect: NightEffect;
}

export interface Question {
  id: number;
  text: string;
  options: {
    key: string;
    text: string;
    shape: string;
    color: string;
  }[];
  // Omitted from the public /api/questions response until REVEAL, so these are
  // only guaranteed to be present once the question is actually revealed.
  correctKey?: string;
  explanation?: string;
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
  claimed?: boolean; // a device has taken this house (one device per house)
  role?: Role;
  isProtected?: boolean;
  injuries?: number;
  isDead?: boolean;
  usedNightSkill?: boolean;
  woodcutterResult?: number[]; // suspects (always includes the wolf); narrows night after night
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
  awakeHouseId?: number | null; // house currently awake in NIGHT_MODE
  lastCompletedPart?: number; // which Part (1-5) the current/last NIGHT_MODE round follows
  partsCompleted?: Record<number, number[]>; // Part number -> houses that finished it
  nightLog?: NightEvent[]; // every night's skill uses, accumulated across all 5 nights
}

// Client to Server Events
export interface ClientToServerEvents {
  joinLobby: (data: { eventSlug: string; houseId: number; deviceId?: string }, callback: (res: any) => void) => void;
  watchLobby: (data: { eventSlug: string; deviceId: string }, callback: (res: { mine: number | null }) => void) => void;
  adminReleaseHouse: (houseId: number) => void;
  submitAnswer: (data: { sessionId: string; houseId: number; key: string }, callback: (res: any) => void) => void;
  // Host events
  hostJoin: (callback: (res: any) => void) => void;
  hostStartGame: () => void;
  hostNextQuestion: () => void;
  hostReveal: () => void;
  hostShowSummary: () => void;
  hostNewRound: () => void;
  hostStartPart: (part: number) => void;
  hostFinishParts: () => void;
  hostStartNightMode: () => void;
  hostWakeUpHouse: (houseId: number | null) => void;
  useNightSkill: (data: { houseId: number; targetId?: number; action?: string }, callback: (res: any) => void) => void;
  adminLogin: (password: string, callback: (res: { success: boolean }) => void) => void;
  savePartProgress: (data: { houseId: number; partNumber: number; step: number; data: Record<string, any>; completed?: boolean }, callback: (res: any) => void) => void;
  getPartProgress: (data: { houseId: number }, callback: (res: { parts: Record<number, { step: number; data: Record<string, any>; completedAt: string | null }> }) => void) => void;
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
