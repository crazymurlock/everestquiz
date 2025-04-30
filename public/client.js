
const joinBtn  = document.getElementById('joinBtn'),
      nickIn   = document.getElementById('nick');

joinBtn.onclick = () => {
  const nick = nickIn.value.trim();
  if (!nick) return;
  self = nick;
  socket.emit('join', nick);
  joinDiv.classList.remove('visible');
  lobbyDiv.classList.add('visible');
};

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


// animateCircle: move from beam origin to top center
function animateCircle(el) {
  const level = el._level;
  const total = maxLevel - 1;
  const progress = Math.min(level - 1, total) / total;
  const targetX = el._beamEndX;
  const targetY = el._beamStartY + (el._beamEndY - el._beamStartY) * progress;
  const duration = (level === maxLevel ? 2 : 1) + 's';
  el.style.transition = `top ${duration} ease, left ${duration} ease`;
  el.style.left = `${targetX}px`;
  el.style.top = `${targetY}px`;
}

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
    animateCircle(el);
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

