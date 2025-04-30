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

const circles = {}, maxLevel = 5;

// animateCircle: along individual beam from start to flag
function animateCircle(el) {
  const level = el._level;
  const startX = el._startX, startY = el._startY;
  const flagRect = document.getElementById('flag').getBoundingClientRect();
  const endX = flagRect.left + flagRect.width/2 - el.offsetWidth/2;
  const endY = flagRect.top + flagRect.height/2 - el.offsetHeight/2;
  const ratio = Math.min((level-1)/(maxLevel-1), 1);
  const targetX = startX + (endX - startX)*ratio;
  const targetY = startY + (endY - startY)*ratio;
  const duration = (level >= maxLevel ? 2 : 1) + 's';
  el.style.transition = `top ${duration} ease, left ${duration} ease`;
  el.style.left = Math.round(targetX) + 'px';
  el.style.top = Math.round(targetY) + 'px';
}

// Handle gameStatus
socket.on('gameStatus', data => {
  if (!data.open) location = '/closed.html';
});

// Join
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
  }
});

// Question
socket.on('question', q => {
  qtext.textContent = q.question;
  optsDiv.innerHTML = '';
  q.options.forEach((opt,i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = () => socket.emit('answer', i);
    optsDiv.append(btn);
  });
});

// Answer result
socket.on('answerResult', res => {
  Array.from(optsDiv.children).forEach((b,i) => {
    if (i === res.correctIndex) b.classList.add('correct');
    else if (!res.correct)    b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(()=>optsDiv.innerHTML='',800);
});

// PlayerList

socket.on('playerList', list => {
  // ensure gameDiv visible or initial after countdown
  // render or update circles
  list.forEach(p => {
    let el = circles[p.nickname];
    if (!el) {
      // create container div
      el = document.createElement('div');
      el.className = 'circle';
      // label
      const label = document.createElement('div');
      label.className = 'player-label' + (p.nickname===self?' self':'');
      label.textContent = p.nickname;
      el.append(label);
      // style circle
      el.style.position = 'absolute';
      // compute start coords
      const qRect = document.getElementById('question').getBoundingClientRect();
      const rawStartY = qRect.top - el.offsetHeight - 1;
      const rawStartX = qRect.left + Math.random()*(qRect.width - el.offsetWidth);
      el._startX = rawStartX;
      el._startY = rawStartY;
      el._level = p.level;
      el.style.left = Math.round(rawStartX) + 'px';
      el.style.top = Math.round(rawStartY) + 'px';
      el.style.background = p.color;
      circles[p.nickname] = el;
      document.getElementById('playersContainer').append(el);
    } else {
      el._level = p.level;
    }
    animateCircle(el);
  });
});

});

// GameOver
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