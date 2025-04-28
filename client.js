const socket = io();
let self = '';
const joinDiv   = document.getElementById('join'),
      lobbyDiv  = document.getElementById('lobby'),
      playersList = document.getElementById('playersList'),
      gameDiv   = document.getElementById('game'),
      playersContainer = document.getElementById('playersContainer'),
      countdownOverlay = document.getElementById('countdownOverlay'),
      countdownNum     = document.getElementById('countdownNum'),
      questionModal    = document.getElementById('questionModal'),
      qtext            = document.getElementById('qtext'),
      optsDiv          = document.getElementById('opts'),
      resultDiv        = document.getElementById('result'),
      winnerText       = document.getElementById('winnerText'),
      statsTb          = document.getElementById('stats');

const circleEls = {}, baseBottom = 20, maxLevels = 5;

document.getElementById('joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  self = nick;
  socket.emit('join', nick);
};

socket.on('lobby', list => {
  joinDiv.style.display  = 'none';
  lobbyDiv.style.display = 'flex';
  playersList.innerHTML   = '';
  list.forEach(n => {
    const d = document.createElement('div');
    d.textContent = n === self ? `* ${n}` : n;
    playersList.append(d);
  });
});

socket.on('gameStatus', data => {
  if (!data.open) location = '/';
});

socket.on('countdown', n => {
  if (n > 0) {
    countdownNum.textContent = n;
    countdownOverlay.classList.add('show');
  } else {
    countdownOverlay.classList.remove('show');
    lobbyDiv.style.display = 'none';
    gameDiv.style.display  = 'block';
  }
});

socket.on('playerList', list => {
  playersContainer.innerHTML = '';
  const levels = {};
  list.forEach(p => {
    levels[p.level] = levels[p.level] || [];
    levels[p.level].push(p);
  });
  Object.values(levels).forEach(group => {
    group.forEach((p, idx) => {
      let entry = circleEls[p.nickname];
      if (!entry) {
        const el = document.createElement('div'); el.className = 'player';
        const circle = document.createElement('div'); circle.className = 'circle';
        circle.innerText = p.nickname.charAt(0).toUpperCase(); circle.style.background = p.color;
        const nickEl = document.createElement('div'); nickEl.className = 'nick'; nickEl.innerText = p.nickname;
        el.append(circle, nickEl);
        playersContainer.append(el);
        entry = { el, circle, nickEl };
        circleEls[p.nickname] = entry;
      }
      entry.el.classList.toggle('self', p.nickname === self);
      const left = (idx+1)/(group.length+1)*100;
      const bottom = baseBottom + (p.level - 1) * ((window.innerHeight - 200) / maxLevels);
      entry.el.style.left = left + '%';
      entry.el.style.bottom = bottom + 'px';
    });
  });
});

socket.on('question', ({question, options}) => {
  qtext.textContent = question;
  optsDiv.innerHTML = '';
  options.forEach((opt, i) => {
    const btn = document.createElement('button'); btn.className = 'option-btn'; btn.textContent = opt;
    btn.onclick = () => socket.emit('answer', i);
    optsDiv.append(btn);
  });
  questionModal.classList.add('show');
});

socket.on('answerResult', ({correct, correctIndex}) => {
  const btns = optsDiv.querySelectorAll('button');
  btns.forEach((b, i) => {
    if (i === correctIndex) b.classList.add('correct');
    else if (!correct) b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(() => questionModal.classList.remove('show'), 1000);
});

socket.on('gameOver', ({winner, stats}) => {
  confetti({ particleCount: 200, spread: 120 });
  gameDiv.style.display   = 'none';
  resultDiv.style.display = 'flex';
  winnerText.textContent  = `🏅 ${winner.nickname} — правильных: ${winner.correct}, время: ${Math.round(winner.time/1000)} с`;
  statsTb.innerHTML = '';
  stats.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;
    statsTb.append(tr);
  });
});
