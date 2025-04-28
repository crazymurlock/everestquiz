const socket = io();
const joinDiv = document.getElementById('join');
const gameDiv = document.getElementById('game');
const playersDiv = document.getElementById('players');
const countEl = document.getElementById('count');
const countdownModal = document.getElementById('countdownModal');
const questionModal = document.getElementById('questionModal');
const qtext = document.getElementById('qtext');
const opts = document.getElementById('opts');
const endModal = document.getElementById('endModal');

joinDiv.querySelector('#joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  socket.emit('join', nick);
  joinDiv.classList.add('hidden');
  gameDiv.classList.remove('hidden');
};

socket.on('gameStatus', ({open}) => {
  if (!open) window.location = '/closed.html';
});

socket.on('playerList', list => {
  playersDiv.innerHTML = '';
  list.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'player';
    const circle = document.createElement('div');
    circle.className = 'circle';
    circle.innerText = p.nickname.charAt(0).toUpperCase();
    const nick = document.createElement('div');
    nick.className = 'nick';
    nick.innerText = p.nickname;
    el.append(circle, nick);
    playersDiv.append(el);
    const x = (i + 1) / (list.length + 1) * 100;
    const y = (p.level - 1) * 60;
    el.style.left = x + '%';
    el.style.bottom = y + 'px';
  });
});

socket.on('countdown', n => {
  if (n > 0) {
    countEl.innerText = n;
    countdownModal.classList.remove('hidden');
  } else {
    countdownModal.classList.add('hidden');
  }
});

socket.on('question', ({question, options}) => {
  qtext.innerText = question;
  opts.innerHTML = '';
  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = opt;
    btn.onclick = () => socket.emit('answer', i);
    opts.append(btn);
  });
  questionModal.classList.remove('hidden');
});

socket.on('answerResult', ({correct, correctIndex}) => {
  const buttons = opts.querySelectorAll('button');
  buttons.forEach((b, i) => {
    if (i === correctIndex) b.classList.add('correct');
    if (!correct && i !== correctIndex) b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(() => {
    questionModal.classList.add('hidden');
  }, 1000);
});

socket.on('won', () => {
  endModal.classList.remove('hidden');
});