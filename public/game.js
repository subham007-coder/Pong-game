
const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerInfo = document.getElementById('playerInfo');

// Set canvas size based on window size
function resizeCanvas() {
    const aspectRatio = 16/9;
    let width = window.innerWidth * 0.95;
    let height = width / aspectRatio;
    
    if (height > window.innerHeight * 0.95) {
        height = window.innerHeight * 0.95;
        width = height * aspectRatio;
    }
    
    canvas.width = width;
    canvas.height = height;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let playerNumber = null;
let paddles = { 1: { y: 200 }, 2: { y: 200 } };
let ball = { x: 400, y: 200 };

socket.on('ballUpdate', (newBall) => {
    ball = newBall;
});

socket.on('playerNumber', (num) => {
    playerNumber = num;
    playerInfo.textContent = `You are Player ${playerNumber}. Waiting for opponent...`;
});

socket.on('playerCount', (count) => {
    if (count === 1) {
        playerInfo.textContent = `You are Player ${playerNumber}. Waiting for opponent...`;
    }
});

socket.on('gameStart', () => {
    playerInfo.textContent = `Game Started! You are Player ${playerNumber}`;
});

socket.on('roomFull', () => {
    playerInfo.textContent = 'Game room is full! Please try again later.';
});

socket.on('connect', () => {
    playerInfo.textContent = 'Connected! Waiting for game assignment...';
});

socket.on('disconnect', () => {
    playerInfo.textContent = 'Disconnected from server. Please refresh.';
});

socket.on('updatePaddle', (data) => {
    paddles[data.id] = { y: data.y };
});

socket.on('playerLeft', (id) => {
    paddles[id] = { y: canvas.height / 2 };
});

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = 'white';
    ctx.stroke();
    
    // Draw ball
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw paddles
    ctx.fillStyle = "white";
    const paddleWidth = canvas.width * 0.02;
    const paddleHeight = canvas.height * 0.15;
    
    // Left paddle (Player 1)
    ctx.fillRect(paddleWidth, paddles[1]?.y || canvas.height/2, paddleWidth, paddleHeight);
    
    // Right paddle (Player 2)
    ctx.fillRect(canvas.width - paddleWidth * 2, paddles[2]?.y || canvas.height/2, paddleWidth, paddleHeight);
}

function handleInput(y) {
    if (playerNumber) {
        const rect = canvas.getBoundingClientRect();
        const canvasY = ((y - rect.top) / rect.height) * canvas.height;
        const paddleHeight = canvas.height * 0.15;
        const boundedY = Math.max(0, Math.min(canvas.height - paddleHeight, canvasY));
        
        paddles[playerNumber].y = boundedY;
        socket.emit('updatePaddle', { y: boundedY });
    }
}

canvas.addEventListener('mousemove', (event) => {
    handleInput(event.clientY);
});

canvas.addEventListener('touchmove', (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    handleInput(touch.clientY);
});

canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
});

function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
