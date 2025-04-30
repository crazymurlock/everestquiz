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


// animateCircle: move from 2px above question box to top center of screen

function animateCircle(el) {
  const level = el._level;
  const qBox = document.getElementById('question').getBoundingClientRect();
  const startY = qBox.top - el.offsetHeight - 2;
  const endY = 0;
  const progress = (Math.min(level, maxLevel) - 1) / (maxLevel - 1);
  const newY = startY - (startY - endY) * progress;

  const centerX = window.innerWidth / 2 - el.offsetWidth / 2;
  el.style.transition = 'top 1s ease, left 1s ease';
  el.style.left = `${centerX}px`;
  el.style.top = `${Math.round(newY)}px`;
}


// redirect if closed
socket.on('gameStatus', data => {
  if (!data.open) location = '/closed.html';
});

// join button
joinBtn.onclick = () => {
  const nick = nickIn.value.trim();
  if (!nick) return;
  self = nick;
  socket.emit('join', nick);
  joinDiv.classList.remove('visible');
  lobbyDiv.classList.add('visible');
};

// lobby list
socket.on('lobby', list => {
  lobbyPl.innerHTML = '';
  list.forEach(n => {
    const d = document.createElement('div');
    d.textContent = n;
    lobbyPl.append(d);
  });
});

// countdown
socket.on('countdown', n => {
  if (n>0) {
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

// question display
socket.on('question', q => {
  qtext.textContent = q.question;
  optsDiv.innerHTML = '';
  q.options.forEach((opt,i)=>{
    const btn = document.createElement('button');
    btn.className='option-btn';
    btn.textContent=opt;
    btn.onclick = () => socket.emit('answer', i);
    optsDiv.append(btn);
  });
});

// answer result
socket.on('answerResult', res => {
  Array.from(optsDiv.children).forEach((b,i)=>{
    if (i===res.correctIndex) b.classList.add('correct');
    else if (!res.correct) b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(()=>optsDiv.innerHTML='',800);
});

// playerList => circles
socket.on('playerList', list => {
  const container = document.getElementById('playersContainer');
  const qRect = document.getElementById('question').getBoundingClientRect();
  const startY = qRect.top - 40;
  const endY = 0;
  const beamEndX = window.innerWidth / 2;

  list.forEach(p => {
    let el = circles[p.nickname];
    if (!el) {
      el = document.createElement('div');
      el.className = 'circle' + (p.nickname === self ? ' self' : '');
      el.style.position = 'absolute';
      el.style.background = p.color;

      const label = document.createElement('div');
      label.className = 'circle-label' + (p.nickname === self ? ' self' : '');
      label.textContent = p.nickname.substring(0, 10);
      el.append(label);

      const letter = document.createElement('div');
      letter.className = 'circle-letter';
      letter.textContent = p.nickname.charAt(0).toUpperCase();
      el.append(letter);

      const beamStartX = 50 + Math.random() * (window.innerWidth - 100);
      el._beamStartY = startY;
      el._beamEndY = endY;
      el._beamEndX = beamEndX;
      el.style.left = `${beamStartX}px`;
      el.style.top = `${startY}px`;

      circles[p.nickname] = el;
      container.append(el);
    }

    el._level = p.level;

    const level = el._level;
    const total = maxLevel - 1;
    const progress = Math.min(level - 1, total) / total;
    const targetX = el._beamEndX;
    const targetY = el._beamStartY + (el._beamEndY - el._beamStartY) * progress;
    const duration = (level === maxLevel ? 2 : 1) + 's';
    el.style.transition = `top ${duration} ease, left ${duration} ease`;
    el.style.left = `${targetX}px`;
    el.style.top = `${targetY}px`;
  });
});
});

// gameOver
socket.on('gameOver', data => {
  setTimeout(()=>{
    gameDiv.classList.remove('visible');
    resultDiv.classList.add('visible');
    winnerText.textContent=`🏅 ${data.winner.nickname} — ${data.winner.correct} правильн. за ${Math.round(data.winner.time/1000)}с`;
    resStats.innerHTML='';
    data.stats.forEach(p=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;
      resStats.append(tr);
    });
    confetti();
  },3000);
});
