
const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let playerNumber = null;
let paddles = { 1: { y: 200 }, 2: { y: 200 } };

socket.on('playerNumber', (num) => {
    playerNumber = num;
    console.log('You are player', playerNumber);
});

socket.on('updatePaddle', (data) => {
    paddles[data.id] = { y: data.y };
});

socket.on('playerLeft', (id) => {
    paddles[id] = { y: 200 };
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = 'white';
    ctx.stroke();
    
    // Draw paddles
    ctx.fillStyle = "white";
    ctx.fillRect(20, paddles[1]?.y || 200, 10, 60);
    ctx.fillRect(770, paddles[2]?.y || 200, 10, 60);
}

canvas.addEventListener('mousemove', (event) => {
    if (playerNumber) {
        const rect = canvas.getBoundingClientRect();
        const y = event.clientY - rect.top - 30;
        
        // Keep paddle within canvas bounds
        const boundedY = Math.max(0, Math.min(canvas.height - 60, y));
        
        paddles[playerNumber].y = boundedY;
        socket.emit('updatePaddle', { y: boundedY });
    }
});

function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
