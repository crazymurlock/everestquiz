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

const circles={}, maxLevel=5;

// статус игры
socket.on('gameStatus',data=>{
  if(!data.open) location='/closed.html';
});

// join
joinBtn.onclick = () => {
  const nick = nickIn.value.trim(); if(!nick) return;
  self = nick; socket.emit('join',nick);
  joinDiv.classList.remove('visible');
  lobbyDiv.classList.add('visible');
};

// лобби
socket.on('lobby',list=>{
  lobbyPl.innerHTML='';
  list.forEach(n=>{const d=document.createElement('div');d.textContent=n; lobbyPl.append(d);});
});

// countdown
socket.on('countdown',n=>{
  if(n>0){
    cntNum.textContent=n; cntOv.classList.add('show');
  } else {
    cntOv.classList.remove('show');
    lobbyDiv.classList.remove('visible');
    gameDiv.classList.add('visible');
    track.style.display = 'block';
    flag.style.display = 'block';
    cont.style.display = 'block';
    document.getElementById('question').style.display = 'block';
  }
});

// question
socket.on('question',q=>{
  qtext.textContent = q.question;
  optsDiv.innerHTML = '';
  q.options.forEach((o,i)=>{const b=document.createElement('button');b.className='option-btn';b.textContent=o; b.onclick=()=>socket.emit('answer',i); optsDiv.append(b);});
});

// answer result
socket.on('answerResult',res=>{
  Array.from(optsDiv.children).forEach((b,i)=>{
    if(i===res.correctIndex) b.classList.add('correct');
    else if(!res.correct)   b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(()=>optsDiv.innerHTML='',800);
});

// playerList circles
socket.on('playerList',list=>{
  if(!gameDiv.classList.contains('visible')) return;
  cont.innerHTML='';
  const rect = track.getBoundingClientRect(), height = rect.height;
  list.forEach(p=>{
    const el = document.createElement('div');
    el.className = 'circle' + (p.nickname===self?' self':'');
    el.textContent = p.nickname[0].toUpperCase();
    el.style.background = p.color;
    cont.append(el);
  });
  list.forEach(p=>{
    const el = cont.querySelector(`[textContent="${p.nickname[0].toUpperCase()}"]`);
    const step = height/(maxLevel-1);
    const y = rect.bottom - step*(p.level-1);
    el.style.top = y + 'px';
    el.style.left = (rect.left + rect.width/2 - el.offsetWidth/2) + 'px';
  });
});

// gameOver
socket.on('gameOver',data=>{
  gameDiv.classList.remove('visible');
  resultDiv.classList.add('visible');
  winnerH.textContent = `🏅 ${data.winner.nickname} — ${data.winner.correct} правильн. за ${Math.round(data.winner.time/1000)}с`;
  statsTb.innerHTML = '';
  data.stats.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;
    statsTb.append(tr);
  });
  confetti();
});