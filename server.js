const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
let questions = [];
let players = {};
let selectedQuestions = [];
let currentQuestionIndex = -1;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Load and save questions
function loadQuestions() {
  try {
    const data = fs.readFileSync(QUESTIONS_FILE, 'utf8');
    questions = JSON.parse(data);
  } catch (e) {
    questions = [];
  }
}

function saveQuestions() {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
}

// Group questions by order and randomly pick one per level
function prepareQuestions() {
  const map = {};
  questions.forEach(q => {
    if (!map[q.order]) map[q.order] = [];
    map[q.order].push(q);
  });
  selectedQuestions = [];
  for (let level = 1; level <= 5; level++) {
    const pool = map[level] || [];
    if (pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      selectedQuestions.push(pool[idx]);
    }
  }
}

// Admin routes
app.get('/evergameadmin865', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});
app.get('/evergameadmin865/questions', (req, res) => {
  loadQuestions();
  res.json(questions);
});
app.post('/evergameadmin865/questions', (req, res) => {
  loadQuestions();
  const { question, options, answerIndex, order } = req.body;
  const q = {
    question,
    options,
    answerIndex: parseInt(answerIndex, 10),
    order: parseInt(order, 10)
  };
  const idx = questions.findIndex(x => x.order === q.order && x.question === q.question);
  if (idx !== -1) {
    questions[idx] = q;
  } else {
    questions.push(q);
  }
  saveQuestions();
  res.json({ success: true });
});
app.post('/evergameadmin865/start', (req, res) => {
  loadQuestions();
  prepareQuestions();
  // countdown 5..1
  for (let i = 5; i >= 1; i--) {
    setTimeout(() => io.emit('countdown', i), (6 - i) * 1000);
  }
  // start game after countdown
  setTimeout(() => {
    io.emit('countdown', 0);
    currentQuestionIndex = -1;
    sendNextQuestion();
  }, 6000);
  res.json({ started: true });
});

// Game page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Socket.io logic
io.on('connection', socket => {
  socket.on('join', nickname => {
    players[socket.id] = { nickname, score: 0, totalTime: 0, answered: false };
    io.emit('playerList', Object.values(players).map(p => ({ nickname: p.nickname })));
  });
  socket.on('answer', ({ index, time }) => {
    const p = players[socket.id];
    if (p && !p.answered && currentQuestionIndex >= 0) {
      p.answered = true;
      const q = selectedQuestions[currentQuestionIndex];
      if (index === q.answerIndex) {
        p.score++;
        p.totalTime += time;
      }
      if (Object.values(players).every(x => x.answered)) {
        sendResults();
      }
    }
  });
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerList', Object.values(players).map(p => ({ nickname: p.nickname })));
  });
});

function sendResults() {
  const arr = Object.entries(players).map(([id, p]) => ({ nickname: p.nickname, score: p.score, time: p.totalTime }));
  arr.sort((a, b) => b.score - a.score || a.time - b.time);
  io.emit('results', arr.map((p,i)=>({ ...p, rank: i+1 })));
  setTimeout(sendNextQuestion, 3000);
}

function sendNextQuestion() {
  Object.values(players).forEach(p => { p.answered = false; });
  currentQuestionIndex++;
  if (currentQuestionIndex >= selectedQuestions.length) {
    const final = Object.entries(players).map(([id, p]) => ({ nickname: p.nickname, score: p.score, time: p.totalTime }));
    final.sort((a,b)=>b.score-a.score||a.time-b.time);
    io.emit('gameOver', { winner: final[0].nickname, leaderboard: final });
    return;
  }
  const q = selectedQuestions[currentQuestionIndex];
  io.emit('question', { question: q.question, options: q.options });
}

loadQuestions();
server.listen(PORT, () => console.log(`Server on ${PORT}`));