const socket = io();
const joinDiv = document.getElementById('join');
const gameDiv = document.getElementById('game');
const playersDiv = document.getElementById('players');
const qModal = document.getElementById('questionModal');
const qtext = document.getElementById('qtext');
const opts = document.getElementById('opts');
const endDiv = document.getElementById('end');
let startTime;

joinDiv.querySelector('#joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if(!nick) return;
  socket.emit('join', nick);
  joinDiv.classList.add('hidden');
  gameDiv.classList.remove('hidden');
};

socket.on('gameStatus', ({open}) => {
  if(!open) window.location = '/closed.html';
});

socket.on('countdown', n => {
  alert(n>0 ? `Game starts in ${n}` : 'Go!');
});

socket.on('joinAck', nick => {
  console.log('Joined as', nick);
});

// Placeholder for question handling...
