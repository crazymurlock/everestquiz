const socket = io();
let self = '';
const playersContainer = document.getElementById('playersContainer');
const circles = {};

socket.on('playerList', players => {
  const sorted = players.sort((a, b) => 
    b.level - a.level || a.lastAnswerTime - b.lastAnswerTime
  );

  sorted.forEach((player, index) => {
    let circle = circles[player.nickname];
    
    if (!circle) {
      circle = createCircle(player);
      circles[player.nickname] = circle;
    }
    
    updateCirclePosition(circle, player, index, sorted.length);
  });

  // Remove disconnected players
  Object.keys(circles).forEach(name => {
    if (!sorted.find(p => p.nickname === name)) {
      circles[name].remove();
      delete circles[name];
    }
  });
});

function createCircle(player) {
  const circle = document.createElement('div');
  circle.className = `circle${player.nickname === self ? ' self' : ''}`;
  circle.style.backgroundColor = player.color;
  
  const label = document.createElement('div');
  label.className = 'circle-label';
  label.textContent = player.nickname.substring(0, 12);
  
  const level = document.createElement('div');
  level.className = 'circle-level';
  
  circle.append(label, level);
  playersContainer.appendChild(circle);
  return circle;
}

function updateCirclePosition(circle, player, index, total) {
  const yPos = window.innerHeight * 0.8 - (player.level * 80);
  const xPos = (window.innerWidth / (total + 1)) * (index + 1);
  
  circle.style.transform = `translate(${xPos}px, ${yPos}px)`;
  circle.querySelector('.circle-level').textContent = player.level;
  
  if (player.nickname === self) {
    circle.style.zIndex = '1000';
    circle.style.width = '44px';
    circle.style.height = '44px';
  }
}
