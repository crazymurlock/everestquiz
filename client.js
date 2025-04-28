const socket=io();
let selfNick='';

// Elements
const joinDiv=document.getElementById('join');
const lobbyDiv=document.getElementById('lobby');
const gameDiv=document.getElementById('game');
const countdownDiv=document.getElementById('countdown');
const resultDiv=document.getElementById('result');
const playersUl=document.getElementById('players');
const statsUl=document.getElementById('stats');
const nickInput=document.getElementById('nick');

// Join
document.getElementById('joinBtn').onclick=()=>{
  const nick=nickInput.value.trim();
  if(!nick) return;
  selfNick=nick;
  socket.emit('join',nick);
  joinDiv.style.display='none';
  lobbyDiv.style.display='block';
};

// Lobby update
socket.on('lobby', list=>{
  playersUl.innerHTML='';
  // self first
  const selfIdx=list.indexOf(selfNick);
  if(selfIdx>-1) {
    const li=document.createElement('li');li.textContent=selfNick;li.classList.add('self');
    playersUl.append(li);
  }
  list.forEach(nick=>{
    if(nick!==selfNick) {
      const li=document.createElement('li');li.textContent=nick;
      playersUl.append(li);
    }
  });
});

// Game status
socket.on('gameStatus',({open})=>{
  if(!open) location='/closed.html';
});

// Countdown
socket.on('countdown',n=>{
  if(n>0){
    countdownDiv.style.display='block';
    document.getElementById('count').innerText=n;
  } else {
    countdownDiv.style.display='none';
    lobbyDiv.style.display='none';
    gameDiv.style.display='block';
  }
});

// Question
socket.on('question',({question,options})=>{
  document.getElementById('qtext').innerText=question;
  const optsDiv=document.getElementById('opts');
  optsDiv.innerHTML='';
  options.forEach((opt,i)=>{
    const btn=document.createElement('button');
    btn.classList.add('option-btn');
    btn.innerText=opt;
    btn.onclick=()=>socket.emit('answer',i);
    optsDiv.append(btn);
  });
});

// Answer result
socket.on('answerResult',({correct,correctIndex})=>{
  const buttons=document.querySelectorAll('.option-btn');
  buttons.forEach((b,i)=>{
    if(i===correctIndex) b.classList.add('correct');
    else if(!correct) b.classList.add('wrong');
    b.disabled=true;
  });
});

// Game over
socket.on('gameOver',data=>{
  const {winner, stats} = data;
  document.getElementById('winnerText').innerText=`Победитель: ${winner.nickname}, правильных: ${winner.correct}, время: ${Math.round(winner.time/1000)}с`;
  statsUl.innerHTML='';
  stats.forEach(p=>{
    const li=document.createElement('li');
    li.textContent=`${p.nickname}: правильных ${p.correct}, время ${Math.round(p.time/1000)}с`;
    statsUl.append(li);
  });
  gameDiv.style.display='none';
  countdownDiv.style.display='none';
  resultDiv.style.display='block';
});