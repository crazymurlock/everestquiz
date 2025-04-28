const socket = io();
// joins, listens gameStatus open -> reload
socket.on('gameStatus', ({open}) => { if (!open) location.href = '/closed.html'; });
// rest of client logic unchanged