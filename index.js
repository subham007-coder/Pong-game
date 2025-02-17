
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
let playerNumbers = new Set();
let ball = {
    x: 400,
    y: 200,
    dx: 5,
    dy: 5
};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    if (playerCount < 2) {
        let playerNumber = 1;
        if (playerNumbers.has(1)) {
            playerNumber = 2;
        }
        playerNumbers.add(playerNumber);
        playerCount++;
        
        players.set(socket.id, { y: 200, playerNumber });
        socket.emit('playerNumber', playerNumber);
        
        console.log(`Assigned player ${playerNumber} to ${socket.id}`);
        
        if (playerCount === 2) {
            io.emit('gameStart');
        }
    } else {
        socket.emit('roomFull');
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

server.listen(3000, '0.0.0.0', () => console.log('Pong game server is running! Open the game in your browser.'));
