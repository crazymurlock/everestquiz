const socket=io();
let self='';
const lobbyDiv=document.getElementById('lobby'), playersDiv=document.getElementById('players'),
      gameDiv=document.getElementById('game'), resultDiv=document.getElementById('result'),
      track=document.getElementById('track'), qtext=document.getElementById('qtext'), optsDiv=document.getElementById('opts'),
      questionDiv=document.getElementById('question'), winnerH2=document.getElementById('winner'), statsT=document.getElementById('stats');
const circles={}, maxLevel=5;
socket.on('gameStatus',d=>{ if(d.open){ lobbyDiv.style.display='flex'; } else location='/closed.html'; });
socket.on('lobby',list=>{ playersDiv.innerHTML=''; list.forEach(n=>{ const d=document.createElement('div'); d.textContent=n; playersDiv.append(d); }); });
document.addEventListener('DOMContentLoaded',()=>{ socket.emit('join', prompt('Ваш ник?')); });
socket.on('countdown',n=>{ if(n===0){ lobbyDiv.style.display='none'; gameDiv.style.display='flex'; } });
socket.on('playerList',list=>{ // build circles on track
  const rect=track.getBoundingClientRect();
  const width=rect.width;
  list.forEach(p=>{ if(!circles[p.nickname]){ const el=document.createElement('div'); el.className='circle'; el.style.background=p.color; el.textContent=p.nickname.charAt(0).toUpperCase(); track.append(el); circles[p.nickname]=el; } });
  list.forEach(p=>{ const el=circles[p.nickname]; const x=(p.level-1)/(maxLevel-1)*width; el.style.left=x+'px'; });
});
socket.on('question',q=>{ qtext.textContent=q.question; optsDiv.innerHTML=''; q.options.forEach((o,i)=>{ const b=document.createElement('button'); b.className='option'; b.textContent=o; b.onclick=()=>socket.emit('answer',i); optsDiv.append(b); }); });
socket.on('answerResult',res=>{ Array.from(optsDiv.children).forEach((b,i)=>{ if(i===res.correctIndex) b.classList.add('correct'); else if(!res.ans) b.classList.add('wrong'); b.disabled=true; }); setTimeout(()=>optsDiv.innerHTML='',800); });
socket.on('gameOver',d=>{ gameDiv.style.display='none'; resultDiv.style.display='flex'; winnerH2.textContent=`🏅 ${d.winner.nickname}`; statsT.innerHTML=''; d.stats.forEach(p=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${p.nickname}</td><td>${p.correct}</td>`; statsT.append(tr); }); confetti(); });