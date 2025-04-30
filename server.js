const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const questions = JSON.parse(fs.readFileSync('questionbase.json', 'utf-8'));

let gameOpen = false;
let gameStarted = false;
const players = {};

// Middleware
app.use(express.static('public'));

// Admin endpoints
app.post('/evergameadmin865/open', (req, res) => {
  gameOpen = true;
  io.emit('gameStatus', { open: true });
  res.send({});
});

app.post('/evergameadmin865/start', (req, res) => {
  if (!gameOpen || gameStarted) return res.status(400).send({});
  gameStarted = true;
  
  // Countdown
  for (let i = 5; i >= 1; i--) {
    setTimeout(() => io.emit('countdown', i), (6 - i) * 1000);
  }
  
  setTimeout(() => {
    io.emit('countdown', 0);
    Object.keys(players).forEach(id => sendQuestion(id));
  }, 6000);
  
  res.send({});
});

// Socket logic
io.on('connection', socket => {
  socket.on('join', nick => {
    players[socket.id] = {
      nickname: nick,
      level: 1,
      correct: 0,
      color: `hsl(${Math.random() * 360},60%,50%)`,
      startTime: Date.now(),
      lastAnswerTime: Date.now()
    };
    updatePlayers();
  });

  socket.on('answer', idx => {
    const player = players[socket.id];
    if (!player || !gameStarted) return;
    
    const correct = idx === player.current.answerIndex;
    if (correct) {
      player.level = Math.min(player.level + 1, 5);
      player.correct++;
      player.lastAnswerTime = Date.now();
    }
    
    updatePlayers();
    socket.emit('answerResult', { correct, correctIndex: player.current.answerIndex });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    updatePlayers();
  });
});

function updatePlayers() {
  const playerList = Object.values(players).map(p => ({
    nickname: p.nickname,
    level: p.level,
    color: p.color,
    startTime: p.startTime,
    lastAnswerTime: p.lastAnswerTime
  }));
  
  io.emit('playerList', playerList);
}

function sendQuestion(id) {
  const player = players[id];
  const pool = questions.filter(q => q.order === player.level);
  player.current = pool[Math.floor(Math.random() * pool.length)];
  io.to(id).emit('question', player.current);
}

server.listen(3000, () => console.log('Server running'));
