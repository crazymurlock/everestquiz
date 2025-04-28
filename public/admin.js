document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('qform');
  const optionsInputs = document.querySelectorAll('input[name="option"]');
  const qList = document.getElementById('qList');

  // Load existing questions
  fetch('/evergameadmin865/questions')
    .then(res => res.json())
    .then(data => {
      data.forEach(q => {
        const li = document.createElement('li');
        li.textContent = `${q.order}. ${q.question} [${q.options.join(', ')}] Answer: ${q.options[q.answerIndex]}`;
        qList.appendChild(li);
      });
    });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const question = document.getElementById('question').value;
    const options = Array.from(optionsInputs).map(i => i.value);
    const answerIndex = document.getElementById('answerIndex').value;
    const order = document.getElementById('order').value;

    fetch('/evergameadmin865/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options, answerIndex, order })
    })
    .then(res => res.json())
    .then(j => {
      if (j.success) {
        alert('Saved!');
        location.reload();
      }
    });
});