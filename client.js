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


// animateCircle: move from 2px above question box to top center of screen





// redirect if closed
socket.on('gameStatus', data => {
  if (!data.open) location = '/closed.html';
});

// join button
joinBtn.onclick = () => {
  const nick = nickIn.value.trim();
  if (!nick) return;
  self = nick;
  socket.emit('join', nick);
  joinDiv.classList.remove('visible');
  lobbyDiv.classList.add('visible');
};

// lobby list
socket.on('lobby', list => {
  lobbyPl.innerHTML = '';
  list.forEach(n => {
    const d = document.createElement('div');
    d.textContent = n;
    lobbyPl.append(d);
  });
});

// countdown
socket.on('countdown', n => {
  if (n>0) {
    cntNum.textContent = n;
    cntOv.classList.add('show');
  } else {
    cntOv.classList.remove('show');
    lobbyDiv.classList.remove('visible');
    gameDiv.classList.add('visible');
    track.style.display = 'block';
    flag.style.display  = 'block';
    playersContainer.style.display = 'block';
    questionDiv.style.display = 'block';
  }
});

// question display
socket.on('question', q => {
  qtext.textContent = q.question;
  optsDiv.innerHTML = '';
  q.options.forEach((opt,i)=>{
    const btn = document.createElement('button');
    btn.className='option-btn';
    btn.textContent=opt;
    btn.onclick = () => socket.emit('answer', i);
    optsDiv.append(btn);
  });
});

// answer result
socket.on('answerResult', res => {
  Array.from(optsDiv.children).forEach((b,i)=>{
    if (i===res.correctIndex) b.classList.add('correct');
    else if (!res.correct) b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(()=>optsDiv.innerHTML='',800);
});

// playerList => circles

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

function animateCircle(el) {
  const level = el._level;
  const total = maxLevel;
  const verticalGap = (window.innerHeight - 100) / total;
  const targetY = window.innerHeight - 100 - verticalGap * level;

  const spread = 100 + (window.innerWidth - 200) * 0.6;
  const offsetX = (el._id % 20) * (spread / 20) + 100;

  const duration = '1s';
  el.style.transition = `top ${duration} ease, left ${duration} ease`;
  el.style.left = `${offsetX}px`;
  el.style.top = `${Math.round(targetY)}px`;
}

socket.on('playerList', list => {
  const container = document.getElementById('playersContainer');
  const baseY = window.innerHeight - 100;

  list.forEach((p, index) => {
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

      el._id = index;
      el.style.left = `${100 + (index % 20) * 30}px`;
      el.style.top = `${baseY}px`;

      circles[p.nickname] = el;
      container.append(el);
    }

    el._level = p.level;
    animateCircle(el);
  });
});