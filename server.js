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

function loadQuestions() {
  try {
    questions = JSON.parse(fs.readFileSync(QUESTION_FILE, 'utf-8'));
  } catch {
    questions = [];
  }
}

loadQuestions();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.static('public'));

// Admin routes
app.get('/evergameadmin865', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
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
  // Countdown 5..1
  for (let i = 5; i >= 1; i--) {
    setTimeout(() => io.emit('countdown', i), (6 - i) * 1000);
  }
  setTimeout(() => {
    io.emit('countdown', 0);
    // send first questions
    Object.keys(players).forEach(id => sendQuestion(id));
  }, 6000);
  res.json({ success: true });
});

// Serve pages
app.get('/', (req, res) => {
  if (!gameOpen) return res.sendFile(path.join(__dirname, 'public', 'closed.html'));
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', socket => {
  socket.on('join', nick => {
    if (!gameOpen) return;
    players[socket.id] = { nickname: nick, level: 1 };
    io.emit('playerList', Object.values(players).map(p => ({
      nickname: p.nickname,
      level: p.level
    })));
  });

  socket.on('answer', idx => {
    const p = players[socket.id];
    if (!p || !gameStarted) return;
    loadQuestions();
    const pool = questions.filter(q => q.order === p.level);
    const q = p.currentQ;
    const correct = q && idx === q.answerIndex;
    socket.emit('answerResult', { correct, correctIndex: q.answerIndex });
    if (correct) {
      p.level++;
    }
    io.emit('playerList', Object.values(players).map(p => ({
      nickname: p.nickname,
      level: p.level
    })));
    setTimeout(() => sendQuestion(socket.id), 1000);
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerList', Object.values(players).map(p => ({
      nickname: p.nickname,
      level: p.level
    })));
  });
});

function sendQuestion(id) {
  const p = players[id];
  if (!p) return;
  loadQuestions();
  const pool = questions.filter(q => q.order === p.level);
  if (pool.length === 0) {
    io.to(id).emit('won', { nickname: p.nickname });
    return;
  }
  const q = { ...pool[Math.floor(Math.random() * pool.length)] };
  p.currentQ = q;
  io.to(id).emit('question', { question: q.question, options: q.options });
}

server.listen(process.env.PORT || 3000, () => console.log('Server running'));