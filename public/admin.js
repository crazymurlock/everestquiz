document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('qform'),
        qList = document.getElementById('qList'),
        openBtn = document.getElementById('openBtn'),
        closeBtn = document.getElementById('closeBtn'),
        startBtn = document.getElementById('startBtn');

  function loadQuestions() {
    fetch('/evergameadmin865/questions').then(r=>r.json()).then(data=>{
      qList.innerHTML = '';
      data.forEach(q=>{
        const li = document.createElement('li');
        li.textContent = q.order+': '+q.question+' ['+q.options.join(', ')+'] → '+q.answerIndex;
        qList.appendChild(li);
      });
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const order = +document.getElementById('order').value,
          question = document.getElementById('question').value.trim(),
          options = document.getElementById('options').value.split('\n').map(o=>o.trim()).filter(o=>o),
          answerIndex = +document.getElementById('answerIndex').value;
    fetch('/evergameadmin865/questions',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({order,question,options,answerIndex})
    }).then(()=>{ form.reset(); loadQuestions(); });
  });

  openBtn.onclick = () => fetch('/evergameadmin865/open',{method:'POST'}).then(()=>alert('Game opened'));
  closeBtn.onclick = () => fetch('/evergameadmin865/close',{method:'POST'}).then(()=>alert('Game closed'));
  startBtn.onclick = () => fetch('/evergameadmin865/start',{method:'POST'}).then(()=>alert('Countdown!'));

  loadQuestions();
});