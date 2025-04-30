const socket = io();
let self = '';
const joinDiv = document.getElementById('join'),
      lobbyDiv = document.getElementById('lobby'),
      gameDiv  = document.getElementById('game'),
      resultDiv= document.getElementById('result'),
      cntOv    = document.getElementById('countdownOverlay'),
      cntNum   = document.getElementById('cnt'),
      lobbyPl  = document.getElementById('lobbyPlayers'),
      track    = document.getElementById('track'),
      flag     = document.getElementById('flag'),
      playersContainer = document.getElementById('playersContainer'),
      questionDiv = document.getElementById('question'),
      joinBtn  = document.getElementById('joinBtn'),
      nickIn   = document.getElementById('nick'),
      qtext    = document.getElementById('qtext'),
      optsDiv  = document.getElementById('opts'),
      winnerText = document.getElementById('winnerText'),
      resStats = document.getElementById('resStats');

const circles = {};
const maxLevel = 5;

// Movement logic
function animateCircle(el, level) {
  const start = el._start;
  const flagRect = flag.getBoundingClientRect();
  const endX = flagRect.left + flagRect.width/2 - el.offsetWidth/2 - (level === maxLevel ? 3 : 0);
  const endY = flagRect.top + flagRect.height/2 - el.offsetHeight/2;
  const ratio = (Math.min(level, maxLevel) - 1)/(maxLevel - 1);
  const targetX = start.x + (endX - start.x)*ratio;
  const targetY = start.y + (endY - start.y)*ratio;
  const duration = (level >= maxLevel ? 2 : 1) + 's';
  el.style.transition = `top ${duration} ease, left ${duration} ease`;
  el.style.left = `${Math.round(targetX)}px`;
  el.style.top  = `${Math.round(targetY)}px`;
}

// Redirect closed
socket.on('gameStatus', data => {
  if (!data.open) location = '/closed.html';
});

// Join button
joinBtn.onclick = () => {
  const nick = nickIn.value.trim();
  if (!nick) return;
  self = nick;
  socket.emit('join', nick);
  joinDiv.classList.remove('visible');
  lobbyDiv.classList.add('visible');
};

// Lobby update
socket.on('lobby', list => {
  lobbyPl.innerHTML = '';
  list.forEach(n => {
    const d = document.createElement('div');
    d.textContent = n;
    lobbyPl.append(d);
  });
});

// Countdown
socket.on('countdown', n => {
  if (n > 0) {
    cntNum.textContent = n;
    cntOv.classList.add('show');
  } else {
    cntOv.classList.remove('show');
    lobbyDiv.classList.remove('visible');
    gameDiv.classList.add('visible');
    track.style.display = 'block';
    flag.style.display  = 'block';
    playersContainer.style.display = 'block';
    questionDiv.style.display = 'block';
    // Show initial circles
    // server emits playerList after countdown
  }
});

// Show question
socket.on('question', q => {
  qtext.textContent = q.question;
  optsDiv.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = () => socket.emit('answer', i);
    optsDiv.append(btn);
  });
});

// Answer result
socket.on('answerResult', res => {
  Array.from(optsDiv.children).forEach((b, i) => {
    if (i === res.correctIndex) b.classList.add('correct');
    else if (!res.correct)     b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(() => optsDiv.innerHTML = '', 800);
});

// Player list -> circles

socket.on('playerList', list => {
  list.forEach(p => {
    let el = circles[p.nickname];
    if (!el) {
      el = document.createElement('div');
      el.className = 'circle' + (p.nickname === self ? ' self' : '');
      el.style.position = 'absolute';
      el.style.background = p.color;
      // label
      const label = document.createElement('div');
      label.className = 'player-label' + (p.nickname===self?' self':'');
      label.textContent = p.nickname;
      el.append(label);
      // letter
      const letter = document.createElement('div');
      letter.className = 'circle-letter';
      letter.textContent = p.nickname.charAt(0).toUpperCase();
      el.append(letter);
      // initial start
      const qRect = questionDiv.getBoundingClientRect();
      const startX = window.innerWidth/2 - el.offsetWidth/2;
      const startY = qRect.top - el.offsetHeight - 1;
      el._start = {x: startX, y: startY};
      el._level = p.level;
      el.style.left = `${startX}px`;
      el.style.top = `${startY}px`;
      circles[p.nickname] = el;
      playersContainer.append(el);
    } else {
      el._level = p.level;
    }
    animateCircle(el, p.level);
  });
});


// Game over
socket.on('gameOver', data => {
  setTimeout(() => {
    gameDiv.classList.remove('visible');
    resultDiv.classList.add('visible');
    winnerText.textContent = `🏅 ${data.winner.nickname} — ${data.winner.correct} правильн. за ${Math.round(data.winner.time/1000)}с`;
    resStats.innerHTML = '';
    data.stats.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;
      resStats.append(tr);
    });
    confetti();
  }, 3000);
});