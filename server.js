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
  } catch {
    questions = [];
  }
}
function saveQuestions() {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
}

// Pick questions per level (order 1-5)
function prepareQuestions() {
  const byOrder = {};
  questions.forEach(q => {
    (byOrder[q.order] = byOrder[q.order] || []).push(q);
  });
  selectedQuestions = [];
  for (let lvl = 1; lvl <= 5; lvl++) {
    const pool = byOrder[lvl] || [];
    if (pool.length) {
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
  const { question, options, answerIndex, order, tag } = req.body;
  const q = { question, options, answerIndex: +answerIndex, order: +order, tag };
  questions = questions.filter(x => !(x.order === q.order && x.question === q.question));
  questions.push(q);
  saveQuestions();
  res.json({ success: true });
});
app.post('/evergameadmin865/start', (req, res) => {
  loadQuestions();
  prepareQuestions();
  for (let i = 5; i >= 1; i--) {
    setTimeout(() => io.emit('countdown', i), (6 - i) * 1000);
  }
  setTimeout(() => {
    io.emit('countdown', 0);
    currentQuestionIndex = -1;
    sendNext();
  }, 6000);
  res.json({ started: true });
});

// Game page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Sockets
io.on('connection', socket => {
  socket.on('join', nick => {
    players[socket.id] = { nickname: nick, score: 0, time: 0, answered: false };
    io.emit('playerList', Object.values(players).map(p => ({ nickname: p.nickname })));
  });
  socket.on('answer', ({ index, time }) => {
    const p = players[socket.id];
    if (p && !p.answered && currentQuestionIndex >= 0) {
      p.answered = true;
      const q = selectedQuestions[currentQuestionIndex];
      if (q.answerIndex === index) {
        p.score++;
        p.time += time;
      }
      if (Object.values(players).every(x => x.answered)) sendResults();
    }
  });
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerList', Object.values(players).map(p => ({ nickname: p.nickname })));
  });
});

function sendResults() {
  const arr = Object.values(players).map(p => ({ nickname: p.nickname, score: p.score, time: p.time }));
  arr.sort((a, b) => b.score - a.score || a.time - b.time);
  io.emit('results', arr.map((p,i) => ({ ...p, rank: i+1 })));
  setTimeout(sendNext, 3000);
}

function sendNext() {
  Object.values(players).forEach(p => p.answered = false);
  currentQuestionIndex++;
  if (currentQuestionIndex >= selectedQuestions.length) {
    const end = Object.values(players).map(p => ({ nickname: p.nickname, score: p.score, time: p.time }));
    end.sort((a,b)=>b.score-a.score||a.time-b.time);
    io.emit('gameOver', { winner: end[0].nickname, leaderboard: end });
    return;
  }
  const q = selectedQuestions[currentQuestionIndex];
  io.emit('question', { question: q.question, options: q.options });
}

loadQuestions();
server.listen(PORT, () => console.log(`Listening on ${PORT}`));