
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

let playerNumber;
let players = {};

const paddleWidth = 10;
const paddleHeight = 60;

socket.on('playerNumber', (num) => {
    playerNumber = num;
    console.log('You are player', playerNumber + 1);
});

socket.on('roomFull', () => {
    alert('Game room is full!');
});

socket.on('updatePaddle', (data) => {
    if (players[data.id]) {
        players[data.id].y = data.y;
    }
});

socket.on('playerLeft', (id) => {
    delete players[id];
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top - paddleHeight / 2;
    
    socket.emit('updatePaddle', { y: y });
    if (playerNumber === 0) {
        players[socket.id] = { y: y };
    } else if (playerNumber === 1) {
        players[socket.id] = { y: y };
    }
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw paddles
    Object.keys(players).forEach((id, index) => {
        ctx.fillStyle = 'white';
        const x = index === 0 ? 0 : canvas.width - paddleWidth;
        ctx.fillRect(x, players[id].y, paddleWidth, paddleHeight);
    });
    
    requestAnimationFrame(draw);
}

draw();
