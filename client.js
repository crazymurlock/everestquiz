const socket = io();
let self = '';
const playersContainer = document.getElementById('playersContainer');
const circles = {};
const MAX_LEVEL = 5;

// Конфигурация позиционирования
const MOUNTAIN = {
  BASE_Y: window.innerHeight * 0.85,    // Основание горы
  TOP_Y: window.innerHeight * 0.25,     // Вершина
  MARGIN_X: 50                         // Отступы по бокам
};

function calculatePosition(player, index, totalPlayers) {
  // Вертикальная позиция (прогресс к вершине)
  const y = MOUNTAIN.BASE_Y - 
    ((MOUNTAIN.BASE_Y - MOUNTAIN.TOP_Y) * (player.level / MAX_LEVEL));
  
  // Горизонтальная позиция (равномерное распределение)
  const x = MOUNTAIN.MARGIN_X + 
    ((window.innerWidth - 2 * MOUNTAIN.MARGIN_X) * index / Math.max(totalPlayers-1, 1));
  
  return {x, y};
}

// Обработчик обновления игроков
socket.on('playerList', players => {
  // Сортируем по уровню и времени последнего ответа
  const sorted = players.sort((a, b) => {
    if (b.level === a.level) return a.lastAnswerTime - b.lastAnswerTime;
    return b.level - a.level;
  });

  // Обновляем кружки
  sorted.forEach((player, index) => {
    let circle = circles[player.nickname];
    
    // Создаем новый кружок
    if (!circle) {
      circle = document.createElement('div');
      circle.className = `circle${player.nickname === self ? ' self' : ''}`;
      circle.style.backgroundColor = player.color;
      circle.style.position = 'absolute';
      circle.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      
      // Лейбл с ником
      const label = document.createElement('div');
      label.className = 'circle-label';
      label.textContent = player.nickname.substring(0, 12);
      
      // Отображение уровня
      const level = document.createElement('div');
      level.className = 'circle-level';
      level.textContent = player.level;
      
      circle.append(label, level);
      playersContainer.appendChild(circle);
      circles[player.nickname] = circle;
    }

    // Позиционирование
    const pos = calculatePosition(player, index, sorted.length);
    circle.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    circle.querySelector('.circle-level').textContent = player.level;

    // Стили для текущего игрока
    if (player.nickname === self) {
      circle.style.zIndex = 1000;
      circle.style.width = '44px';
      circle.style.height = '44px';
    } else {
      circle.style.zIndex = 500 - index;
      circle.style.width = '36px';
      circle.style.height = '36px';
    }
  });

  // Удаляем отсутствующих игроков
  Object.keys(circles).forEach(name => {
    if (!sorted.find(p => p.nickname === name)) {
      circles[name].remove();
      delete circles[name];
    }
  });
});
