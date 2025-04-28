const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');

const QUESTION_FILE = path.join(__dirname, 'questionbase.json');
let questions = [], gameOpen = false, gameStarted = false, players = {};

function loadQuestions() {
  try { questions = JSON.parse(fs.readFileSync(QUESTION_FILE, 'utf-8')); }
  catch { questions = []; }
}
loadQuestions();

function randomColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h},60%,50%)`;
}

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.static('public'));

app.get('/evergameadmin865', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.post('/evergameadmin865/open', (req, res) => {
  gameOpen = true; io.emit('gameStatus',{open:true}); res.json({});
});
app.post('/evergameadmin865/close', (req, res) => {
  gameOpen = false; gameStarted = false;
  io.emit('gameStatus',{open:false}); res.json({});
});
app.post('/evergameadmin865/start', (req, res) => {
  if(!gameOpen) return res.status(400).json({});
  gameStarted = true;
  for(let i=5; i>=1; i--) setTimeout(()=>io.emit('countdown', i), (6-i)*1000);
  setTimeout(() => {
    io.emit('countdown', 0);
    loadQuestions();
    updatePlayerList();
    Object.keys(players).forEach(id => sendQuestion(id));
  }, 6000);
  res.json({});
});
app.get('/', (req, res) => {
  if(!gameOpen) return res.sendFile(path.join(__dirname,'public','closed.html'));
  res.sendFile(path.join(__dirname,'public','index.html'));
});

io.on('connection', socket => {
  socket.on('join', nick => {
    if(!gameOpen) return;
    players[socket.id] = {
      nickname: nick, level: 1, correct: 0, time: 0, color: randomColor()
    };
    updatePlayerList();
    io.emit('lobby', Object.values(players).map(p=>p.nickname));
  });
  socket.on('answer', idx => {
    const p = players[socket.id]; if(!p||!gameStarted) return;
    loadQuestions();
    const pool = questions.filter(q=>q.order===p.level);
    const q = p.currentQ;
    if(q && idx === q.answerIndex) {
      p.level++; p.correct++; p.time += (Date.now() - q.startTime);
    }
    socket.emit('answerResult',{correct: idx===q.answerIndex, correctIndex: q.answerIndex});
    updatePlayerList();
    setTimeout(()=>{
      if(p.level>5) {
        const stats = Object.values(players).map(p=>({
          nickname:p.nickname, correct:p.correct, time:p.time
        }));
        stats.sort((a,b)=>b.correct-a.correct||a.time-b.time);
        io.emit('gameOver',{winner:stats[0],stats});
      } else sendQuestion(socket.id);
    },600);
  });
  socket.on('disconnect', () => {
    delete players[socket.id];
    updatePlayerList();
    io.emit('lobby', Object.values(players).map(p=>p.nickname));
  });
});

function sendQuestion(id) {
  const p = players[id]; if(!p) return;
  loadQuestions();
  const pool = questions.filter(q=>q.order===p.level);
  if(!pool.length){ io.to(id).emit('won'); return; }
  const question = {...pool[Math.floor(Math.random()*pool.length)], startTime: Date.now()};
  p.currentQ = question;
  io.to(id).emit('question',{question:question.question, options:question.options});
}

function updatePlayerList() {
  const list = Object.values(players).map(p=>({
    nickname: p.nickname, level: p.level, color: p.color
  }));
  io.emit('playerList', list);
}

server.listen(process.env.PORT||3000, () => console.log('Server running'));
