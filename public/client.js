const socket=io();
let selfNick='';
const joinDiv=document.getElementById('join'),
      lobbyDiv=document.getElementById('lobby'),
      gameDiv=document.getElementById('game'),
      resultDiv=document.getElementById('result'),
      lobbyPlayers=document.getElementById('lobbyPlayers'),
      playersContainer=document.getElementById('playersContainer'),
      track=document.getElementById('track'),
      qtext=document.getElementById('qtext'),
      optsDiv=document.getElementById('opts'),
      winnerText=document.getElementById('winnerText'),
      resultStats=document.getElementById('resultStats'),
      nicknameInput=document.getElementById('nick'),
      joinBtn=document.getElementById('joinBtn');
const circles={}, maxLevel=5;

// handle open/closed status
socket.on('gameStatus',data=>{
  if(data.open) {
    if(joinDiv.classList.contains('visible')) {}
  } else location='/closed.html';
});

// join
joinBtn.onclick=()=>{
  const nick=nicknameInput.value.trim();
  if(!nick) return;
  selfNick=nick;
  socket.emit('join',nick);
  joinDiv.classList.remove('visible');
  lobbyDiv.classList.add('visible');
};

// show lobby players
socket.on('lobby',list=>{
  lobbyPlayers.innerHTML='';
  list.forEach(n=>{const d=document.createElement('div');d.textContent=n; lobbyPlayers.append(d);});
});

// countdown -> start game
socket.on('countdown',num=>{
  if(num===0){
    lobbyDiv.classList.remove('visible');
    gameDiv.classList.add('visible');
  }
});

// send answer
function bindOptionButtons(){
  const btns=optsDiv.querySelectorAll('button');
  btns.forEach((b,i)=>b.onclick=()=>socket.emit('answer',i));
}

// show question
socket.on('question',q=>{
  qtext.textContent=q.question;
  optsDiv.innerHTML='';
  q.options.forEach(opt=>{
    const b=document.createElement('button');
    b.textContent=opt; b.className='option-btn';
    optsDiv.append(b);
  });
  bindOptionButtons();
});

// show answer result
socket.on('answerResult',res=>{
  const btns=optsDiv.querySelectorAll('button');
  btns.forEach((b,i)=>{
    if(i===res.correctIndex) b.classList.add('correct');
    else if(!res.correct) b.classList.add('wrong');
    b.disabled=true;
  });
  setTimeout(()=>optsDiv.innerHTML='',800);
});

// update player positions
socket.on('playerList',list=>{
  // clear circles
  Object.values(circles).forEach(circ=>playersContainer.removeChild(circ));
  Object.keys(circles).forEach(k=>delete circles[k]);
  const rect=track.getBoundingClientRect();
  list.forEach(p=>{
    const el=document.createElement('div');
    el.className='circle'; if(p.nickname===selfNick) el.classList.add('self');
    el.textContent=p.nickname.charAt(0).toUpperCase();
    el.style.background=p.color;
    playersContainer.append(el);
    circles[p.nickname]=el;
  });
  list.forEach(p=>{
    const el=circles[p.nickname];
    const rect=track.getBoundingClientRect();
    const topOffset = rect.top;
    const height = rect.height;
    const y = topOffset + height*(1 - (p.level-1)/(maxLevel-1));
    el.style.top = y + 'px';
    el.style.left = (window.innerWidth/2 - 12) + 'px'; // centered
  });
});

// game over
socket.on('gameOver',data=>{
  gameDiv.classList.remove('visible');
  resultDiv.classList.add('visible');
  winnerText.textContent=`🏅 ${data.winner.nickname}`;
  resultStats.innerHTML='';
  data.stats.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.nickname}</td><td>${p.correct}</td>`;
    resultStats.append(tr);
  });
  confetti();
});