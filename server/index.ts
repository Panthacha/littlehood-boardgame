import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { ClientToServerEvents, ServerToClientEvents } from './types';
import {
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
  processNightSkill
} from './gameState';
import { questions } from './data';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*', // For development
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current state on connect
  socket.emit('gameStateUpdate', getSession());
  if (getSession().state !== 'LOBBY') {
     socket.emit('questionUpdate', {
        question: getSession().state === 'REVEAL' ? questions[getSession().currentQuestionIndex] : null,
        index: getSession().currentQuestionIndex,
        total: questions.length
     });
  }

  socket.on('joinLobby', ({ eventSlug, houseId }, callback) => {
    // Note: We ignore eventSlug matching for now as we only have one global session.
    
    const house = joinHouse(socket.id, houseId);
    if (!house) {
      return callback({ error: 'Invalid house ID' });
    }

    socket.join(getSession().id); // join socket room
    io.emit('gameStateUpdate', getSession());
    callback({ success: true, session: getSession() });
  });

  socket.on('submitAnswer', ({ sessionId, houseId, key }, callback) => {
    if (sessionId !== getSession().id) return callback({ error: 'Invalid session' });
    
    const success = submitAnswer(houseId, key);
    if (success) {
      io.emit('houseSubmitted', { houseId });
      io.emit('gameStateUpdate', getSession());
      callback({ success: true });
    } else {
      callback({ error: 'Cannot submit answer' });
    }
  });

  // Host events
  socket.on('hostJoin', (callback) => {
    socket.join(getSession().eventSlug); // host joins room too
    callback({ success: true, session: getSession() });
  });

  socket.on('hostStartGame', () => {
    if (getSession().state !== 'LOBBY') return;
    nextQuestion();
    startRound();
  });

  socket.on('hostNextQuestion', () => {
    if (getSession().state !== 'REVEAL') return;
    
    const currentIndex = getSession().currentQuestionIndex;
    
    // If we just finished Q5 (index 4), go to MID_SCOREBOARD
    if (currentIndex === 4) {
      setGameState('MID_SCOREBOARD');
      io.emit('gameStateUpdate', getSession());
      return;
    }

    // Otherwise, move to next question
    const index = nextQuestion();
    
    if (index >= questions.length) {
      setGameState('FINISHED');
      io.emit('gameStateUpdate', getSession());
      return;
    }
    startRound();
  });

  socket.on('hostStartPostVideo', () => {
    if (getSession().state !== 'MID_SCOREBOARD') return;
    setGameState('POST_VIDEO');
    io.emit('gameStateUpdate', getSession());
  });

  socket.on('hostStartPostTest', () => {
    if (getSession().state !== 'POST_VIDEO') return;
    // Move to question index 5 (6th question)
    nextQuestion(); // this increments index from 4 to 5
    startRound();
  });

  socket.on('hostReveal', () => {
    if (getSession().state !== 'QUESTION_CLOSED') return;
    
    setGameState('REVEAL');
    const results = calculateScores();
    const q = questions[getSession().currentQuestionIndex];
    
    io.emit('revealAnswer', {
      correctKey: q.correctKey,
      explanation: q.explanation,
      houseResults: results
    });
    io.emit('questionUpdate', {
       question: q,
       index: getSession().currentQuestionIndex,
       total: questions.length
    });
    io.emit('gameStateUpdate', getSession());
  });

  socket.on('hostNewRound', () => {
    resetSession();
    io.emit('gameStateUpdate', getSession());
  });

  socket.on('hostStartNightMode', () => {
    if (getSession().state !== 'FINISHED') return;
    initializeNightMode();
    io.emit('gameStateUpdate', getSession());
  });

  socket.on('hostWakeUpHouse', (houseId: number | null) => {
    if (getSession().state !== 'NIGHT_MODE') return;
    getSession().awakeHouseId = houseId;
    io.emit('gameStateUpdate', getSession());
  });

  socket.on('useNightSkill', (data, callback) => {
    const success = processNightSkill(data.houseId, data.targetId, data.action);
    if (success) {
      io.emit('gameStateUpdate', getSession());
    }
    callback({ success });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    leaveHouse(socket.id);
    io.emit('gameStateUpdate', getSession());
  });
});

function startRound() {
  const index = getSession().currentQuestionIndex;
  io.emit('questionUpdate', {
    question: null, // Don't send question to clients until REVEAL, host will use local data
    index,
    total: questions.length
  });

  startCountdown(
    (count) => {
      io.emit('countdownUpdate', { countdown: count });
      io.emit('gameStateUpdate', getSession());
    },
    () => {
      // countdown complete, start question
      startQuestionTimer(
        (time) => {
          io.emit('timeUpdate', { timeRemaining: time });
        },
        () => {
          // Timer finished
          io.emit('gameStateUpdate', getSession());
        }
      );
      io.emit('gameStateUpdate', getSession());
    }
  );
}

// REST API for Host to get full question data
app.get('/api/questions', (req, res) => {
  res.json(questions);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
