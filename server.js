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
  try { questions = JSON.parse(fs.readFileSync(QUESTION_FILE, 'utf-8')); }
  catch { questions = []; }
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
  gameOpen = true; io.emit('gameStatus', { open: true }); res.json({});
});
app.post('/evergameadmin865/close', (req, res) => {
  gameOpen = false; gameStarted = false; io.emit('gameStatus', { open: false }); res.json({});
});
app.post('/evergameadmin865/start', (req, res) => {
  if (!gameOpen) return res.status(400).json({});
  gameStarted = true;
  for (let i = 5; i >= 1; i--) {
    setTimeout(() => io.emit('countdown', i), (6 - i) * 1000);
  }
  setTimeout(() => {
    io.emit('countdown', 0);
    loadQuestions();
    updatePlayerList();
    Object.keys(players).forEach(id => sendQuestion(id));
  }, 6000);
  res.json({});
});

app.get('/', (req, res) => {
  if (!gameOpen) return res.sendFile(path.join(__dirname, 'public', 'closed.html'));
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', socket => {
  socket.on('join', nick => {
    if (!gameOpen) return;
    players[socket.id] = { nickname: nick, level: 1, correct: 0, time: 0 };
    updatePlayerList();
    io.emit('lobby', Object.values(players).map(p => p.nickname));
  });

  socket.on('answer', idx => {
    const p = players[socket.id];
    if (!p || !gameStarted) return;
    loadQuestions();
    const pool = questions.filter(q => q.order === p.level);
    const q = p.currentQ;
    const timeTaken = Date.now() - q.startTime;
    let correct = false;
    if (q && idx === q.answerIndex) {
      correct = true;
      p.level++; p.correct++; p.time += timeTaken;
    }
    socket.emit('answerResult', { correct, correctIndex: q.answerIndex });
    updatePlayerList();
    setTimeout(() => {
      if (p.level > 5) {
        const stats = Object.values(players).map(p => ({
          nickname: p.nickname, correct: p.correct, time: p.time
        }));
        stats.sort((a, b) => b.correct - a.correct || a.time - b.time);
        io.emit('gameOver', { winner: stats[0], stats });
      } else sendQuestion(socket.id);
    }, 600);
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    updatePlayerList();
    io.emit('lobby', Object.values(players).map(p => p.nickname));
  });
});

function sendQuestion(id) {
  const p = players[id]; if (!p) return;
  loadQuestions();
  const pool = questions.filter(q => q.order === p.level);
  if (!pool.length) { io.to(id).emit('won'); return; }
  const q = { ...pool[Math.floor(Math.random()*pool.length)], startTime: Date.now() };
  p.currentQ = q;
  io.to(id).emit('question', { question: q.question, options: q.options });
}

function updatePlayerList() {
  const list = Object.values(players).map(p => ({ nickname: p.nickname, level: p.level }));
  io.emit('playerList', list);
}

server.listen(process.env.PORT || 3000, () => console.log('Server started'));
