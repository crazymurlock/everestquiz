const socket = io();
let self = '';

// Elements
const joinDiv = document.getElementById('join'),
      lobbyDiv = document.getElementById('lobby'),
      gameDiv = document.getElementById('game'),
      resultDiv = document.getElementById('result'),
      playersTb = document.getElementById('players'),
      countdownOverlay = document.getElementById('countdownOverlay'),
      countdownNum = document.getElementById('countdownNum'),
      questionModal = document.getElementById('questionModal'),
      qtext = document.getElementById('qtext'),
      optsDiv = document.getElementById('opts'),
      winnerText = document.getElementById('winnerText'),
      statsTb = document.getElementById('stats');

document.getElementById('joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  self = nick;
  socket.emit('join', nick);
  joinDiv.style.display = 'none';
  lobbyDiv.style.display = 'block';
};

socket.on('lobby', list => {
  playersTb.innerHTML = '';
  // self first
  list.filter(n => n === self).forEach(n => {
    playersTb.innerHTML += `<tr><td><strong>${n}</strong></td></tr>`;
  });
  list.filter(n => n !== self).forEach(n => {
    playersTb.innerHTML += `<tr><td>${n}</td></tr>`;
  });
});

socket.on('gameStatus', d => {
  if (!d.open) location = '/closed.html';
});

socket.on('countdown', n => {
  if (n > 0) {
    countdownNum.innerText = n;
    countdownOverlay.classList.add('show');
  } else {
    countdownOverlay.classList.remove('show');
    lobbyDiv.style.display = 'none';
    gameDiv.style.display = 'block';
  }
});

socket.on('question', ({question, options}) => {
  qtext.innerText = question;
  optsDiv.innerHTML = '';
  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = opt;
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
  setTimeout(() => {
    questionModal.classList.remove('show');
  }, 600);
});

socket.on('gameOver', ({winner, stats}) => {
  gameDiv.style.display = 'none';
  resultDiv.style.display = 'block';
  winnerText.innerText = `🏅 ${winner.nickname} — Правильных: ${winner.correct}, Время: ${Math.round(winner.time/1000)} с`;
  statsTb.innerHTML = '';
  stats.forEach(p => {
    statsTb.innerHTML += `<tr><td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td></tr>`;
  });
});

// Animate circles
socket.on('playerList', list => {
  // skip, handled on answer updates
});

// Place circles per level
socket.on('playerList', list => {
  // no direct display in lobby/game
});