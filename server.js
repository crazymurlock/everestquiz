const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Load questions
const QUESTIONS = path.join(__dirname,'questionbase.json');
let questions = [];
try { questions = JSON.parse(fs.readFileSync(QUESTIONS,'utf-8')); } catch(e){}

let gameStarted = false;
const players = {};

app.use(express.json());
app.use(express.static('public'));

// Admin start endpoint
app.post('/evergameadmin865/start', (req, res) => {
  if(gameStarted) return res.status(400).send({});
  gameStarted = true;
  // countdown 5 to 1
  for(let i=5;i>=1;i--){
    setTimeout(()=> io.emit('countdown', i), (6-i)*1000);
  }
  setTimeout(()=> {
    io.emit('countdown', 0);
    Object.keys(players).forEach(id => sendQuestion(id));
  }, 6000);
  res.send({});
});

// Serve index.html always
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'public','index.html'));
});

// Socket.io
io.on('connection', socket => {
  socket.on('join', nick => {
    if(gameStarted) return;
    players[socket.id] = {
      nickname: nick,
      level: 1,
      correct: 0,
      color: randomColor(),
      startTime: Date.now()
    };
    io.emit('lobby', Object.values(players).map(p => p.nickname));
  });
  socket.on('answer', idx => {
    const p = players[socket.id];
    if(!p || !gameStarted) return;
    const q = p.current;
    const correct = idx === q.answerIndex;
    if(correct) {
      p.level++;
      p.correct++;
    }
    socket.emit('answerResult', { correct, correctIndex: q.answerIndex });
    io.emit('playerList', Object.values(players).map(p => ({
      nickname: p.nickname,
      level: p.level,
      color: p.color
    })));
    setTimeout(() => {
      if(p.level > 5) endGame();
      else sendQuestion(socket.id);
    }, 800);
  });
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('lobby', Object.values(players).map(p => p.nickname));
    io.emit('playerList', Object.values(players).map(p => ({
      nickname: p.nickname,
      level: p.level,
      color: p.color
    })));
  });
});

function sendQuestion(id) {
  const p = players[id];
  const pool = questions.filter(q => q.order === p.level);
  if(!pool.length) return;
  const q = { ...pool[Math.floor(Math.random() * pool.length)] };
  p.current = q;
  io.to(id).emit('question', q);
}

function endGame() {
  const stats = Object.values(players).map(p => ({
    nickname: p.nickname,
    correct: p.correct,
    time: Date.now() - p.startTime
  }));
  stats.sort((a,b) => b.correct - a.correct || a.time - b.time);
  io.emit('gameOver', { winner: stats[0], stats });
}

function randomColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h},60%,50%)`;
}

server.listen(process.env.PORT || 3000, () => console.log('Server started'));