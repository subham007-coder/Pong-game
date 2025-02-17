
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(__dirname + '/public'));

// Serve index.html for all routes to handle client-side routing
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

let players = new Map();
let playerCount = 0;

function resetBall(direction) {
    ball.x = 400;
    ball.y = 200;
    ball.dx = ball.speed * (direction === 1 ? 1 : -1);
    ball.dy = ball.speed * (Math.random() * 0.5 + 0.5) * (Math.random() > 0.5 ? 1 : -1);
}

let playerNumbers = new Set();
let ball = {
    x: 400,
    y: 200,
    dx: 7,
    dy: 7,
    speed: 7,
    radius: 10
};

let scores = {
    1: 0,
    2: 0
};

function updateBall() {
    if (playerCount === 2) {
        // Move ball
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Ball collision with top and bottom
        if (ball.y <= 0 || ball.y >= 400) {
            ball.dy *= -1;
        }

        // Ball collision with paddles
        players.forEach((player, id) => {
            const paddleWidth = 20;
            const paddleHeight = 60;
            
            if (player.playerNumber === 1 && ball.x - ball.radius <= paddleWidth * 2) {
                if (ball.y >= player.y && ball.y <= player.y + paddleHeight) {
                    ball.dx = Math.abs(ball.dx);
                    ball.dy += (ball.y - (player.y + paddleHeight/2)) * 0.1;
                    ball.x = paddleWidth * 2 + ball.radius;
                }
            }
            
            if (player.playerNumber === 2 && ball.x + ball.radius >= 780) {
                if (ball.y >= player.y && ball.y <= player.y + paddleHeight) {
                    ball.dx = -Math.abs(ball.dx);
                    ball.dy += (ball.y - (player.y + paddleHeight/2)) * 0.1;
                    ball.x = 780 - ball.radius;
                }
            }
        });

        // Score points only when ball passes completely behind paddles
        if (ball.x < -10) {  // Ball passes left boundary completely
            scores[2]++;
            io.emit('updateScore', scores);
            resetBall(1);
        } else if (ball.x > 810) {  // Ball passes right boundary completely
            scores[1]++;
            io.emit('updateScore', scores);
            ball.x = 400;
            ball.y = 200;
            ball.dx = -ball.speed;
            ball.dy = ball.speed * (Math.random() > 0.5 ? 1 : -1);
        }

        // Broadcast ball position
        io.emit('ballUpdate', ball);
    }
}

// Start game loop
setInterval(updateBall, 1000/60);

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Check if game is already in progress
    if (playerCount === 2) {
        socket.emit('roomFull');
        return;
    }

    // Assign player number
    let playerNumber = 1;
    if (playerNumbers.has(1)) {
        playerNumber = 2;
    }
    playerNumbers.add(playerNumber);
    playerCount++;
    
    players.set(socket.id, { y: 200, playerNumber });
    
    // Emit player number and current game state
    socket.emit('playerNumber', playerNumber);
    io.emit('playerCount', playerCount);
    
    console.log(`Assigned player ${playerNumber} to ${socket.id}`);
    
    if (playerCount === 2) {
        io.emit('gameStart');
    }

    socket.on('updatePaddle', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.y = data.y;
            socket.broadcast.emit('updatePaddle', { 
                playerNumber: player.playerNumber,
                y: data.y 
            });
        }
    });

    socket.on('disconnect', () => {
        if (players.has(socket.id)) {
            const player = players.get(socket.id);
            playerNumbers.delete(player.playerNumber);
            playerCount--;
            players.delete(socket.id);
            io.emit('playerLeft', player.playerNumber);
            console.log('Player', player.playerNumber, 'disconnected:', socket.id);
        }
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Pong game server is running!');
    console.log('Open the game using the URL shown in the webview.');
});
