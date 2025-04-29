const express=require('express');
const http=require('http');
const socketio=require('socket.io');
const fs=require('fs');
const path=require('path');
const app=express();
const server=http.createServer(app);
const io=socketio(server);

// Load questions
const QUESTIONS=path.join(__dirname,'questionbase.json');
let questions=[];
try{questions=JSON.parse(fs.readFileSync(QUESTIONS,'utf-8'));}catch{}

let gameOpen=false, gameStarted=false;
const players={};

function randomColor(){
  const h=Math.floor(Math.random()*360);
  return `hsl(${h},60%,50%)`;
}

app.use(express.json());
app.use(express.static('public'));

app.get('/evergameadmin865',(req,res)=>{
  res.sendFile(path.join(__dirname,'public','admin.html'));
});
app.post('/evergameadmin865/open',(req,res)=>{
  gameOpen=true; io.emit('gameStatus',{open:true}); res.send({});
});
app.post('/evergameadmin865/close',(req,res)=>{
  gameOpen=false; gameStarted=false; io.emit('gameStatus',{open:false}); res.send({});
});
app.post('/evergameadmin865/start',(req,res)=>{
  if(!gameOpen) return res.status(400).send({});
  gameStarted=true;
  for(let i=5;i>=1;i--){
    setTimeout(()=>io.emit('countdown',i),(6-i)*1000);
  }
  setTimeout(()=>{
    io.emit('countdown',0);
    Object.keys(players).forEach(id=>sendQuestion(id));
  },6000);
  res.send({});
});

app.get('/',(req,res)=>{
  if(!gameOpen) return res.redirect('/closed.html');
  res.sendFile(path.join(__dirname,'public','index.html'));
});

io.on('connection',socket=>{
  socket.emit('gameStatus',{open:gameOpen});
  socket.on('join',nick=>{
    if(!gameOpen||gameStarted)return;
    players[socket.id]={
      nickname:nick, level:1, correct:0, color:randomColor(), t0:Date.now()
    };
    io.emit('lobby',Object.values(players).map(p=>p.nickname));
    io.emit('playerList',Object.entries(players).map(([id,p])=>({nickname:p.nickname,level:p.level,color:p.color})));
  });
  socket.on('answer',idx=>{
    const p=players[socket.id];
    if(!p||!gameStarted)return;
    const q=p.current;
    const correct=q&&idx===q.answerIndex;
    if(correct) p.level++;
    p.correct += correct?1:0;
    socket.emit('answerResult',{correct,correctIndex:q.answerIndex});
    io.emit('playerList',Object.entries(players).map(([id,p])=>({nickname:p.nickname,level:p.level,color:p.color})));
    setTimeout(()=>{
      if(p.level>5){
        endGame();
      } else {
        sendQuestion(socket.id);
      }
    },800);
  });
  socket.on('disconnect',()=>{
    delete players[socket.id];
    io.emit('lobby',Object.values(players).map(p=>p.nickname));
    io.emit('playerList',Object.entries(players).map(([id,p])=>({nickname:p.nickname,level:p.level,color:p.color})));
  });
});

function sendQuestion(id){
  const p=players[id];
  const pool=questions.filter(q=>q.order===p.level);
  if(!pool.length)return;
  const q={...pool[Math.floor(Math.random()*pool.length)]};
  p.current=q;
  io.to(id).emit('question',q);
}

function endGame(){
  const stats=Object.values(players).map(p=>({nickname:p.nickname,correct:p.correct,time:Date.now()-p.t0}));
  stats.sort((a,b)=>b.correct-a.correct || a.time-b.time);
  io.emit('gameOver',{winner:stats[0],stats});
}

server.listen(process.env.PORT||3000,()=>console.log('Server running'));