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
      joinBtn  = document.getElementById('joinBtn'),
      nickIn   = document.getElementById('nick'),
      qtext    = document.getElementById('qtext'),
      optsDiv  = document.getElementById('opts'),
      winnerH  = document.getElementById('winnerText'),
      statsTb  = document.getElementById('resStats');

const circles = {}, maxLevel = 5;

// animateCircle function
// animateCircle: smoothly move circle from question to flag based on level
function animateCircle(el, level) {
  const qRect = document.getElementById('question').getBoundingClientRect();
  const flagRect = document.getElementById('flag').getBoundingClientRect();
  const rawStartY = qRect.top - el.offsetHeight - 1;
  const rawEndY = flagRect.top + flagRect.height / 2 - el.offsetHeight / 2;
  // full step between rawStart and rawEnd
  const fullStep = (rawEndY - rawStartY) / (maxLevel - 1);
  // base = start position for level1 = rawStart + fullStep
  const baseY = rawStartY + fullStep;
  // step per level from base to rawEnd
  const step = (rawEndY - baseY) / (maxLevel - 1);
  // compute target Y
  const targetY = baseY + step * (level - 1);
  // duration: 1s normal, 2s if final
  const duration = (level === maxLevel ? 2 : 1) + 's';
  el.style.transition = 'top ' + duration + ' ease';
  el.style.top = Math.round(targetY) + 'px';
}


// gameStatus listener
socket.on('gameStatus', data => {
  if (!data.open) {
    location = '/closed.html';
  }
});

// join button handler
joinBtn.onclick = () => {
  const nick = nickIn.value.trim();
  if (!nick) return;
  self = nick;
  socket.emit('join', nick);
  joinDiv.classList.remove('visible');
  lobbyDiv.classList.add('visible');
};

// lobby list update
socket.on('lobby', list => {
  lobbyPl.innerHTML = '';
  list.forEach(nick => {
    const d = document.createElement('div');
    d.textContent = nick;
    lobbyPl.append(d);
  });
});

// countdown handler
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
    document.getElementById('question').style.display = 'block';
  }
});

// show question
socket.on('question', q => {
  qtext.textContent = q.question;
  optsDiv.innerHTML = '';
  q.options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'option-btn';
    b.textContent = opt;
    b.onclick = () => socket.emit('answer', i);
    optsDiv.append(b);
  });
});

// answer result
socket.on('answerResult', res => {
  Array.from(optsDiv.children).forEach((b, i) => {
    if (i === res.correctIndex) b.classList.add('correct');
    else if (!res.correct) b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(() => optsDiv.innerHTML = '', 800);
});

// playerList handler with animateCircle
socket.on('playerList', list => {
  if (!gameDiv.classList.contains('visible')) return;
  list.forEach(p => {
    let el = circles[p.nickname];
    if (!el) {
      el = document.createElement('div');
      el.className = 'circle' + (p.nickname === self ? ' self' : '');
      el.textContent = p.nickname.charAt(0).toUpperCase();
      el.style.background = p.color;
      el.style.position = 'absolute';
      // initial position = baseY for level1
      const qRect = document.getElementById('question').getBoundingClientRect();
      const flagRect = document.getElementById('flag').getBoundingClientRect();
      const rawStartY = qRect.top - el.offsetHeight - 1;
      const rawEndY = flagRect.top + flagRect.height / 2 - el.offsetHeight / 2;
      const fullStep = (rawEndY - rawStartY) / (maxLevel - 1);
      const baseY = rawStartY + fullStep;
      el.style.top = Math.round(baseY) + 'px';
      const trackRect = track.getBoundingClientRect();
      el.style.left = (trackRect.left + trackRect.width/2 - el.offsetWidth/2) + 'px';
      playersContainer.append(el);
      circles[p.nickname] = el;
    }
    // animate to new Y
    animateCircle(el, p.level);
  });
});
    const el = document.createElement('div');
    el.className = 'circle' + (p.nickname === self ? ' self' : '');
    el.textContent = p.nickname.charAt(0).toUpperCase();
    el.style.background = p.color;
    el.style.position = 'absolute';
    // initial top at startY for smooth transition
    const tempRect = document.getElementById('question').getBoundingClientRect();
    el.style.top = (tempRect.top - el.offsetHeight - 1) + 'px';
    // horizontal align under track
    const trackRect = track.getBoundingClientRect();
    el.style.left = (trackRect.left + trackRect.width/2 - el.offsetWidth/2) + 'px';
    playersContainer.append(el);
    circles[p.nickname] = el;
  });
  // animate to level positions
  list.forEach(p => {
    const el = circles[p.nickname];
    animateCircle(el, p.level);
  });
});

// game over handler
socket.on('gameOver', data => {
  gameDiv.classList.remove('visible');
  resultDiv.classList.add('visible');
  winnerH.textContent = `🏅 ${data.winner.nickname} — ${data.winner.correct} правильн. за ${Math.round(data.winner.time/1000)}с`;
  statsTb.innerHTML = '';
  data.stats.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;
    statsTb.append(tr);
  });
  confetti();
});
