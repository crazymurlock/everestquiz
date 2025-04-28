document.addEventListener('DOMContentLoaded',()=>{
const form=document.getElementById('qform'),list=document.getElementById('qList'),start=document.getElementById('startBtn');
const opts=document.querySelectorAll('input[name="opt"]');const socket=io();
fetch('/evergameadmin865/questions').then(r=>r.json()).then(data=>data.forEach(q=>{
  const li=document.createElement('li');li.textContent=`${q.order}[${q.tag}]. ${q.question}`;list.append(li);
}));
form.addEventListener('submit',e=>{e.preventDefault();
  const q=document.getElementById('question').value;
  const options=Array.from(opts).map(i=>i.value);
  fetch('/evergameadmin865/questions',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({order:document.getElementById('order').value,tag:document.getElementById('tag').value,
      question:q,options,answerIndex:document.getElementById('answerIndex').value})})
.then(()=>location.reload());
});
start.onclick=()=>fetch('/evergameadmin865/start',{method:'POST'}).then(()=>alert('Starting!'));
});