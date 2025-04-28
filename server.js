const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.SHEET_ID;
const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A2:F';
let questions = [];
let players = {};
let currentQuestionIndex = -1;

// Load questions from Google Sheets
async function loadQuestions() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE,
  });
  const rows = res.data.values || [];
  questions = rows.map(r => ({
    question: r[0],
    options: r.slice(1, 5),
    answerIndex: parseInt(r[5], 10)
  }));
}

// Express static
app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

// Socket.io handling
io.on('connection', socket => {
  socket.on('join', nickname => {
    players[socket.id] = { nickname, score: 0, totalTime: 0, answered: false };
    io.emit('playerList', Object.values(players).map(p => ({ nickname: p.nickname })));
  });

  socket.on('answer', ({ index, time }) => {
    const p = players[socket.id];
    if (p && !p.answered && currentQuestionIndex >= 0) {
      p.answered = true;
      const q = questions[currentQuestionIndex];
      if (index === q.answerIndex) {
        p.score++;
        p.totalTime += time;
      }
      if (Object.values(players).every(x => x.answered)) {
        sendResults();
      }
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerList', Object.values(players).map(p => ({ nickname: p.nickname })));
  });
});

async function sendResults() {
  const list = Object.entries(players).map(([id, p]) => ({ id, ...p }));
  list.sort((a, b) => b.score - a.score || a.totalTime - b.totalTime);
  const ranking = list.map((p, i) => ({ nickname: p.nickname, score: p.score, rank: i }));
  io.emit('results', ranking);
  setTimeout(nextQuestion, 3000);
}

async function nextQuestion() {
  Object.values(players).forEach(p => { p.answered = false; });
  currentQuestionIndex++;
  if (currentQuestionIndex >= questions.length) {
    const winner = Object.values(players).reduce((a, b) => (b.score > a.score ? b : a), { score: -1 }).nickname;
    io.emit('gameOver', winner);
    return;
  }
  const q = questions[currentQuestionIndex];
  io.emit('question', { question: q.question, options: q.options });
}

loadQuestions().then(() => {
  io.emit('startGame');
  setTimeout(nextQuestion, 30000);
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));