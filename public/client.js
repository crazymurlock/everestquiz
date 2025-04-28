const socket = io();
const join = document.getElementById('join');
const game = document.getElementById('game');
const countdown = document.getElementById('countdown');
const countNum = document.getElementById('count');
const question = document.getElementById('question');
const qtext = document.getElementById('qtext');
const opts = document.getElementById('opts');
const end = document.getElementById('end');
const win = document.getElementById('win');
const board = document.getElementById('board');
const qr = document.getElementById('qr');
let start;

join.querySelector('#joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  socket.emit('join', nick);
  join.classList.add('hidden');
  game.classList.remove('hidden');
  qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(location.href)}`;
};

let players = {};

socket.on('playerList', list => {
  const cont = document.getElementById('players');
  cont.innerHTML=''; players={};
  list.forEach((p,i)=>{
    const el = document.createElement('div'); el.className='player';
    const c = document.createElement('div'); c.className='circle'; c.innerText=p.nickname[0].toUpperCase();
    const n = document.createElement('div'); n.className='nick'; n.innerText=p.nickname;
    el.append(c,n); cont.append(el);
    players[p.nickname]={el,score:0,time:0};
  });
  update();
});

socket.on('countdown', n => {
  if(n>0){countNum.innerText=n;countdown.classList.remove('hidden');}
  else countdown.classList.add('hidden');
});

socket.on('question', data => {
  qtext.innerText=data.question; opts.innerHTML='';
  data.options.forEach((o,i)=>{const b=document.createElement('button');
  b.className='option-btn';b.innerText=o;b.onclick=()=>{
    socket.emit('answer',{index:i,time:(Date.now()-start)/1000});
    opts.querySelectorAll('button').forEach(x=>x.disabled=true);
  };opts.append(b);});
  question.classList.remove('hidden');start=Date.now();
});

socket.on('results', arr => {
  question.classList.add('hidden');
  arr.forEach(r=>{players[r.nickname].score=r.score;players[r.nickname].time=r.time;});
  update();
});

socket.on('gameOver', data => {
  game.classList.add('hidden'); end.classList.remove('hidden');
  win.innerText=data.winner;
  board.innerHTML='';data.leaderboard.forEach((p,i)=>{
    board.innerHTML+=`<tr><td>${i+1}</td><td>${p.nickname}</td><td>${p.score}</td><td>${p.time.toFixed(2)}</td></tr>`;
  });
});

function update(){
  const cont=document.getElementById('players');
  const w=cont.clientWidth,h=cont.clientHeight;
  Object.values(players).forEach((p,i)=>{
    const x=(i+1)/(Object.keys(players).length+1)*w-20;
    const y=p.score*60;
    p.el.style.left=x+'px';p.el.style.bottom=y+'px';
  });
}