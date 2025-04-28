const socket = io();
let self = '';
const joinDiv = document.getElementById('join'),
      lobbyDiv = document.getElementById('lobby'),
      gameDiv = document.getElementById('game'),
      resultDiv = document.getElementById('result'),
      playersContainer = document.getElementById('playersContainer'),
      playersTb = document.getElementById('players'),
      statsTb = document.getElementById('stats'),
      countdownOverlay = document.getElementById('countdownOverlay'),
      countdownNum = document.getElementById('countdownNum'),
      questionModal = document.getElementById('questionModal'),
      qtext = document.getElementById('qtext'),
      optsDiv = document.getElementById('opts'),
      winnerText = document.getElementById('winnerText');

document.getElementById('joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  self = nick; socket.emit('join', nick);
  joinDiv.style.display = 'none'; lobbyDiv.style.display = 'block';
};

socket.on('lobby', list => {
  playersTb.innerHTML = '';
  list.filter(n => n===self).forEach(n => playersTb.innerHTML += `<tr><td><strong>${n}</strong></td></tr>`);
  list.filter(n => n!==self).forEach(n => playersTb.innerHTML += `<tr><td>${n}</td></tr>`);
});

socket.on('playerList', list => {
  playersContainer.innerHTML = '';
  const width = playersContainer.clientWidth;
  list.forEach(p => {
    const el = document.createElement('div');
    el.className = 'player';
    const circle = document.createElement('div');
    circle.className = 'circle';
    circle.innerText = p.nickname.charAt(0).toUpperCase();
    circle.style.background = `hsl(${Math.random()*360},60%,50%)`;
    const nick = document.createElement('div');
    nick.className = 'nick';
    nick.innerText = p.nickname;
    el.append(circle, nick); playersContainer.append(el);
    const same = list.filter(x => x.level === p.level);
    const idx = same.findIndex(x => x.nickname === p.nickname);
    el.style.left = `${(idx+1)/(same.length+1)*100}%`;
    el.style.bottom = `${150+(p.level-1)*60}px`;
  });
});

socket.on('countdown', n => {
  if(n>0){ countdownNum.innerText = n; countdownOverlay.classList.add('show'); }
  else{ countdownOverlay.classList.remove('show'); lobbyDiv.style.display='none'; gameDiv.style.display='block'; }
});

socket.on('question', ({question,options}) => {
  qtext.innerText = question; optsDiv.innerHTML='';
  options.forEach((o,i)=>{ const btn = document.createElement('button'); btn.className='option-btn'; btn.innerText=o; btn.onclick=()=>socket.emit('answer',i); optsDiv.append(btn); });
  questionModal.classList.add('show');
});

socket.on('answerResult', ({correct,correctIndex}) => {
  const btns = optsDiv.querySelectorAll('button');
  btns.forEach((b,i)=>{ if(i===correctIndex) b.classList.add('correct'); else if(!correct) b.classList.add('wrong'); b.disabled=true; });
  setTimeout(()=>questionModal.classList.remove('show'),600);
});

socket.on('gameOver', ({winner,stats}) => {
  gameDiv.style.display='none'; resultDiv.style.display='block';
  winnerText.innerText = `🏅 ${winner.nickname} — правильных: ${winner.correct}, время: ${Math.round(winner.time/1000)}с`;
  statsTb.innerHTML=''; stats.forEach(p=>statsTb.innerHTML+=`<tr><td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td></tr>`);
});