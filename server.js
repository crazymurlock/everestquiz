const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let gameOpen = false;
let gameStarted = false;
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
let questions = {};
let players = {};

function loadQuestions() {
  try {
    const data = fs.readFileSync(QUESTIONS_FILE, 'utf8');
    const arr = JSON.parse(data);
    questions = {};
    arr.forEach(q => {
      if (!questions[q.order]) questions[q.order] = [];
      questions[q.order].push(q);
    });
  } catch {
    questions = {};
  }
}
function saveQuestions(arr) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(arr, null, 2));
}

// Static files
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// Admin routes
app.get('/evergameadmin865', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});
app.get('/evergameadmin865/questions', (req, res) => {
  try {
    const arr = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
    res.json(arr);
  } catch {
    res.json([]);
  }
});
app.post('/evergameadmin865/questions', (req, res) => {
  let arr = [];
  try {
    arr = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
  } catch {}
  const { question, options, answerIndex, order } = req.body;
  // Remove duplicates
  arr = arr.filter(q => !(q.order === +order && q.question === question));
  arr.push({ question, options, answerIndex: +answerIndex, order: +order });
  saveQuestions(arr);
  loadQuestions();
  res.json({ success: true });
});
app.post('/evergameadmin865/open', (req, res) => {
  gameOpen = true;
  res.json({ gameOpen });
});
app.post('/evergameadmin865/close', (req, res) => {
  gameOpen = false;
  res.json({ gameOpen });
});
app.post('/evergameadmin865/start', (req, res) => {
  if (!gameOpen) return res.status(400).json({ error: 'Game is closed' });
  gameStarted = true;
  // Countdown
  for (let i = 5; i >= 1; i--) {
    setTimeout(() => io.emit('countdown', i), (6 - i) * 1000);
  }
  setTimeout(() => {
    io.emit('countdown', 0);
    // send first question per player
    Object.keys(players).forEach(id => sendQuestion(id));
  }, 6000);
  res.json({ started: true });
});

// Game page
app.get('/', (req, res) => {
  if (!gameOpen) return res.sendFile(path.join(__dirname, 'public/closed.html'));
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Socket logic
io.on('connection', socket => {
  socket.on('join', nick => {
    if (!gameOpen) return;
    players[socket.id] = { nickname: nick, level: 1, time: 0 };
    io.emit('playerList', Object.values(players).map(p => ({ nickname: p.nickname, level: p.level })));
  });
  socket.on('answer', ({ index, time }) => {
    const p = players[socket.id];
    if (!p || !gameStarted) return;
    const pool = questions[p.level] || [];
    const q = pool.find(q => q.tempId === p.currentQ);
    if (!q) return;
    // response
    if (+index === q.answerIndex) {
      p.time += time;
      p.level++;
      io.to(socket.id).emit('answerResult', { correct: true });
    } else {
      io.to(socket.id).emit('answerResult', { correct: false, correctIndex: q.answerIndex });
    }
    if (p.level > 5) {
      // game over for this player
      io.to(socket.id).emit('won');
    } else {
      // next question for this player
      setTimeout(() => sendQuestion(socket.id), 1000);
    }
    // update positions globally
    io.emit('playerList', Object.values(players).map(p => ({ nickname: p.nickname, level: p.level })));
  });
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerList', Object.values(players).map(p => ({ nickname: p.nickname, level: p.level })));
  });
});

function sendQuestion(id) {
  const p = players[id];
  if (!p) return;
  loadQuestions();
  const pool = questions[p.level] || [];
  if (!pool.length) return;
  const q = pool[Math.floor(Math.random() * pool.length)];
  q.tempId = Date.now() + Math.random();
  players[id].currentQ = q.tempId;
  io.to(id).emit('question', { question: q.question, options: q.options, level: p.level });
}

loadQuestions();
server.listen(process.env.PORT || 3000, () => console.log('Server started'));