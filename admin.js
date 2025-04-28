document.addEventListener('DOMContentLoaded',()=>{
const form=document.getElementById('qform'), list=document.getElementById('qList');
const openBtn=document.getElementById('openBtn'), closeBtn=document.getElementById('closeBtn'), startBtn=document.getElementById('startBtn');
fetch('/evergameadmin865/questions').then(r=>r.json()).then(data=>data.forEach(q=>{const li=document.createElement('li');li.textContent=q.order+'. '+q.question;list.append(li);}));
form.addEventListener('submit',e=>{e.preventDefault();
  const q=document.getElementById('question').value, opts=Array.from(document.querySelectorAll('input[name="opt"]')).map(i=>i.value);
  fetch('/evergameadmin865/questions',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({order:document.getElementById('order').value,question:q,options:opts,answerIndex:document.getElementById('answerIndex').value})})
  .then(()=>location.reload());
});
openBtn.onclick=()=>fetch('/evergameadmin865/open',{method:'POST'}).then(()=>alert('Game opened'));
closeBtn.onclick=()=>fetch('/evergameadmin865/close',{method:'POST'}).then(()=>alert('Game closed'));
startBtn.onclick=()=>fetch('/evergameadmin865/start',{method:'POST'}).then(r=>r.json()).then(()=>alert('Game started'));
});