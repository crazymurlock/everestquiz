const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');

const QUESTION_FILE = path.join(__dirname, 'questionbase.json');

let questions = [];
let gameOpen = false;
let gameStarted = false;
const players = {};

// Load/save
function loadQuestions() {
  try { questions = JSON.parse(fs.readFileSync(QUESTION_FILE)); }
  catch { questions = []; }
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

// Admin endpoints
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
  if (!gameOpen) return res.status(400).json({ error: 'closed' });
  gameStarted = true;
  // Countdown 5..1
  for (let i = 5; i >= 1; i--) {
    setTimeout(() => io.emit('countdown', i), (6 - i) * 1000);
  }
  // After countdown, emit startQuiz
  setTimeout(() => io.emit('startQuiz'), 6000);
  res.json({ success: true });
});

// Pages
app.get('/', (req, res) => {
  if (!gameOpen) return res.sendFile(path.join(__dirname, 'public', 'closed.html'));
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket logic
io.on('connection', socket => {
  socket.on('join', nick => {
    if (!gameOpen) return;
    players[socket.id] = { nickname: nick, level: 1, time: 0, answered: false };
    io.emit('playerList', Object.values(players).map(p=>({ nickname: p.nickname, level: p.level })));
  });
  socket.on('answer', idx => {
    const p = players[socket.id];
    if (!p || !gameStarted) return;
    const pool = questions.filter(q => q.order === p.level);
    const q = p.currentQ;
    if (!q) return;
    if (idx === q.answerIndex) {
      p.level++;
      p.time += Date.now() - q.startTime;
      socket.emit('answerResult', { correct: true, correctIndex: q.answerIndex });
    } else {
      socket.emit('answerResult', { correct: false, correctIndex: q.answerIndex });
    }
    io.emit('playerList', Object.values(players).map(p=>({ nickname: p.nickname, level: p.level })));
    setTimeout(() => sendQuestion(socket.id), 1500);
  });
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerList', Object.values(players).map(p=>({ nickname: p.nickname, level: p.level })));
  });
});

function sendQuestion(id) {
  const p = players[id];
  if (!p) return;
  loadQuestions();
  const pool = questions.filter(q => q.order === p.level);
  if (!pool.length) {
    io.to(id).emit('won', { nickname: p.nickname });
    return;
  }
  const q = Object.assign({}, pool[Math.floor(Math.random()*pool.length)]);
  q.startTime = Date.now();
  players[id].currentQ = q;
  io.to(id).emit('question', { question: q.question, options: q.options });
}

server.listen(3000, () => console.log('Server running'));