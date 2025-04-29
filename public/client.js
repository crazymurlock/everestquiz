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
      cont     = document.getElementById('playersContainer'),
      joinBtn  = document.getElementById('joinBtn'),
      nickIn   = document.getElementById('nick'),
      qtext    = document.getElementById('qtext'),
      optsDiv  = document.getElementById('opts'),
      winnerH  = document.getElementById('winnerText'),
      statsTb  = document.getElementById('resStats');
const circles = {}, maxLevel=5;

// Redirect if closed
socket.on('gameStatus',data=>{
  if(!data.open) location='/closed.html';
});

// Join
joinBtn.onclick = ()=>{
  const n = nickIn.value.trim();
  if(!n) return;
  self = n; socket.emit('join', n);
  joinDiv.classList.remove('visible');
  lobbyDiv.classList.add('visible');
};

// Lobby list
socket.on('lobby', list=>{
  lobbyPl.innerHTML='';
  list.forEach(n=>{const d=document.createElement('div'); d.textContent=n; lobbyPl.append(d);});
});

// Countdown
socket.on('countdown', n=>{
  if(n>0){ cntNum.textContent=n; cntOv.classList.add('show'); }
  else {
    cntOv.classList.remove('show');
    lobbyDiv.classList.remove('visible');
    gameDiv.classList.add('visible');
    track.style.display = 'block';
    flag.style.display  = 'block';
    cont.style.display  = 'block';
    document.getElementById('question').style.display='block';
  }
});

// Question
socket.on('question', q=>{
  qtext.textContent = q.question;
  optsDiv.innerHTML='';
  q.options.forEach((o,i)=>{const b=document.createElement('button');b.className='option-btn';b.textContent=o; b.onclick=()=>socket.emit('answer',i); optsDiv.append(b);});
});

// Answer result
socket.on('answerResult', res=>{
  Array.from(optsDiv.children).forEach((b,i)=>{
    if(i===res.correctIndex) b.classList.add('correct');
    else if(!res.correct)    b.classList.add('wrong');
    b.disabled=true;
  });
  setTimeout(()=>optsDiv.innerHTML='',800);
});

// PlayerList => circles after game start

// Updated circle positioning: fixed vertical slots for levels 1-5
socket.on('playerList', list => {
  if (!gameDiv.classList.contains('visible')) return;
  // Clear container
  playersContainer.innerHTML = '';
  // Get track bounds
  const trackRect = track.getBoundingClientRect();
  // Define Y slots (in px) for levels 1-5
  const slots = [];
  for (let i = 1; i <= maxLevel; i++) {
    // level 1 at bottom near question; level max at top near flag
    const ratio = (i - 1) / (maxLevel - 1);
    slots[i] = trackRect.bottom - ratio * trackRect.height - 12; // subtract half circle height
  }
  // Group players by level
  const groups = {};
  list.forEach(p => {
    if (!groups[p.level]) groups[p.level] = [];
    groups[p.level].push(p);
  });
  // Render circles per level
  Object.keys(groups).forEach(levelKey => {
    const lvl = parseInt(levelKey);
    const playersAtLevel = groups[lvl];
    const yPos = slots[lvl];
    // Distribute horizontally
    const total = playersAtLevel.length;
    playersAtLevel.forEach((p, idx) => {
      const el = document.createElement('div');
      el.className = 'circle' + (p.nickname === self ? ' self' : '');
      el.textContent = p.nickname.charAt(0).toUpperCase();
      el.style.background = p.color;
      // Calculate x position: evenly spaced across track width * 3 (wide zone)
      const startX = trackRect.left - trackRect.width; // allow spread
      const endX = trackRect.right + trackRect.width;
      const x = startX + (idx + 1) / (total + 1) * (endX - startX);
      el.style.top = yPos + 'px';
      el.style.left = x + 'px';
      playersContainer.append(el);
    });
  });
});

// Game over
socket.on('gameOver', data=>{
  gameDiv.classList.remove('visible');
  resultDiv.classList.add('visible');
  winnerH.textContent = `🏅 ${data.winner.nickname} — ${data.winner.correct} правильн. за ${Math.round(data.winner.time/1000)}с`;
  statsTb.innerHTML='';
  data.stats.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;
    statsTb.append(tr);
  });
  confetti();
});
