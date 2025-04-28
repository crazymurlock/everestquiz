const express=require('express'), http=require('http'), socketIO=require('socket.io'), fs=require('fs'), path=require('path');
const QUESTION_FILE=path.join(__dirname,'questionbase.json'); let questions=[], gameOpen=false, gameStarted=false, players={};
function loadQ(){try{questions=JSON.parse(fs.readFileSync(QUESTION_FILE,'utf-8'));}catch{questions=[];}}
loadQ();
const app=express(), server=http.createServer(app), io=socketIO(server);
app.use(express.json()); app.use(express.static('public'));
app.get('/evergameadmin865',(r,s)=>s.sendFile(path.join(__dirname,'public','admin.html')));
app.post('/evergameadmin865/open',(r,s)=>{gameOpen=true;io.emit('gameStatus',{open:true});s.json({});});
app.post('/evergameadmin865/close',(r,s)=>{gameOpen=false;gameStarted=false;io.emit('gameStatus',{open:false});s.json({});});
app.post('/evergameadmin865/start',(r,s)=>{if(!gameOpen) return s.status(400).json({}); gameStarted=true; for(let i=5;i>=1;i--) setTimeout(()=>io.emit('countdown',i),(6-i)*1000); setTimeout(()=>{ io.emit('countdown',0); loadQ(); Object.keys(players).forEach(id=>sendQ(id)); },6000); s.json({});});
app.get('/',(r,s)=>!gameOpen?s.sendFile(path.join(__dirname,'public','closed.html')):s.sendFile(path.join(__dirname,'public','index.html')));
io.on('connection',sock=>{ sock.on('join',nick=>{if(!gameOpen)return;players[sock.id]={nick,level:1,correct:0,time:0};io.emit('lobby',Object.values(players).map(p=>p.nick));}); sock.on('answer',idx=>{const p=players[sock.id]; if(!p||!gameStarted)return; loadQ(); const pool=questions.filter(q=>q.order===p.level), q=p.currentQ; const correct=q&&idx===q.answerIndex; sock.emit('answerResult',{correct,correctIndex:q.answerIndex}); if(correct){p.level++;p.correct++;p.time+=Date.now()-q.start;} io.emit('playerList',Object.values(players)); setTimeout(()=>sendQ(sock.id),600);}); sock.on('disconnect',()=>{delete players[sock.id]; io.emit('lobby',Object.values(players).map(p=>p.nick));}); });
function sendQ(id){const p=players[id];if(!p)return; loadQ(); const pool=questions.filter(q=>q.order===p.level); if(!pool.length){ const results=Object.values(players).map(p=>({nick:p.nick,correct:p.correct,time:p.time})); results.sort((a,b)=>b.correct-a.correct||a.time-b.time); io.emit('gameOver',{winner:results[0],stats:results}); return;} const q={...pool[Math.floor(Math.random()*pool.length)],start:Date.now()}; p.currentQ=q; io.to(id).emit('question',{question:q.question,options:q.options}); }
server.listen(3000);