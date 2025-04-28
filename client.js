const socket=io();let self='';
const joinDiv=document.getElementById('join'),lobbyDiv=document.getElementById('lobby'),
gameDiv=document.getElementById('game'),resultDiv=document.getElementById('result'),
playersTb=document.getElementById('players'),statsTb=document.getElementById('stats'),
countEl=document.getElementById('countdown'),qDiv=document.getElementById('question'),
qText=document.getElementById('qtext'),optsDiv=document.getElementById('opts'),
nickInp=document.getElementById('nick'),joinBtn=document.getElementById('joinBtn'),
winnerEl=document.getElementById('winner');
joinBtn.onclick=()=>{const n=nickInp.value.trim();if(!n)return;self=n;socket.emit('join',n);
joinDiv.style.display='none';lobbyDiv.style.display='block';};
socket.on('lobby',list=>{playersTb.innerHTML='';list.filter(n=>n===self).forEach(n=>playersTb.innerHTML+=`<tr class="self"><td>${n}</td></tr>`);
list.filter(n=>n!==self).forEach(n=>playersTb.innerHTML+=`<tr><td>${n}</td></tr>`);});
socket.on('gameStatus',d=>{if(!d.open)location='/closed.html';});
socket.on('countdown',n=>{if(n>0){countEl.style.display='block';countEl.innerText=n;}
else{countEl.style.display='none';lobbyDiv.style.display='none';gameDiv.style.display='block';}});
socket.on('question',({question,options})=>{qText.innerText=question;optsDiv.innerHTML='';
options.forEach((o,i)=>{const b=document.createElement('button');b.className='option-btn';b.innerText=o;
b.onclick=_=>socket.emit('answer',i);optsDiv.append(b);});qDiv.classList.add('show');});
socket.on('answerResult',({correct,correctIndex})=>{const btns=optsDiv.querySelectorAll('button');
btns.forEach((b,i)=>{if(i===correctIndex)b.classList.add('correct');else if(!correct)b.classList.add('wrong');b.disabled=true;});
setTimeout(()=>qDiv.classList.remove('show'),400);});
socket.on('gameOver',({winner,stats})=>{gameDiv.style.display='none';resultDiv.style.display='block';
winnerEl.innerText=`🏅 ${winner.nick} Правильных: ${winner.correct}, Время: ${Math.floor(winner.time/1000)}с`;
stats.forEach(p=>statsTb.innerHTML+=`<tr><td>${p.nick}</td><td>${p.correct}</td><td>${Math.floor(p.time/1000)}с</td></tr>`);});