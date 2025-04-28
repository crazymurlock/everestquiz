const socket = io();
const join = document.getElementById('join');
const game = document.getElementById('game');
const playersDiv = document.getElementById('players');
const qModal = document.getElementById('question');
const qtext = document.getElementById('qtext');
const opts = document.getElementById('opts');
const endDiv = document.getElementById('end');
let startTime;

join.querySelector('#joinBtn').onclick = () => {
  const nick = document.getElementById('nick').value.trim();
  if (!nick) return;
  socket.emit('join', nick);
  join.classList.add('hidden');
  game.classList.remove('hidden');
};

socket.on('gameStatus', ({open}) => {
  if(!open){ location.reload(); }
});

socket.on('playerList', list => {
  playersDiv.innerHTML=''; list.forEach((p,i)=>{
    const el=document.createElement('div'); el.className='player';
    const c=document.createElement('div'); c.className='circle'; c.innerText=p.nickname[0].toUpperCase();
    const n=document.createElement('div'); n.className='nick'; n.innerText=p.nickname;
    el.append(c,n); playersDiv.append(el);
    el.style.left=`${(i+1)/(list.length+1)*100}%`;
    el.style.bottom=`${(p.level-1)*60}px`;
  });
});

socket.on('countdown', n => {
  if(n>0){ qtext.innerText=n; qModal.classList.remove('hidden'); }
  else qModal.classList.add('hidden');
});

socket.on('question', ({question,options}) => {
  qtext.innerText=question; opts.innerHTML='';
  options.forEach((opt,i)=>{
    const btn=document.createElement('button'); btn.className='option-btn'; btn.innerText=opt;
    btn.onclick=()=>{ const t=(Date.now()-startTime)/1000; socket.emit('answer',{index:i,time:t}); };
    opts.append(btn);
  });
  qModal.classList.remove('hidden'); startTime=Date.now();
});

socket.on('answerResult', ({correct,correctIndex}) => {
  opts.querySelectorAll('button').forEach((b,i)=>{
    if(i===correctIndex) b.classList.add('correct');
    else if(!correct) b.classList.add('wrong');
    b.disabled=true;
  });
  setTimeout(()=>qModal.classList.add('hidden'),1000);
});

socket.on('won', () => {
  endDiv.classList.remove('hidden');
});