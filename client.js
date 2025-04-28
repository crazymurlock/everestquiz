const socket = io();
const joinDiv = document.getElementById('join');
const gameDiv = document.getElementById('game');
const resultsDiv = document.getElementById('results');
const modal = document.getElementById('question-modal');
const modalQuestion = document.getElementById('modal-question');
const modalOptions = document.getElementById('modal-options');

// Show join
joinDiv.style.display = 'block';
const qrImg = document.getElementById('qr');
qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(location.href)}`;

// Join event
document.getElementById('joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  socket.emit('join', nick);
  joinDiv.style.display = 'none';
  gameDiv.style.display = 'block';
};

let playerData = {};
socket.on('playerList', list => {
  const container = document.getElementById('players');
  container.innerHTML = '';
  playerData = {};
  list.forEach((p, idx) => {
    const el = document.createElement('div');
    el.className = 'player';
    const circle = document.createElement('div');
    circle.className = 'circle';
    circle.innerText = p.nickname.charAt(0).toUpperCase();
    const nickSpan = document.createElement('span');
    nickSpan.className = 'nick';
    nickSpan.innerText = p.nickname;
    el.appendChild(circle);
    el.appendChild(nickSpan);
    container.appendChild(el);
    playerData[p.nickname] = { el, score: 0, timeRank: idx };
  });
  updatePositions();
});

let qStart;
socket.on('question', ({ question, options }) => {
  modalQuestion.innerText = question;
  modalOptions.innerHTML = '';
  options.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = text;
    btn.onclick = () => {
      const t = (Date.now() - qStart) / 1000;
      socket.emit('answer', { index: i, time: t });
      Array.from(modalOptions.children).forEach(b => b.disabled = true);
    };
    modalOptions.appendChild(btn);
  });
  modal.classList.remove('hidden');
  qStart = Date.now();
});

socket.on('results', ranking => {
  ranking.forEach((r, i) => {
    const p = playerData[r.nickname];
    if (p) { p.score = r.score; p.timeRank = i; }
  });
  updatePositions();
  modal.classList.add('hidden');
});

socket.on('gameOver', winner => {
  gameDiv.style.display = 'none';
  resultsDiv.style.display = 'block';
  document.getElementById('winner').innerText = `🎉 ${winner} reached the top! 🎉`;
});

function updatePositions() {
  const container = document.getElementById('players');
  const w = container.clientWidth;
  const entries = Object.entries(playerData);
  entries.forEach(([nick, p], idx) => {
    const x = (idx + 1) / (entries.length + 1) * w - 20;
    const y = p.score * 80 + (entries.length - p.timeRank) * 5;
    p.el.style.left = `${x}px`;
    p.el.style.bottom = `${y}px`;
    p.el.title = `${nick}: ${p.score}`;
  });
}