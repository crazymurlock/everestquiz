const socket = io();
const join = document.getElementById('join');
const game = document.getElementById('game');
const playersDiv = document.getElementById('players');
const questionModal = document.getElementById('question');
const qtext = document.getElementById('qtext');
const opts = document.getElementById('opts');
const end = document.getElementById('end');
const endText = document.getElementById('endText');
let startTime;
let players = {};

join.querySelector('#joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  socket.emit('join', nick);
  join.classList.add('hidden');
  game.classList.remove('hidden');
};

socket.on('playerList', list => {
  playersDiv.innerHTML = '';
  players = {};
  list.forEach((p,i) => {
    const el = document.createElement('div'); el.className = 'player';
    const c = document.createElement('div'); c.className = 'circle'; c.innerText = p.nickname.charAt(0).toUpperCase();
    const n = document.createElement('div'); n.className = 'nick'; n.innerText = p.nickname;
    el.append(c,n);
    playersDiv.append(el);
    players[p.nickname] = { el, level: p.level || 1 };
  });
  updatePositions();
});

socket.on('countdown', n => {
  // reuse question modal for countdown
  qtext.innerText = n>0? n : '';
  questionModal.classList.toggle('hidden', n===0);
});

socket.on('question', data => {
  qtext.innerText = data.question;
  opts.innerHTML = '';
  data.options.forEach((o,i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = o;
    btn.onclick = () => {
      startTime = Date.now();
      socket.emit('answer', { index: i, time: 0 });
      // disable until result
      opts.querySelectorAll('button').forEach(b=>b.disabled=true);
    };
    opts.append(btn);
  });
  questionModal.classList.remove('hidden');
  startTime = Date.now();
});

socket.on('answerResult', res => {
  const buttons = opts.querySelectorAll('button');
  if (res.correct) {
    buttons.forEach((b,i) => { if(i===res.correctIndex) b.classList.add('correct'); });
  } else {
    buttons.forEach((b,i) => {
      if (i===res.correctIndex) b.classList.add('correct');
      else if (!b.disabled) b.classList.add('wrong');
    });
  }
  setTimeout(() => {
    questionModal.classList.add('hidden');
  }, 1000);
});

socket.on('won', () => {
  endText.innerText = 'You reached the top!';
  end.classList.remove('hidden');
});

function updatePositions() {
  const w = playersDiv.clientWidth;
  Object.values(players).forEach((p,i) => {
    const x = ((i+1)/(Object.keys(players).length+1))*w - 20;
    const y = ((p.level||1)-1)*60;
    p.el.style.left = x+'px';
    p.el.style.bottom = y+'px';
  });
}