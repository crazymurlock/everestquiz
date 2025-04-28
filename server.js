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
  try { questions = JSON.parse(fs.readFileSync(QUESTION_FILE)); }
  catch { questions = []; }
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
  // after countdown, send first questions
  setTimeout(() => {
    io.emit('countdown', 0);
    // send first question to all players
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
    io.emit('playerList', Object.values(players).map(p => ({ nickname: p.nickname, level: p.level })));
  });
  socket.on('answer', idx => {
    const p = players[socket.id];
    if (!p || !gameStarted) return;
    loadQuestions();
    const pool = questions.filter(q => q.order === p.level);
    const q = p.currentQ;
    let correct = false;
    if (q && idx === q.answerIndex) {
      correct = true;
      p.level++;
    }
    socket.emit('answerResult', { correct, correctIndex: q.answerIndex });
    io.emit('playerList', Object.values(players).map(p => ({ nickname: p.nickname, level: p.level })));
    // send next question
    setTimeout(() => sendQuestion(socket.id), 1000);
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
  const pool = questions.filter(q => q.order === p.level);
  if (!pool.length) {
    io.to(id).emit('won');
    return;
  }
  const q = Object.assign({}, pool[Math.floor(Math.random() * pool.length)]);
  p.currentQ = q;
  io.to(id).emit('question', { question: q.question, options: q.options });
}

server.listen(process.env.PORT || 3000, () => console.log('Server running'));