const socket = io();
const joinDiv = document.getElementById('join');
const gameDiv = document.getElementById('game');
const countdownModal = document.getElementById('countdown-modal');
const countdownNumber = document.getElementById('countdown-number');
const questionModal = document.getElementById('question-modal');
const modalQuestion = document.getElementById('modal-question');
const modalOptions = document.getElementById('modal-options');
const resultsDiv = document.getElementById('results');
const winnerDiv = document.getElementById('winner');
const leaderboardBody = document.getElementById('leaderboard-body');

document.getElementById('joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  socket.emit('join', nick);
  joinDiv.classList.add('hidden');
  gameDiv.classList.remove('hidden');
  qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(location.href)}`;
};

let players = {};
socket.on('playerList', list => {
  const container = document.getElementById('players');
  container.innerHTML = '';
  list.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'player';
    const circle = document.createElement('div');
    circle.className = 'circle';
    circle.innerText = p.nickname.charAt(0).toUpperCase();
    const nick = document.createElement('div');
    nick.className = 'nick';
    nick.innerText = p.nickname;
    el.appendChild(circle); el.appendChild(nick);
    container.appendChild(el);
    players[p.nickname] = { el, score:0, time:0 };
  });
  updatePositions();
});

socket.on('countdown', num => {
  if (num > 0) {
    countdownNumber.innerText = num;
    countdownModal.classList.remove('hidden');
  } else {
    countdownModal.classList.add('hidden');
  }
});

let startTime;
socket.on('question', ({ question, options }) => {
  modalQuestion.innerText = question;
  modalOptions.innerHTML = '';
  options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = opt;
    btn.onclick = () => {
      const time = (Date.now() - startTime)/1000;
      socket.emit('answer', { index: idx, time });
      modalOptions.querySelectorAll('button').forEach(b=>b.disabled=true);
    };
    modalOptions.appendChild(btn);
  });
  questionModal.classList.remove('hidden');
  startTime = Date.now();
});

socket.on('results', ranking => {
  questionModal.classList.add('hidden');
  ranking.forEach(r => {
    players[r.nickname].score = r.score;
    players[r.nickname].time = r.time;
  });
  updatePositions();
});

socket.on('gameOver', data => {
  questionModal.classList.add('hidden');
  gameDiv.classList.add('hidden');
  resultsDiv.classList.remove('hidden');
  winnerDiv.innerText = data.winner;
  leaderboardBody.innerHTML = '';
  data.leaderboard.forEach((p,i) => {
    const row = `<tr><td>${i+1}</td><td>${p.nickname}</td><td>${p.score}</td><td>${p.time.toFixed(2)}</td></tr>`;
    leaderboardBody.innerHTML += row;
  });
});

function updatePositions() {
  const cont = document.getElementById('players');
  const w = cont.clientWidth, h = cont.clientHeight;
  Object.values(players).forEach((p,i)=>{
    const x = (i+1)/(Object.keys(players).length+1)*w - 20;
    const y = p.score * 60;
    p.el.style.left = x+'px';
    p.el.style.bottom = y+'px';
  });
}