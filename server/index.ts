import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { ClientToServerEvents, ServerToClientEvents } from './types';
import {
  DEFAULT_EVENT_SLUG,
  getSession,
  joinHouse,
  leaveHouse,
  submitAnswer,
  calculateScores,
  setGameState,
  startCountdown,
  startQuestionTimer,
  nextQuestion,
  resetSession,
  initializeNightMode,
  houseOwnedBy,
  releaseHouse,
  processNightSkill
} from './gameState';
import { questions } from './data';
import { recordSessionStart, recordSessionResults, recordSessionFinished, savePartProgress, getPartProgress } from './db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[WARN] ADMIN_PASSWORD env var not set, falling back to default password. Set it before deploying.');
}

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*', // For development
    methods: ['GET', 'POST']
  }
});

// Only the host UI drives DEFAULT_EVENT_SLUG today (no room picker yet), so every
// host-originated event targets that room. Player sockets are tracked by the
// eventSlug they actually joined (from their QR code), so multiple classrooms can
// join different rooms without seeing each other's state — see gameState.ts.
const socketEventSlug = new Map<string, string>();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current state on connect (defaults to the main room until the socket
  // joins a specific one via joinLobby/hostJoin).
  socket.emit('gameStateUpdate', getSession());
  if (getSession().state !== 'LOBBY') {
     socket.emit('questionUpdate', {
        question: getSession().state === 'REVEAL' ? questions[getSession().currentQuestionIndex] : null,
        index: getSession().currentQuestionIndex,
        total: questions.length
     });
  }

  socket.on('joinLobby', ({ eventSlug, houseId, deviceId }, callback) => {
    const slug = eventSlug || DEFAULT_EVENT_SLUG;

    const house = joinHouse(slug, socket.id, houseId, deviceId);
    if (!house) {
      return callback({ error: 'Invalid house ID' });
    }
    if (house === 'TAKEN' || house === 'ALREADY_IN_OTHER_HOUSE') {
      return callback({ error: house, mine: deviceId ? houseOwnedBy(slug, deviceId) : null });
    }

    socketEventSlug.set(socket.id, slug);
    socket.join(slug);
    io.to(slug).emit('gameStateUpdate', getSession(slug));
    callback({ success: true, session: getSession(slug) });
  });

  // Join page: receive live session updates (to grey out taken houses)
  // without taking a house, and learn which house this device already owns.
  socket.on('watchLobby', ({ eventSlug, deviceId }, callback) => {
    const slug = eventSlug || DEFAULT_EVENT_SLUG;
    socket.join(slug);
    socket.emit('gameStateUpdate', getSession(slug));
    callback({ mine: deviceId ? houseOwnedBy(slug, deviceId) : null });
  });

  socket.on('adminReleaseHouse', (houseId) => {
    releaseHouse(DEFAULT_EVENT_SLUG, houseId);
    io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
  });

  socket.on('submitAnswer', ({ sessionId, houseId, key }, callback) => {
    const slug = socketEventSlug.get(socket.id) || DEFAULT_EVENT_SLUG;
    if (sessionId !== getSession(slug).id) return callback({ error: 'Invalid session' });

    const success = submitAnswer(slug, houseId, key);
    if (success) {
      io.to(slug).emit('houseSubmitted', { houseId });
      io.to(slug).emit('gameStateUpdate', getSession(slug));
      callback({ success: true });
    } else {
      callback({ error: 'Cannot submit answer' });
    }
  });

  // Host events — all scoped to DEFAULT_EVENT_SLUG until a host room picker exists.
  socket.on('hostJoin', (callback) => {
    socket.join(DEFAULT_EVENT_SLUG);
    callback({ success: true, session: getSession() });
  });

  socket.on('hostStartGame', () => {
    if (getSession().state !== 'LOBBY') return;
    nextQuestion();
    recordSessionStart(getSession().id, DEFAULT_EVENT_SLUG);
    startRound();
  });

  socket.on('hostNextQuestion', () => {
    if (getSession().state !== 'REVEAL') return;

    const currentIndex = getSession().currentQuestionIndex;

    // If we just finished Q5 (index 4), go to MID_SCOREBOARD
    if (currentIndex === 4) {
      setGameState(DEFAULT_EVENT_SLUG, 'MID_SCOREBOARD');
      io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
      return;
    }

    // Otherwise, move to next question
    const index = nextQuestion();

    if (index >= questions.length) {
      setGameState(DEFAULT_EVENT_SLUG, 'FINISHED');
      io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
      return;
    }
    startRound();
  });

  // Sequence: MID_SCOREBOARD -> Part 1 -> night 1 -> Part 2 -> night 2 -> ...
  // -> Part 5 -> night 5 -> FINISHED. A NIGHT_MODE round always follows the
  // Part it's attached to (session.lastCompletedPart), never a standalone
  // bonus — see gameState.ts's initializeNightMode for why roles/injuries
  // persist across the 5 rounds instead of resetting each time.
  socket.on('hostStartPart', (part: number) => {
    if (part < 1 || part > 5) return;
    const session = getSession();
    if (part === 1) {
      if (session.state !== 'MID_SCOREBOARD') return;
    } else {
      if (session.state !== 'NIGHT_MODE' || session.lastCompletedPart !== part - 1) return;
    }
    setGameState(DEFAULT_EVENT_SLUG, `PART_${part}` as any);
    io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
  });

  socket.on('hostFinishParts', () => {
    const session = getSession();
    if (session.state !== 'NIGHT_MODE' || session.lastCompletedPart !== 5) return;
    setGameState(DEFAULT_EVENT_SLUG, 'FINISHED');
    io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
  });

  socket.on('hostReveal', () => {
    if (getSession().state !== 'QUESTION_CLOSED') return;

    setGameState(DEFAULT_EVENT_SLUG, 'REVEAL');
    const results = calculateScores();
    const q = questions[getSession().currentQuestionIndex];

    io.to(DEFAULT_EVENT_SLUG).emit('revealAnswer', {
      correctKey: q.correctKey,
      explanation: q.explanation,
      houseResults: results
    });
    io.to(DEFAULT_EVENT_SLUG).emit('questionUpdate', {
       question: q,
       index: getSession().currentQuestionIndex,
       total: questions.length
    });
    io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
  });

  socket.on('hostNewRound', () => {
    // Snapshot this room's final results before wiping it, so past rounds stay
    // queryable even after the host resets back to LOBBY (no-op if Supabase
    // isn't configured — see server/db.ts).
    const finishedSession = getSession();
    if (finishedSession.state !== 'LOBBY') {
      recordSessionStart(finishedSession.id, DEFAULT_EVENT_SLUG)
        .then(() => recordSessionResults(finishedSession.id, finishedSession.houses))
        .then(() => recordSessionFinished(finishedSession.id))
        .catch((err) => console.error('[db] failed to archive session on reset:', err));
    }

    resetSession();
    io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
  });

  socket.on('hostStartNightMode', () => {
    const session = getSession();
    const match = session.state.match(/^PART_(\d)$/);
    if (!match) return;
    session.lastCompletedPart = parseInt(match[1], 10);
    initializeNightMode();
    io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
  });

  socket.on('hostWakeUpHouse', (houseId: number | null) => {
    if (getSession().state !== 'NIGHT_MODE') return;
    getSession().awakeHouseId = houseId;
    io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
  });

  socket.on('useNightSkill', (data, callback) => {
    const slug = socketEventSlug.get(socket.id) || DEFAULT_EVENT_SLUG;
    const success = processNightSkill(slug, data.houseId, data.targetId, data.action);
    if (success) {
      io.to(slug).emit('gameStateUpdate', getSession(slug));
    }
    callback({ success });
  });

  socket.on('adminLogin', (password, callback) => {
    callback({ success: password === ADMIN_PASSWORD });
  });

  socket.on('savePartProgress', async ({ houseId, partNumber, step, data, completed }, callback) => {
    const slug = socketEventSlug.get(socket.id) || DEFAULT_EVENT_SLUG;
    const session = getSession(slug);
    // Track which houses reached the end of each Part in memory too, so the
    // big screen can show "N/6 finished" even without Supabase configured.
    if (completed && houseId >= 1 && houseId <= 6 && partNumber >= 1 && partNumber <= 5) {
      const done = (session.partsCompleted ||= {});
      const list = (done[partNumber] ||= []);
      if (!list.includes(houseId)) {
        list.push(houseId);
        io.to(slug).emit('gameStateUpdate', session);
      }
    }
    const ok = await savePartProgress(session.id, slug, houseId, partNumber, step, data, !!completed);
    callback({ success: ok });
  });

  socket.on('getPartProgress', async ({ houseId }, callback) => {
    const slug = socketEventSlug.get(socket.id) || DEFAULT_EVENT_SLUG;
    const session = getSession(slug);
    const parts = await getPartProgress(session.id, houseId);
    callback({ parts });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    socketEventSlug.delete(socket.id);
    const affectedSlugs = leaveHouse(socket.id);
    affectedSlugs.forEach((slug) => {
      io.to(slug).emit('gameStateUpdate', getSession(slug));
    });
  });
});

function startRound() {
  const index = getSession().currentQuestionIndex;
  io.to(DEFAULT_EVENT_SLUG).emit('questionUpdate', {
    question: null, // Don't send question to clients until REVEAL, host will use local data
    index,
    total: questions.length
  });

  startCountdown(
    DEFAULT_EVENT_SLUG,
    (count) => {
      io.to(DEFAULT_EVENT_SLUG).emit('countdownUpdate', { countdown: count });
      io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
    },
    () => {
      // countdown complete, start question
      startQuestionTimer(
        DEFAULT_EVENT_SLUG,
        (time) => {
          io.to(DEFAULT_EVENT_SLUG).emit('timeUpdate', { timeRemaining: time });
        },
        () => {
          // Timer finished
          io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
        }
      );
      io.to(DEFAULT_EVENT_SLUG).emit('gameStateUpdate', getSession());
    }
  );
}

// REST API for Host to get question text/options while a round is in progress.
// correctKey/explanation are stripped out here (this endpoint is unauthenticated and
// publicly reachable) so players can't peek at the answer before REVEAL. The host
// still receives the full question, including the answer, via the 'questionUpdate'
// and 'revealAnswer' socket events once the question is revealed.
app.get('/api/questions', (req, res) => {
  const publicQuestions = questions.map(({ correctKey, explanation, ...rest }) => rest);
  res.json(publicQuestions);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
