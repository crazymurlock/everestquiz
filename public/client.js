const socket = io();
const joinDiv = document.getElementById('join');
const gameDiv = document.getElementById('game');
const playersDiv = document.getElementById('players');
const questionModal = document.getElementById('question');
const qtext = document.getElementById('qtext');
const opts = document.getElementById('opts');
const endDiv = document.getElementById('end');
const endText = document.getElementById('endText');
const qrImg = document.getElementById('qr');

joinDiv.querySelector('#joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  socket.emit('join', nick);
  joinDiv.classList.add('hidden');
  gameDiv.classList.remove('hidden');
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(location.href)}`;
};

// Listen for game open/close
socket.on('gameStatus', ({ open }) => {
  if (!open) {
    alert('Game is closed by admin');
    location.reload();
  } else {
    alert('Game is opened by admin');
    location.reload();
  }
});

socket.on('playerList', list => {
  playersDiv.innerHTML = '';
  list.forEach((p, i) => {
    const el = document.createElement('div'); el.className = 'player';
    const c = document.createElement('div'); c.className = 'circle'; c.innerText = p.nickname[0].toUpperCase();
    const n = document.createElement('div'); n.className = 'nick'; n.innerText = p.nickname;
    el.append(c,n);
    playersDiv.append(el);
    el.style.left = `${(i+1)/(list.length+1)*100}%`;
    el.style.bottom = `${(p.level-1)*60}px`;
  });
});

socket.on('countdown', n => {
  document.getElementById('count').innerText = n>0?n:'';
  questionModal.classList.toggle('hidden', n>0);
});

socket.on('question', data => {
  qtext.innerText = data.question;
  opts.innerHTML = '';
  data.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = opt;
    btn.onclick = () => {
      const time = (Date.now() - startTime)/1000;
      socket.emit('answer', { index: idx, time });
    };
    opts.append(btn);
  });
  questionModal.classList.remove('hidden');
  startTime = Date.now();
});

socket.on('answerResult', ({ correct, correctIndex }) => {
  const buttons = opts.querySelectorAll('button');
  buttons.forEach((b, i) => {
    if (correct && i === correctIndex) b.classList.add('correct');
    if (!correct && i === correctIndex) b.classList.add('correct');
    if (!correct && !b.classList.contains('correct') && !b.disabled) b.classList.add('wrong');
    b.disabled = true;
  });
  setTimeout(() => questionModal.classList.add('hidden'), 1000);
});

socket.on('won', () => {
  endText.innerText = 'You won!';
  endDiv.classList.remove('hidden');
});