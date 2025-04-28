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

// Admin
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
  // countdown
  for (let i = 5; i >= 1; i--) {
    setTimeout(() => io.emit('countdown', i), (6 - i) * 1000);
  }
  setTimeout(() => {
    io.emit('countdown', 0);
    // send questions
    Object.keys(players).forEach(id => sendQuestion(id));
  }, 6000);
  res.json({ success: true });
});

// Serve
app.get('/', (req, res) => {
  if (!gameOpen) return res.sendFile(path.join(__dirname, 'public', 'closed.html'));
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', socket => {
  socket.on('join', nick => {
    if (!gameOpen) return;
    players[socket.id] = { nickname: nick, level: 1, correctCount: 0, totalTime: 0 };
    io.emit('lobby', Object.entries(players).map(([id,p])=>p.nickname));
  });
  socket.on('answer', idx => {
    const p = players[socket.id];
    if (!p || !gameStarted) return;
    loadQuestions();
    const pool = questions.filter(q=>q.order===p.level);
    const q = p.currentQ;
    const timeTaken = Date.now() - q.startTime;
    let correct = false;
    if (q && idx === q.answerIndex) {
      correct = true;
      p.level++;
      p.correctCount++;
      p.totalTime += timeTaken;
    }
    socket.emit('answerResult', { correct, correctIndex: q.answerIndex });
    // update positions
    io.emit('playerList', Object.values(players).sort((a,b)=>{
      if(a.nickname===q.nickname) return -1;
      return 0;
    }));
    setTimeout(()=>{
      if(correct && p.level>5) {
        // game over
        const results = Object.values(players).map(p=>({
          nickname:p.nickname,
          correct:p.correctCount,
          time:p.totalTime
        }));
        results.sort((a,b)=> b.correct - a.correct || a.time - b.time);
        io.emit('gameOver', { winner: results[0], stats: results });
      } else {
        sendQuestion(socket.id);
      }
    }, 1000);
  });
  socket.on('disconnect', ()=>{ delete players[socket.id]; io.emit('lobby', Object.entries(players).map(([id,p])=>p.nickname)); });
});

function sendQuestion(id){
  const p = players[id];
  if(!p) return;
  loadQuestions();
  const pool = questions.filter(q=>q.order===p.level);
  if(!pool.length) { io.to(id).emit('won'); return; }
  const q = { ...pool[Math.floor(Math.random()*pool.length)], startTime:Date.now() };
  p.currentQ = q;
  io.to(id).emit('question', { question:q.question, options:q.options });
}

server.listen(process.env.PORT||3000,()=>console.log('Server running'));