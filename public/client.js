const socket=io();
let self='';
const joinDiv=document.getElementById('join'),
      lobbyDiv=document.getElementById('lobby'),
      playersList=document.getElementById('playersList'),
      gameDiv=document.getElementById('gameScreen'),
      resultDiv=document.getElementById('result'),
      countdown=document.getElementById('countdownOverlay'),
      cntNum=document.getElementById('countdownNum'),
      joinBtn=document.getElementById('joinBtn'),
      playersContainer=document.getElementById('playersContainer'),
      questionContainer=document.getElementById('questionContainer'),
      loseOverlay=document.getElementById('loseOverlay'),
      qTemplate=document.getElementById('question-template'),
      circleTemplate=document.getElementById('circle-template');
const circles={}, maxLevel=5;

// Game status: close redirect
socket.on('gameStatus',data=>{
  if(data.open) joinDiv.style.display='flex';
  else location='/closed.html';
});

// Join
joinBtn.onclick=()=>{const n=document.getElementById('nick').value.trim();if(!n)return;self=n;socket.emit('join',n);};

// Lobby
socket.on('lobby',list=>{
  joinDiv.style.display='none'; lobbyDiv.style.display='flex'; playersList.innerHTML='';
  list.forEach(n=>{const d=document.createElement('div');d.textContent=n===self?`* ${n}`:n;playersList.append(d);});
});

// Countdown
socket.on('countdown',n=>{
  if(n>0){cntNum.textContent=n;countdown.classList.add('show');}
  else{countdown.classList.remove('show'); lobbyDiv.style.display='none'; gameDiv.style.display='flex';
       // check if question missing
       setTimeout(()=>{ if(questionContainer.innerHTML==='') loseOverlay.classList.add('show'); },2000);
  }
});

// Player circles
socket.on('playerList',list=>{
  // remove disconnected
  Object.keys(circles).forEach(k=>{ if(!list.find(p=>p.nickname===k)){ playersContainer.removeChild(circles[k].el); delete circles[k]; } });
  const cw=playersContainer.clientWidth, ch=playersContainer.clientHeight;
  const qh = questionContainer.offsetHeight;
  const avail = ch - qh;
  const offsetBase = qh + 2; // 2px above question
  list.forEach((p,i)=>{
    let ent = circles[p.nickname];
    if(!ent){
      const c = circleTemplate.content.cloneNode(true);
      const el = c.querySelector('.circle');
      const inner = c.querySelector('.circle-inner');
      inner.textContent = p.nickname.charAt(0).toUpperCase();
      inner.style.background = p.color;
      playersContainer.append(el);
      ent = {el, inner};
      circles[p.nickname] = ent;
    }
    ent.el.classList.toggle('self', p.nickname===self);
    const group = list.filter(x=>x.level===p.level);
    const idx = group.findIndex(x=>x.nickname===p.nickname);
    const leftFrac = (idx+1)/(group.length+1);
    const x = cw*leftFrac - ent.el.offsetWidth/2;
    // y-position based on level
    let y;
    if(p.level<=1) y = offsetBase;
    else y = offsetBase + avail*((p.level-1)/(maxLevel-1));
    ent.el.style.transform = `translate3d(${x}px, -${y}px, 0)`;
  });
});

// Show question
socket.on('question',q=>{
  loseOverlay.classList.remove('show');
  questionContainer.innerHTML='';
  const clone = qTemplate.content.cloneNode(true);
  clone.querySelector('.question-text').textContent = q.question;
  const opts = clone.querySelector('.options');
  q.options.forEach((opt,i)=>{
    const btn = document.createElement('button');
    btn.className='option-btn'; btn.textContent=opt; btn.onclick=()=>socket.emit('answer',i);
    opts.append(btn);
  });
  questionContainer.append(clone);
  questionContainer.classList.remove('hidden');
  questionContainer.classList.add('visible');
});

// Answer result
socket.on('answerResult',res=>{
  const btns = questionContainer.querySelectorAll('button');
  btns.forEach((b,i)=>{
    if(i===res.correctIndex) b.classList.add('correct');
    else if(!res.correct) b.classList.add('wrong');
    b.disabled=true;
  });
  setTimeout(()=>{
    questionContainer.classList.remove('visible');
    questionContainer.classList.add('hidden');
  },800);
});

// Game over
socket.on('gameOver',d=>{
  confetti({particleCount:200,spread:120});
  gameDiv.style.display='none'; resultDiv.style.display='flex';
  document.getElementById('winnerText').textContent = `🏅 ${d.winner.nickname} — правильных:${d.winner.correct}, время:${Math.round(d.winner.time/1000)}с`;
  const tb = document.getElementById('stats'); tb.innerHTML='';
  d.stats.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;
    tb.append(tr);
  });
});
