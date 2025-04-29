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
      template=document.getElementById('question-template');
const circles={},maxLevel=5;

// When game closes, redirect to closed.html
socket.on('gameStatus',data=>{
  if(data.open) joinDiv.style.display='flex';
  else location='/closed.html';
});

// Join action
joinBtn.onclick=()=>{const n=document.getElementById('nick').value.trim();if(!n)return;self=n;socket.emit('join',n);};

// Lobby
socket.on('lobby',list=>{
  joinDiv.style.display='none';
  lobbyDiv.style.display='flex';
  playersList.innerHTML='';
  list.forEach(n=>{const d=document.createElement('div');d.textContent=n===self?`* ${n}`:n;playersList.append(d);});
});

// Countdown
socket.on('countdown',n=>{
  if(n>0){cntNum.textContent=n;countdown.classList.add('show');}
  else{countdown.classList.remove('show');lobbyDiv.style.display='none';gameDiv.style.display='flex';}
});

// Players positions
socket.on('playerList',list=>{
  playersContainer.style.bottom = '1px'; // initial offset
  const cw=playersContainer.clientWidth,ch=playersContainer.clientHeight;
  const levelMap={};
  list.forEach(p=>{levelMap[p.level]=levelMap[p.level]||[];levelMap[p.level].push(p);});
  Object.values(levelMap).forEach(group=>group.forEach((p,i)=>{
    let ent=circles[p.nickname];
    if(!ent){
      const el=document.createElement('div');el.className='player';
      const c=document.createElement('div');c.className='circle';c.textContent=p.nickname.charAt(0);c.style.background=p.color;
      const n=document.createElement('div');n.className='nick';n.textContent=p.nickname;
      el.append(c,n);playersContainer.append(el);ent={el};circles[p.nickname]=ent;
    }
    ent.el.classList.toggle('self',p.nickname===self);
    const left=(i+1)/(group.length+1);const x=cw*left-14;
    // Compute dynamic bottom based on questionContainer height
    const qh = questionContainer.offsetHeight;
    const maxY = ch - qh; // available vertical space
    const y = maxY*(p.level/maxLevel);
    ent.el.style.transform=`translate3d(${x}px,-${y}px,0)`;
  }));
});

// Show question using template and position
socket.on('question',q=>{
  questionContainer.innerHTML='';
  const clone=document.importNode(template.content,true);
  clone.querySelector('.question-text').textContent=q.question;
  const optsDiv=clone.querySelector('.options');
  q.options.forEach((opt,i)=>{
    const btn=document.createElement('button');btn.className='option-btn';btn.textContent=opt;
    btn.onclick=()=>socket.emit('answer',i);optsDiv.append(btn);
  });
  questionContainer.append(clone);
  questionContainer.style.display='block';
});

// Answer result: highlight then hide question
socket.on('answerResult',res=>{
  const btns=questionContainer.querySelectorAll('button');
  btns.forEach((b,i)=>{if(i===res.correctIndex)b.classList.add('correct');else if(!res.correct)b.classList.add('wrong');b.disabled=true;});
  setTimeout(()=>{
    questionContainer.style.display='none';
  },1000);
});

// Game over
socket.on('gameOver',d=>{
  confetti({particleCount:200,spread:120});
  gameDiv.style.display='none';resultDiv.style.display='flex';
  document.getElementById('winnerText').textContent=`🏅 ${d.winner.nickname} — правильных:${d.winner.correct}, время:${Math.round(d.winner.time/1000)}с`;
  const tb=document.getElementById('stats');tb.innerHTML='';
  d.stats.forEach(p=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;tb.append(tr);});
});