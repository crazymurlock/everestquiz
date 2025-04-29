const socket = io();
let self = '';
const joinDiv = document.getElementById('join'),
      lobbyDiv = document.getElementById('lobby'),
      playersList = document.getElementById('playersList'),
      gameDiv = document.getElementById('game'),
      container = document.getElementById('playersContainer'),
      countdown = document.getElementById('countdownOverlay'),
      cntNum = document.getElementById('countdownNum'),
      qModal = document.getElementById('questionModal'),
      qText = document.getElementById('qtext'),
      opts = document.getElementById('opts'),
      resultDiv = document.getElementById('result'),
      wText = document.getElementById('winnerText'),
      statsTb = document.getElementById('stats');
const circles = {}, maxLevels = 5;

socket.on('gameStatus', data => {
  if (data.open) joinDiv.style.display = 'flex';
  else location = '/';
});

document.getElementById('joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  self = nick;
  socket.emit('join', nick);
};

socket.on('lobby', list => {
  joinDiv.style.display = 'none';
  lobbyDiv.style.display = 'flex';
  playersList.innerHTML = '';
  list.forEach(n => {
    const d = document.createElement('div');
    d.textContent = n === self ? `* ${n}` : n;
    playersList.append(d);
  });
});

socket.on('countdown', n => {
  if (n > 0) {
    cntNum.textContent = n;
    countdown.classList.add('show');
  } else {
    countdown.classList.remove('show');
    lobbyDiv.style.display = 'none';
    gameDiv.style.display = 'block';
  }
});

socket.on('playerList', list => {
  const cw = container.clientWidth, ch = container.clientHeight;
  const levelMap = {};
  list.forEach(p => {
    levelMap[p.level] = levelMap[p.level] || [];
    levelMap[p.level].push(p);
  });
  Object.values(levelMap).forEach(group => group.forEach((p,i) => {
    let entry = circles[p.nickname];
    if (!entry) {
      const el = document.createElement('div');
      el.className = 'player';
      const c = document.createElement('div');
      c.className = 'circle';
      c.textContent = p.nickname.charAt(0).toUpperCase();
      c.style.background = p.color;
      const n = document.createElement('div');
      n.className = 'nick';
      n.textContent = p.nickname;
      el.append(c, n);
      container.append(el);
      entry = { el };
      circles[p.nickname] = entry;
    }
    entry.el.classList.toggle('self', p.nickname === self);
    const leftFrac = (i + 1) / (group.length + 1);
    const x = cw * leftFrac - 14;
    const y = ch * (p.level / maxLevels);
    entry.el.style.transform = `translate3d(${x}px, -${y}px, 0)`;
  }));
});

socket.on('question', ({question, options}) => {
  qText.textContent = question;
  opts.innerHTML = '';
  options.forEach((o,i) => {
    const b = document.createElement('button');
    b.className = 'option-btn';
    b.textContent = o;
    b.onclick = () => socket.emit('answer', i);
    opts.append(b);
  });
  qModal.classList.add('show');
});

socket.on('answerResult', ({correct, correctIndex}) => {
  const btns = opts.querySelectorAll('button');
  btns.forEach((b, i) => {
    if (i === correctIndex) b.classList.add('correct');
    else if (!correct) b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(() => qModal.classList.remove('show'), 1000);
});

socket.on('gameOver', ({winner, stats}) => {
  confetti({ particleCount:200, spread:120 });
  gameDiv.style.display = 'none';
  resultDiv.style.display = 'flex';
  wText.textContent = `🏅 ${winner.nickname} — правильных: ${winner.correct}, время: ${Math.round(winner.time/1000)}с`;
  statsTb.innerHTML = '';
  stats.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;
    statsTb.append(tr);
  });
});
