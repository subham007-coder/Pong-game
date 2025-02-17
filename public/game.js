const socket = io();
let username = '';
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
let scores = { 1: 0, 2: 0 };
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;

function promptUsername() {
    const name = prompt('Enter your username:') || '';
    username = name.trim() || `Player ${playerNumber}`;
    socket.emit('setUsername', { username });
}

socket.on('ballUpdate', (newBall) => {
    ball = newBall;
});

socket.on('updateScore', (newScores) => {
    scores = newScores;
});

socket.on('playerNumber', (num) => {
    playerNumber = num;
    playerInfo.textContent = `You are Player ${playerNumber}. Waiting for opponent...`;
    promptUsername();
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

// Update connect handler
socket.on('connect', () => {
    playerInfo.textContent = 'Connected! Waiting for game assignment...';
    // Reset local game state
    scores = { 1: 0, 2: 0 };
    ball = { x: 400, y: 200 };
    paddles = { 1: { y: 200 }, 2: { y: 200 } };
    playerNumber = null;
});

socket.on('disconnect', () => {
    playerInfo.textContent = 'Disconnected from server. Please refresh.';
});

socket.on('updatePaddle', (data) => {
    paddles[data.playerNumber] = { y: data.y };
});

socket.on('playerLeft', (id) => {
    paddles[id] = { y: canvas.height / 2 };
});

// Add after existing socket events

const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const messagesDiv = document.getElementById('messages');

// Handle receiving messages
socket.on('chatMessage', (data) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    // Add player-specific class
    messageElement.classList.add(`player${data.player}`);
    
    messageElement.textContent = `${data.username}: ${data.message}`;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Add disconnect message handling
socket.on('playerLeft', (playerNum) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('system-message');
    messageElement.textContent = `Player ${playerNum} left the game`;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Handle sending messages
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chatMessage', { message });
        messageInput.value = '';
    }
});

// Add new socket event listener
socket.on('resetGame', (data) => {
    ball = data.ball;
    scores = data.scores;
    if (data.playerCount < 2) {
        playerInfo.textContent = `Waiting for opponent...`;
    }
});

function draw() {
    const scale = Math.min(canvas.width / GAME_WIDTH, canvas.height / GAME_HEIGHT);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set transform for game scaling
    ctx.save();
    ctx.translate((canvas.width - GAME_WIDTH * scale) / 2, (canvas.height - GAME_HEIGHT * scale) / 2);
    ctx.scale(scale, scale);
    
    // Draw center line
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2, 0);
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT);
    ctx.strokeStyle = 'white';
    ctx.stroke();
    
    // Draw scores
    ctx.setLineDash([]);
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.fillText(scores[1], GAME_WIDTH * 0.25, 60);
    ctx.fillText(scores[2], GAME_WIDTH * 0.75, 60);
    
    // Draw ball
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw paddles
    ctx.fillStyle = "white";
    const paddleWidth = 20;
    const paddleHeight = 60;
    
    // Left paddle (Player 1)
    ctx.fillRect(paddleWidth, paddles[1]?.y || GAME_HEIGHT/2, paddleWidth, paddleHeight);
    
    // Right paddle (Player 2)
    ctx.fillRect(GAME_WIDTH - paddleWidth * 2, paddles[2]?.y || GAME_HEIGHT/2, paddleWidth, paddleHeight);
    
    ctx.restore();
}

function handleInput(y) {
    if (playerNumber) {
        const rect = canvas.getBoundingClientRect();
        const scale = Math.min(canvas.width / GAME_WIDTH, canvas.height / GAME_HEIGHT);
        const offsetY = (canvas.height - GAME_HEIGHT * scale) / 2;
        const gameY = (y - rect.top - offsetY) / scale;
        const paddleHeight = 60;
        const boundedY = Math.max(0, Math.min(GAME_HEIGHT - paddleHeight, gameY));
        
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
