const socket = io();
let self = '';
const joinDiv = document.getElementById('join'),
      lobbyDiv = document.getElementById('lobby'),
      gameDiv  = document.getElementById('game'),
      resultDiv= document.getElementById('result'),
      cntOv    = document.getElementById('countdownOverlay'),
      cntNum   = document.getElementById('cnt'),
      lobbyPl  = document.getElementById('lobbyPlayers'),
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
const baseY = window.innerHeight * 0.8; // Начальная позиция у основания
const levelStep = (window.innerHeight * 0.6) / maxLevel; // Высота шага уровня

function calculatePosition(player, index, totalPlayers) {
  const y = baseY - (player.level * levelStep);
  const x = (window.innerWidth / (totalPlayers + 1)) * (index + 1);
  return {x, y};
}

// Обработчик списка игроков
socket.on('playerList', players => {
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.level === a.level) return a.startTime - b.startTime;
    return b.level - a.level;
  });

  // Обновляем или создаем кружки
  sortedPlayers.forEach((p, i) => {
    let circle = circles[p.nickname];
    
    if (!circle) {
      circle = document.createElement('div');
      circle.className = `circle${p.nickname === self ? ' self' : ''}`;
      circle.style.backgroundColor = p.color;
      circle.style.position = 'absolute';
      circle.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
      circle.style.willChange = 'transform';

      const label = document.createElement('div');
      label.className = 'circle-label';
      label.textContent = p.nickname.substring(0, 12);

      const level = document.createElement('div');
      level.className = 'circle-level';
      level.textContent = p.level;

      circle.append(label, level);
      playersContainer.appendChild(circle);
      circles[p.nickname] = circle;
    }

    // Позиционирование
    const pos = calculatePosition(p, i, sortedPlayers.length);
    circle.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    circle.querySelector('.circle-level').textContent = p.level;

    // Стиль для текущего игрока
    if (p.nickname === self) {
      circle.style.zIndex = '999';
      circle.style.width = '44px';
      circle.style.height = '44px';
    } else {
      circle.style.zIndex = (maxLevel - p.level).toString();
      circle.style.width = '36px';
      circle.style.height = '36px';
    }
  });

  // Удаляем вышедших игроков
  Object.keys(circles).forEach(name => {
    if (!sortedPlayers.find(p => p.nickname === name)) {
      circles[name].remove();
      delete circles[name];
    }
  });
});

// Остальной код без изменений
socket.on('gameStatus', data => {
  if (!data.open) location = '/closed.html';
});

joinBtn.onclick = () => {
  const nick = nickIn.value.trim();
  if (!nick) return;
  self = nick;
  socket.emit('join', nick);
  joinDiv.classList.remove('visible');
  lobbyDiv.classList.add('visible');
};

socket.on('lobby', list => {
  lobbyPl.innerHTML = '';
  list.forEach(n => {
    const d = document.createElement('div');
    d.textContent = n;
    lobbyPl.append(d);
  });
});

socket.on('countdown', n => {
  if (n > 0) {
    cntNum.textContent = n;
    cntOv.classList.add('show');
  } else {
    cntOv.classList.remove('show');
    lobbyDiv.classList.remove('visible');
    gameDiv.classList.add('visible');
    playersContainer.style.display = 'block';
    questionDiv.style.display = 'block';
  }
});

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

socket.on('answerResult', res => {
  Array.from(optsDiv.children).forEach((b, i) => {
    if (i === res.correctIndex) b.classList.add('correct');
    else if (!res.correct) b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(() => optsDiv.innerHTML = '', 800);
});

socket.on('gameOver', data => {
  setTimeout(() => {
    gameDiv.classList.remove('visible');
    resultDiv.classList.add('visible');
    winnerText.textContent = `🏅 ${data.winner.nickname} — ${data.winner.correct} правильн. за ${Math.round(data.winner.time/1000)}с`;
    resStats.innerHTML = '';
    data.stats.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.nickname}</td><td>${p.correct}</td><td>${Math.round(p.time/1000)}</td>`;
      resStats.append(tr);
    });
    confetti();
  }, 3000);
});
