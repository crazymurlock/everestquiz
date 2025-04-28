const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let gameOpen = false;
let gameStarted = false;
const QUESTION_FILE = path.join(__dirname, 'questionbase.json');
let questionsByOrder = {};
let players = {};

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// Load questions grouped by order
function loadQuestions() {
  try {
    const data = fs.readFileSync(QUESTION_FILE, 'utf8');
    const arr = JSON.parse(data);
    questionsByOrder = {};
    arr.forEach(q => {
      if (!questionsByOrder[q.order]) questionsByOrder[q.order] = [];
      questionsByOrder[q.order].push(q);
    });
  } catch {
    questionsByOrder = {};
  }
}

// Admin panel
app.get('/evergameadmin865', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/evergameadmin865/questions', (req, res) => {
  try {
    const arr = JSON.parse(fs.readFileSync(QUESTION_FILE, 'utf8'));
    res.json(arr);
  } catch {
    res.json([]);
  }
});
app.post('/evergameadmin865/questions', (req, res) => {
  let arr = [];
  try {
    arr = JSON.parse(fs.readFileSync(QUESTION_FILE, 'utf8'));
  } catch {}
  const { question, options, answerIndex, order } = req.body;
  // Remove existing with same question and order
  arr = arr.filter(q => !(q.order === +order && q.question === question));
  arr.push({ order: +order, question, options, answerIndex: +answerIndex });
  fs.writeFileSync(QUESTION_FILE, JSON.stringify(arr, null, 2));
  loadQuestions();
  res.json({ success: true });
});
app.post('/evergameadmin865/open', (req, res) => {
  gameOpen = true;
  io.emit('gameStatus', { open: true });
  res.json({ gameOpen: true });
});
app.post('/evergameadmin865/close', (req, res) => {
  gameOpen = false;
  gameStarted = false;
  io.emit('gameStatus', { open: false });
  res.json({ gameOpen: false });
});
app.post('/evergameadmin865/start', (req, res) => {
  if (!gameOpen) return res.status(400).json({ error: 'Game is closed' });
  gameStarted = true;
  loadQuestions();
  for (let i = 5; i > 0; i--) {
    setTimeout(() => io.emit('countdown', i), (6 - i) * 1000);
  }
  setTimeout(() => {
    io.emit('countdown', 0);
    // Send initial questions
    Object.keys(players).forEach(id => sendQuestion(id));
  }, 6000);
  res.json({ started: true });
});

// Serve appropriate page
app.get('/', (req, res) => {
  if (!gameOpen) return res.sendFile(path.join(__dirname, 'public', 'closed.html'));
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket logic
io.on('connection', socket => {
  socket.on('join', nick => {
    if (!gameOpen) return;
    players[socket.id] = { nickname: nick, level: 1, time: 0 };
    io.emit('playerList', Object.values(players));
  });
  socket.on('answer', ({ index, time }) => {
    const p = players[socket.id];
    if (!p || !gameStarted) return;
    const pool = questionsByOrder[p.level] || [];
    const current = pool.find(q => q.tempId === p.currentQ);
    if (!current) return;
    if (+index === current.answerIndex) {
      p.level++;
      p.time += time;
      io.to(socket.id).emit('answerResult', { correct: true, correctIndex: current.answerIndex });
    } else {
      io.to(socket.id).emit('answerResult', { correct: false, correctIndex: current.answerIndex });
    }
    io.emit('playerList', Object.values(players));
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
  const pool = questionsByOrder[p.level] || [];
  if (!pool.length) {
    io.to(id).emit('won');
    return;
  }
  const q = pool[Math.floor(Math.random() * pool.length)];
  q.tempId = Date.now() + Math.random();
  players[id].currentQ = q.tempId;
  io.to(id).emit('question', { question: q.question, options: q.options });
}

// Initialize
loadQuestions();
server.listen(process.env.PORT || 3000, () => console.log('Server running'));