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
let currentQuestionIndex = -1;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Load and save questions
function loadQuestions() {
  try {
    const data = fs.readFileSync(QUESTIONS_FILE, 'utf8');
    questions = JSON.parse(data);
    questions.sort((a, b) => a.order - b.order);
  } catch (e) {
    questions = [];
  }
}

function saveQuestions() {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
}

loadQuestions();

// Admin routes
app.get('/evergameadmin865', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});
app.get('/evergameadmin865/questions', (req, res) => {
  res.json(questions);
});
app.post('/evergameadmin865/questions', (req, res) => {
  const { question, options, answerIndex, order } = req.body;
  const q = { question, options, answerIndex: parseInt(answerIndex, 10), order: parseInt(order, 10) };
  const idx = questions.findIndex(x => x.order === q.order);
  if (idx !== -1) questions[idx] = q;
  else questions.push(q);
  saveQuestions();
  loadQuestions();
  res.json({ success: true });
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
      const q = questions[currentQuestionIndex];
      if (index === q.answerIndex) {
        p.score++;
        p.totalTime += time;
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
  const list = Object.entries(players).map(([id, p]) => ({ id, ...p }));
  list.sort((a, b) => b.score - a.score || a.totalTime - b.totalTime);
  const ranking = list.map((p, i) => ({ nickname: p.nickname, score: p.score, rank: i }));
  io.emit('results', ranking);
  setTimeout(nextQuestion, 3000);
}

function nextQuestion() {
  Object.values(players).forEach(p => { p.answered = false; });
  currentQuestionIndex++;
  if (currentQuestionIndex >= questions.length) {
    const winner = Object.values(players).reduce((a, b) => (b.score > a.score ? b : a), { score: -1 }).nickname;
    io.emit('gameOver', winner);
    return;
  }
  const q = questions[currentQuestionIndex];
  io.emit('question', { question: q.question, options: q.options });
}

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));