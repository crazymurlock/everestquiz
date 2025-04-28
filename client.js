const socket=io();
let self='';
// Elements
const joinDiv=document.getElementById('join'),
  lobbyDiv=document.getElementById('lobby'),
  gameDiv=document.getElementById('game'),
  resultDiv=document.getElementById('result');
const playersTb=document.getElementById('players'),
  statsTb=document.getElementById('stats'),
  joinBtn=document.getElementById('joinBtn'),
  nickInp=document.getElementById('nick'),
  flagImg=document.getElementById('flag'),
  modal=document.getElementById('questionModal'),
  content=modal.querySelector('.modal-content'),
  qtext=document.getElementById('qtext'),
  optsDiv=document.getElementById('opts'),
  winnerEl=document.getElementById('winner');

joinBtn.onclick=()=>{
  const n=nickInp.value.trim(); if(!n) return;
  self=n; socket.emit('join',n);
  joinDiv.style.display='none';
  lobbyDiv.style.display='block';
};

socket.on('lobby',list=>{
  playersTb.innerHTML='';
  // self on top bold
  list.filter(n=>n===self).forEach(n=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${n}</strong></td>`;
    playersTb.append(tr);
  });
  list.filter(n=>n!==self).forEach(n=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${n}</td>`; playersTb.append(tr);
  });
});

socket.on('gameStatus',d=>{
  if(!d.open) window.location='/closed.html';
});

socket.on('countdown',n=>{
  if(n>0){
    lobbyDiv.style.display='block';
    joinDiv.style.display='none';
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>Начало через ${n}...</td>`;
    playersTb.append(tr);
  } else {
    lobbyDiv.style.display='none';
    gameDiv.style.display='block';
  }
});

socket.on('question',({question,options})=>{
  qtext.innerText=question;
  optsDiv.innerHTML='';
  options.forEach((o,i)=>{
    const b=document.createElement('button');
    b.className='option-btn';
    b.innerText=o;
    b.onclick=_=>socket.emit('answer',i);
    optsDiv.append(b);
  });
  modal.classList.add('show');
});

socket.on('answerResult',({correct,correctIndex})=>{
  const btns=optsDiv.querySelectorAll('button');
  btns.forEach((b,i)=>{
    if(i===correctIndex) b.classList.add('correct');
    else if(!correct) b.classList.add('wrong');
    b.disabled=true;
  });
  setTimeout(()=>modal.classList.remove('show'),1000);
});

socket.on('playerList',list=>{
  // no-op
});

socket.on('gameOver',({winner,stats})=>{
  gameDiv.style.display='none'; resultDiv.style.display='block';
  winnerEl.innerText=`🏅 ${winner.nick}  Правильных: ${winner.correct}, Время: ${Math.floor(winner.time/1000)}.${('00'+(winner.time%1000)).slice(-3)} сек`;
  stats.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.nick}</td><td>${p.correct}</td><td>${Math.floor(p.time/1000)}.${('00'+(p.time%1000)).slice(-3)}</td>`;
    statsTb.append(tr);
  });
});