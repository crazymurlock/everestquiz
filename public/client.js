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
function animateCircle(el, level) {
  const qRect = document.getElementById('question').getBoundingClientRect();
  const flagRect = document.getElementById('flag').getBoundingClientRect();
  const startY = qRect.top - el.offsetHeight - 1;
  const endY = flagRect.top + flagRect.height/2 - el.offsetHeight/2;
  const step = (startY - endY) / (maxLevel - 1);
  // start level at 2 baseline
  const slot = Math.min(level + 1, maxLevel);
  const targetY = startY - step * (slot - 1);
  const duration = slot === maxLevel ? 2 : 1;
  el.style.transition = 'top ' + duration + 's ease';
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
  const qRect = document.getElementById('question').getBoundingClientRect();
  const flagRect = document.getElementById('flag').getBoundingClientRect();
  const startY = qRect.top - 12 - 1;
  const endY = flagRect.top + flagRect.height/2 - 12;
  const step = (startY - endY) / (maxLevel - 1);
  list.forEach(p => {
    let el = circles[p.nickname];
    if (!el) {
      el = document.createElement('div');
      el.className = 'circle' + (p.nickname === self ? ' self' : '');
      el.textContent = p.nickname.charAt(0).toUpperCase();
      el.style.background = p.color;
      el.style.position = 'absolute';
      // initial position at slot2
      const initY = startY - step * 1;
      el.style.top = Math.round(initY) + 'px';
      const trackRect = track.getBoundingClientRect();
      el.style.left = (trackRect.left + trackRect.width/2 - el.offsetWidth/2) + 'px';
      playersContainer.append(el);
      circles[p.nickname] = el;
    }
    animateCircle(el, p.level);
  });
});// animate to level positions
  list.forEach(p => {
    const el = circles[p.nickname];
    animateCircle(el, p.level);
  });
});

// game over handler
socket.on('gameOver', data => {
  // wait for final animation (2s) + 1s pause
  setTimeout(() => {
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
  }, 3000);
});
  confetti();
});
