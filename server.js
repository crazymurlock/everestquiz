const express=require('express');
const http=require('http');
const socketIO=require('socket.io');
const fs=require('fs');
const path=require('path');
const QUESTION_FILE=path.join(__dirname,'questionbase.json');
let questions=[];
let gameOpen=false,gameStarted=false;
const players={};
function loadQ(){try{questions=JSON.parse(fs.readFileSync(QUESTION_FILE,'utf-8'));}catch{questions=[];}}
loadQ();
const app=express();
const server=http.createServer(app);
const io=socketIO(server);
app.use(express.json());
app.use(express.static('public'));
app.get('/evergameadmin865',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.post('/evergameadmin865/open',(req,res)=>{gameOpen=true;io.emit('gameStatus',{open:true});res.json({});});
app.post('/evergameadmin865/close',(req,res)=>{gameOpen=false;gameStarted=false;io.emit('gameStatus',{open:false});res.json({});});
app.post('/evergameadmin865/start',(req,res)=>{if(!gameOpen)return res.status(400).json({});
gameStarted=true;
for(let i=5;i>=1;i--)setTimeout(()=>io.emit('countdown',i),(6-i)*1000);
setTimeout(()=>{
  io.emit('countdown',0);
  loadQ();
  Object.keys(players).forEach(id=>sendQ(id));
},6000);
res.json({});});
app.get('/',(req,res)=>!gameOpen?res.sendFile(path.join(__dirname,'public','closed.html')):res.sendFile(path.join(__dirname,'public','index.html')));
io.on('connection',socket=>{
  socket.on('join',nick=>{if(!gameOpen)return;players[socket.id]={nick,level:1,correct:0,time:0};io.emit('lobby',Object.values(players).map(p=>p.nick));});
  socket.on('answer',idx=>{const p=players[socket.id];if(!p||!gameStarted)return;loadQ();
    const pool=questions.filter(q=>q.order===p.level);
    const q=p.currentQ;let correct=false;
    if(q&&idx===q.answerIndex){correct=true;p.level++;p.correct++;p.time+=Date.now()-q.start;};
    socket.emit('answerResult',{correct,correctIndex:q.answerIndex});
    io.emit('playerList',Object.values(players).map(p=>({nick:p.nick,level:p.level})));
    setTimeout(()=>sendQ(socket.id),600);
  });
  socket.on('disconnect',()=>{delete players[socket.id];io.emit('lobby',Object.values(players).map(p=>p.nick));});
});
function sendQ(id){const p=players[id];if(!p)return;loadQ();
  const pool=questions.filter(q=>q.order===p.level);
  if(pool.length===0){io.emit('gameOver',{winner:{nick:p.nick,correct:p.correct,time:p.time},stats:Object.values(players).map(p=>({nick:p.nick,correct:p.correct,time:p.time}))});return;}
  const q={...pool[Math.floor(Math.random()*pool.length)]};
  q.start=Date.now();p.currentQ=q;io.to(id).emit('question',{question:q.question,options:q.options});
}
server.listen(3000);