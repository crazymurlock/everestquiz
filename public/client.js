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
      joinBtn  = document.getElementById('joinBtn'),
      nickIn   = document.getElementById('nick'),
      qtext    = document.getElementById('qtext'),
      optsDiv  = document.getElementById('opts'),
      winnerText = document.getElementById('winnerText'),
      resStats = document.getElementById('resStats');

const circles = {}, maxLevel = 5;

// animateCircle: плавный подъём от вопроса к флагу (база уровень 4)
function animateCircle(el, level) {
  const qRect = document.getElementById('question').getBoundingClientRect();
  const flagRect = document.getElementById('flag').getBoundingClientRect();
  const rawStartY = qRect.top - el.offsetHeight - 1;
  const rawEndY   = flagRect.top + flagRect.height/2 - el.offsetHeight/2;
  const fullStep  = (rawEndY - rawStartY) / (maxLevel - 1);
  // базовая точка на уровне 4 => rawStartY + fullStep*3
  const baseY     = rawStartY + fullStep * 3;
  const step      = (rawEndY - baseY) / (maxLevel - 1);
  const targetY   = baseY + step * (level - 1);
  const duration  = (level === maxLevel ? 2 : 1) + 's';
  el.style.transition = 'top ' + duration + ' ease';
  el.style.top = Math.round(targetY) + 'px';
}



// Отслеживаем статус игры
socket.on('gameStatus', data => {
  if (!data.open) location='/closed.html';
});

// Кнопка присоединения
joinBtn.onclick = () => {
  const nick = nickIn.value.trim();
  if (!nick) return;
  self = nick;
  socket.emit('join', nick);
  joinDiv.classList.remove('visible');
  lobbyDiv.classList.add('visible');
};

// Список в лобби
socket.on('lobby', list => {
  lobbyPl.innerHTML = '';
  list.forEach(n => {
    const d = document.createElement('div');
    d.textContent = n;
    lobbyPl.append(d);
  });
});

// Обратный отсчёт
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
    document.getElementById('question').style.display = 'block';
  }
});

// Отображение вопроса
socket.on('question', q => {
  qtext.textContent = q.question;
  optsDiv.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = () => socket.emit('answer', i);
    optsDiv.append(btn);
  });
});

// Результат ответа
socket.on('answerResult', res => {
  Array.from(optsDiv.children).forEach((b, i) => {
    if (i===res.correctIndex) b.classList.add('correct');
    else if (!res.correct)     b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(()=>optsDiv.innerHTML='',800);
});

// Обновление положения кружков
socket.on('playerList', list => {
  if (!gameDiv.classList.contains('visible')) return;
  list.forEach(p => {
    let el = circles[p.nickname];
    if (!el) {
      el = document.createElement('div');
      el.className = 'circle' + (p.nickname===self?' self':'');
      el.textContent = p.nickname.charAt(0).toUpperCase();
      el.style.background = p.color;
      el.style.position = 'absolute';
      // initial position baseY level3
      const qRect = document.getElementById('question').getBoundingClientRect();
      const flagRect = document.getElementById('flag').getBoundingClientRect();
      const rawStartY = qRect.top - el.offsetHeight - 1;
      const rawEndY   = flagRect.top + flagRect.height/2 - el.offsetHeight/2;
      const fullStep  = (rawEndY - rawStartY)/(maxLevel - 1);
      const baseY     = rawStartY + fullStep * 2;
      // initial база уровень 4
      const qRect = document.getElementById('question').getBoundingClientRect();
      const flagRect = document.getElementById('flag').getBoundingClientRect();
      const rawStartY = qRect.top - el.offsetHeight - 1;
      const rawEndY   = flagRect.top + flagRect.height/2 - el.offsetHeight/2;
      const fullStep  = (rawEndY - rawStartY)/(maxLevel - 1);
      const initY     = rawStartY + fullStep * 3;
      el.style.top   = Math.round(initY) + 'px';
      playersContainer.append(el);
      circles[p.nickname] = el;
    }
    animateCircle(el, p.level);
  });
});

// Конец игры
socket.on('gameOver', data => {
  setTimeout(() => {
    gameDiv.classList.remove('visible');
    resultDiv.classList.add('visible');
    winnerText.textContent = `🏅 ${data.winner.nickname} — ${data.winner.correct} правильн. за ${Math.round(data.winner.time/1000)}с`;
    resStats.innerHTML = '';
    data.stats.forEach(p => {
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;
      resStats.append(tr);
    });
    confetti();
  }, 3000);
});