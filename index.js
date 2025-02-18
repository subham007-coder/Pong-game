const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

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
    ball.speed = 7;  // Reset to initial speed
    ball.spin = 0;   // Reset spin
    
    // Randomize initial angle between -45 and 45 degrees
    const angle = (Math.random() * 90 - 45) * Math.PI / 180;
    ball.dx = ball.speed * Math.cos(angle) * (direction === 1 ? 1 : -1);
    ball.dy = ball.speed * Math.sin(angle);
}

let playerNumbers = new Set();
let ball = {
    x: 400,
    y: 200,
    dx: 7,
    dy: 7,
    speed: 7,
    maxSpeed: 15,      // Maximum ball speed
    speedIncrease: 0.2, // Speed increase after each paddle hit
    radius: 10,
    active: false,
    spin: 0           // Add spin effect
};

let scores = {
    1: 0,
    2: 0
};

function updateBall() {
    if (playerCount === 2 && ball.active) {
        // Apply spin effect
        ball.dy += ball.spin;
        
        // Move ball
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Ball collision with top and bottom
        if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius;
            ball.dy = Math.abs(ball.dy) * 0.9; // Reduce bounce speed slightly
            ball.spin *= 0.5; // Reduce spin on bounce
        } else if (ball.y + ball.radius >= 400) {
            ball.y = 400 - ball.radius;
            ball.dy = -Math.abs(ball.dy) * 0.9;
            ball.spin *= 0.5;
        }

        // Ball collision with paddles
        players.forEach((player, id) => {
            const paddleWidth = 20;
            const paddleHeight = 60;
            
            // Left paddle collision
            if (player.playerNumber === 1 && 
                ball.x - ball.radius <= paddleWidth * 2 && 
                ball.x + ball.radius >= paddleWidth) {
                if (ball.y >= player.y && ball.y <= player.y + paddleHeight) {
                    // Calculate relative impact point (-1 to 1)
                    const impact = (ball.y - (player.y + paddleHeight/2)) / (paddleHeight/2);
                    
                    // Increase speed slightly with each hit
                    ball.speed = Math.min(ball.speed + ball.speedIncrease, ball.maxSpeed);
                    
                    // Calculate new angle based on impact point
                    const angle = impact * Math.PI/3; // Max 60 degree deflection
                    ball.dx = Math.cos(angle) * ball.speed;
                    ball.dy = Math.sin(angle) * ball.speed;
                    
                    // Add spin based on impact point
                    ball.spin = impact * 0.2;
                    
                    ball.x = paddleWidth * 2 + ball.radius;
                }
            }
            
            // Right paddle collision (similar logic)
            if (player.playerNumber === 2 && 
                ball.x + ball.radius >= 780 - paddleWidth && 
                ball.x - ball.radius <= 780) {
                if (ball.y >= player.y && ball.y <= player.y + paddleHeight) {
                    const impact = (ball.y - (player.y + paddleHeight/2)) / (paddleHeight/2);
                    ball.speed = Math.min(ball.speed + ball.speedIncrease, ball.maxSpeed);
                    
                    const angle = impact * Math.PI/3;
                    ball.dx = -Math.cos(angle) * ball.speed;
                    ball.dy = Math.sin(angle) * ball.speed;
                    
                    ball.spin = impact * 0.2;
                    
                    ball.x = 780 - paddleWidth - ball.radius;
                }
            }
        });

        // Score points
        if (ball.x < -10) {
            scores[2]++;
            io.emit('updateScore', scores);
            resetBall(1);
        } else if (ball.x > 810) {
            scores[1]++;
            io.emit('updateScore', scores);
            resetBall(-1);
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
    
    players.set(socket.id, { 
        y: 200, 
        playerNumber,
        username: `Player ${playerNumber}` // Default username
    });
    
    // Emit player number and current game state
    socket.emit('playerNumber', playerNumber);
    io.emit('playerCount', playerCount);
    
    console.log(`Assigned player ${playerNumber} to ${socket.id}`);
    
    if (playerCount === 2) {
        ball.active = true;
        ball.dx = ball.speed * (Math.random() > 0.5 ? 1 : -1);
        ball.dy = ball.speed * (Math.random() > 0.5 ? 1 : -1);
        io.emit('gameStart');
        io.emit('ballUpdate', ball);
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

    socket.on('setUsername', ({ username }) => {
        const player = players.get(socket.id);
        if (player) {
            player.username = username;
            
            // Create object with current player names
            const playerNames = {};
            players.forEach((p) => {
                playerNames[p.playerNumber] = p.username;
            });
            
            // Broadcast updated player names to all clients
            io.emit('playerNames', playerNames);
        }
    });

    socket.on('chatMessage', (data) => {
        const player = players.get(socket.id);
        if (player) {
            io.emit('chatMessage', {
                message: data.message,
                username: player.username || `Player ${player.playerNumber}`,
                player: player.playerNumber
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
            
            // Reset game state
            ball.active = false; // Deactivate ball when player leaves
            ball.x = 400;
            ball.y = 200;
            scores = { 1: 0, 2: 0 };
            io.emit('resetGame', {
                ball,
                scores,
                playerCount
            });
            
            // Broadcast updated player names
            const playerNames = {};
            players.forEach((p) => {
                playerNames[p.playerNumber] = p.username;
            });
            io.emit('playerNames', playerNames);
            
            console.log('Player', player.playerNumber, 'disconnected:', socket.id);
        }
    });
});

function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    if (process.env.RENDER) {
        console.log(`Production: https://your-app-name.onrender.com`);
    }
});
