const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const QUESTION_FILE = path.join(__dirname, 'questionbase.json');
let questions = [];
let gameOpen = false;
let gameStarted = false;
const players = {};

// Load and save
function loadQuestions() {
  try {
    questions = JSON.parse(fs.readFileSync(QUESTION_FILE, 'utf8'));
  } catch {
    questions = [];
  }
}
function saveQuestions() {
  fs.writeFileSync(QUESTION_FILE, JSON.stringify(questions, null, 2));
}

loadQuestions();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.static('public'));

// Admin panel
app.get('/evergameadmin865', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/evergameadmin865/questions', (req, res) => {
  loadQuestions();
  res.json(questions);
});
app.post('/evergameadmin865/questions', (req, res) => {
  loadQuestions();
  const { order, question, options, answerIndex } = req.body;
  // filter duplicates
  questions = questions.filter(q => !(q.order === +order && q.question === question));
  questions.push({ order: +order, question, options, answerIndex: +answerIndex });
  saveQuestions();
  res.json({ success: true });
});
app.post('/evergameadmin865/open', (req, res) => {
  gameOpen = true;
  io.emit('gameStatus', { open: true });
  res.json({ success: true });
});
app.post('/evergameadmin865/close', (req, res) => {
  gameOpen = false;
  gameStarted = false;
  io.emit('gameStatus', { open: false });
  res.json({ success: true });
});
app.post('/evergameadmin865/start', (req, res) => {
  if (!gameOpen) return res.status(400).json({ error: 'Game closed' });
  gameStarted = true;
  // countdown
  for (let i = 5; i >= 1; i--) {
    setTimeout(() => io.emit('countdown', i), (6 - i) * 1000);
  }
  setTimeout(() => io.emit('countdown', 0), 6000);
  res.json({ success: true });
});

app.get('/', (req, res) => {
  if (!gameOpen) return res.sendFile(path.join(__dirname, 'public', 'closed.html'));
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', socket => {
  socket.on('join', nick => {
    if (!gameOpen || !gameStarted) return;
    players[socket.id] = { nickname: nick, level: 1, time: 0 };
    io.emit('playerList', Object.values(players));
  });
  socket.on('answer', ({ index, time }) => {
    const p = players[socket.id];
    if (!p) return;
    // find question pool by order = level
    loadQuestions();
    const pool = questions.filter(q => q.order === p.level);
    if (!pool.length) return;
    // match by tempId
    const q = pool.find(q => q.tempId === p.currentQ);
    if (!q) return;
    const correct = +index === q.answerIndex;
    if (correct) {
      p.level++;
      p.time += time;
    }
    socket.emit('answerResult', { correct, correctIndex: q.answerIndex });
    io.emit('playerList', Object.values(players));
    // next question after delay
    setTimeout(() => sendQuestion(socket.id), 1000);
  });
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerList', Object.values(players));
  });
});

function sendQuestion(id) {
  const p = players[id];
  if (!p) return;
  loadQuestions();
  const pool = questions.filter(q => q.order === p.level);
  if (!pool.length) {
    io.to(id).emit('won');
    return;
  }
  const q = pool[Math.floor(Math.random() * pool.length)];
  q.tempId = Date.now() + Math.random();
  players[id].currentQ = q.tempId;
  io.to(id).emit('question', { question: q.question, options: q.options });
}

server.listen(process.env.PORT || 3000, () => console.log('Running'));