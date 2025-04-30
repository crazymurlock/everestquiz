const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Load questions
const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'questionbase.json'), 'utf-8'));

let gameOpen = false;
let gameStarted = false;
const players = {};

// Utils
function randomColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h},60%,50%)`;
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Admin endpoints
app.get('/evergameadmin865', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.post('/evergameadmin865/open', (req, res) => {
  gameOpen = true;
  io.emit('gameStatus', { open: true });
  res.send({});
});
app.post('/evergameadmin865/close', (req, res) => {
  gameOpen = false;
  gameStarted = false;
  io.emit('gameStatus', { open: false });
  res.send({});
});
app.post('/evergameadmin865/start', (req, res) => {
  if (!gameOpen || gameStarted) return res.status(400).send({});
  gameStarted = true;
  // Countdown 5 to 1
  for (let i = 5; i >= 1; i--) {
    setTimeout(() => io.emit('countdown', i), (6 - i) * 1000);
  }
  setTimeout(() => {
    io.emit('countdown', 0);
      // initial circles before first question
      io.emit('playerList', Object.values(players).map(p=>({nickname:p.nickname, level:p.level, color:p.color})));
    Object.keys(players).forEach(id => sendQuestion(id));
  }, 6000);
  res.send({});
});

// Pages
app.get('/', (req, res) => {
  if (!gameOpen) return res.redirect('/closed.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io
io.on('connection', socket => {
  socket.emit('gameStatus', { open: gameOpen });

  socket.on('join', nick => {
    if (!gameOpen || gameStarted) return;
    players[socket.id] = {
      nickname: nick,
      level: 1,
      correct: 0,
      color: randomColor(),
      startTime: Date.now()
    };
    io.emit('lobby', Object.values(players).map(p => p.nickname));
    io.emit('playerList', Object.values(players).map(p => ({
      nickname: p.nickname, level: p.level, color: p.color
    })));
  });

  socket.on('answer', idx => {
    const p = players[socket.id];
    if (!p || !gameStarted) return;
    const q = p.current;
    const correct = idx === q.answerIndex;
    if (correct) {
      p.level++;
      p.correct++;
    }
    socket.emit('answerResult', { correct, correctIndex: q.answerIndex });
    io.emit('playerList', Object.values(players).map(p => ({
      nickname: p.nickname, level: p.level, color: p.color
    })));
    setTimeout(() => {
      if (p.level > 5) endGame();
      else sendQuestion(socket.id);
    }, 800);
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('lobby', Object.values(players).map(p => p.nickname));
    io.emit('playerList', Object.values(players).map(p => ({
      nickname: p.nickname, level: p.level, color: p.color
    })));
  });
});

// Helpers
function sendQuestion(id) {
  const p = players[id];
  const pool = questions.filter(q => q.order === p.level);
  if (!pool.length) return;
  const q = { ...pool[Math.floor(Math.random() * pool.length)] };
  p.current = q;
  io.to(id).emit('question', q);
}

function endGame() {
  const stats = Object.values(players).map(p => ({
    nickname: p.nickname, correct: p.correct, time: Date.now() - p.startTime
  }));
  stats.sort((a, b) => b.correct - a.correct || a.time - b.time);
  io.emit('gameOver', { winner: stats[0], stats });
}

// Launch
server.listen(process.env.PORT || 3000, () => console.log('Server started'));