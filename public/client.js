const socket = io();
const joinDiv = document.getElementById('join');
const gameDiv = document.getElementById('game');
const resultsDiv = document.getElementById('results');

document.getElementById('join').style.display = 'block';

const qrImg = document.getElementById('qr');
qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(location.href)}`;

document.getElementById('joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  socket.emit('join', nick);
  joinDiv.style.display = 'none';
  gameDiv.style.display = 'block';
};

let playerElems = {};

socket.on('playerList', list => {
  const container = document.getElementById('players');
  container.innerHTML = '';
  playerElems = {};
  list.forEach((p, idx) => {
    const el = document.createElement('div');
    el.className = 'player';
    el.innerText = p.nickname.charAt(0).toUpperCase();
    container.appendChild(el);
    playerElems[p.nickname] = { el, score: 0, timeRank: idx };
  });
  updatePositions();
});

let qStart;
socket.on('question', ({ question, options }) => {
  qStart = Date.now();
  document.getElementById('qtext').innerText = question;
  const opts = document.getElementById('options');
  opts.innerHTML = '';
  options.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.innerText = text;
    btn.onclick = () => {
      const t = (Date.now() - qStart) / 1000;
      socket.emit('answer', { index: i, time: t });
      Array.from(opts.children).forEach(b => b.disabled = true);
    };
    opts.appendChild(btn);
  });
});

socket.on('results', ranking => {
  ranking.forEach((r, i) => {
    const p = playerElems[r.nickname];
    if (p) {
      p.score = r.score;
      p.timeRank = i;
    }
  });
  updatePositions();
});

socket.on('gameOver', winner => {
  gameDiv.style.display = 'none';
  resultsDiv.style.display = 'block';
  document.getElementById('winner').innerText = `🎉 ${winner} reached the top! 🎉`;
});

function updatePositions() {
  const container = document.getElementById('players');
  const w = container.clientWidth;
  const h = container.clientHeight;
  const entries = Object.entries(playerElems);
  entries.forEach(([nick, p], idx) => {
    const x = (idx + 1) / (entries.length + 1) * w - 20;
    const y = p.score * 80 + (entries.length - p.timeRank) * 5;
    p.el.style.left = `${x}px`;
    p.el.style.bottom = `${y}px`;
    p.el.title = `${nick}: ${p.score}`;
  });
}