const socket=io();
let self='';
const joinDiv=document.getElementById('join'),
      lobbyDiv=document.getElementById('lobby'),
      gameDiv=document.getElementById('game'),
      resultDiv=document.getElementById('result'),
      countdown=document.getElementById('countdownOverlay'),
      cnt=document.getElementById('cnt'),
      lobbyPlayers=document.getElementById('lobbyPlayers'),
      playersContainer=document.getElementById('playersContainer'),
      track=document.getElementById('track'),
      joinBtn=document.getElementById('joinBtn'),
      nickInput=document.getElementById('nick'),
      qtext=document.getElementById('qtext'),
      opts=document.getElementById('opts'),
      winnerText=document.getElementById('winnerText'),
      resStats=document.getElementById('resStats');
const circles={}, maxLevel=5;

// gameStatus
socket.on('gameStatus',d=>{
  if(d.open){
    // if open, allow join
  } else location='/closed.html';
});

// join
joinBtn.onclick=()=>{
  const nick=nickInput.value.trim(); if(!nick) return;
  self=nick; socket.emit('join',nick);
  joinDiv.classList.remove('visible');
  lobbyDiv.classList.add('visible');
};

// lobby list
socket.on('lobby',list=>{
  lobbyPlayers.innerHTML='';
  list.forEach(n=>{const d=document.createElement('div');d.textContent=n; lobbyPlayers.append(d);});
});

// countdown
socket.on('countdown',n=>{
  if(n>0){cnt.textContent=n;countdown.classList.add('show');}
  else{countdown.classList.remove('show'); lobbyDiv.classList.remove('visible'); gameDiv.classList.add('visible');}
});

// questions
socket.on('question',q=>{
  qtext.textContent=q.question; opts.innerHTML='';
  q.options.forEach((o,i)=>{const b=document.createElement('button');b.className='option-btn';b.textContent=o; b.onclick=()=>socket.emit('answer',i);opts.append(b);});
});

// answerResult
socket.on('answerResult',res=>{
  Array.from(opts.children).forEach((b,i)=>{if(i===res.correctIndex) b.classList.add('correct'); else if(!res.correct) b.classList.add('wrong'); b.disabled=true;});
  setTimeout(()=>opts.innerHTML='',800);
});

// playerList for circles
socket.on('playerList',list=>{
  // clear old
  playersContainer.innerHTML='';
  const rect=track.getBoundingClientRect();
  const height = rect.height;
  list.forEach(p=>{
    const el=document.createElement('div');
    el.className='circle'; if(p.nickname===self) el.classList.add('self');
    el.textContent=p.nickname.charAt(0).toUpperCase();
    el.style.background=p.color;
    playersContainer.append(el);
  });
  // position
  list.forEach(p=>{
    const el = Array.from(playersContainer.children).find(e=>e.textContent===p.nickname.charAt(0).toUpperCase());
    const top0 = rect.bottom - el.offsetHeight/2;
    const step = height/(maxLevel-1);
    const y = rect.bottom - step*(p.level-1);
    el.style.top = y + 'px';
    el.style.left = (rect.left + rect.width/2 - el.offsetWidth/2) + 'px';
  });
});

// gameOver
socket.on('gameOver',d=>{
  gameDiv.classList.remove('visible');
  resultDiv.classList.add('visible');
  winnerText.textContent = `🏅 ${d.winner.nickname} — ${d.winner.correct} правильн. за ${Math.round(d.winner.time/1000)}с`;
  resStats.innerHTML='';
  d.stats.forEach(p=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;resStats.append(tr);});
  confetti();
});