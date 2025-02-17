
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

let players = {};
let playerCount = 0;
let ball = {
    x: 400,
    y: 200,
    dx: 5,
    dy: 5
};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    if (playerCount < 2) {
        playerCount++;
        const playerNumber = playerCount;
        players[socket.id] = { y: 200, playerNumber };
        socket.emit('playerNumber', playerNumber);
        
        if (playerCount === 2) {
            io.emit('gameStart');
        }
    } else {
        socket.emit('roomFull');
    }

    socket.on('updatePaddle', (data) => {
        players[socket.id].y = data.y;
        socket.broadcast.emit('updatePaddle', { id: socket.id, y: data.y });
    });

    socket.on('disconnect', () => {
        if (players[socket.id]) {
            playerCount--;
            delete players[socket.id];
            io.emit('playerLeft', socket.id);
            console.log('A player disconnected:', socket.id);
        }
    });
});

server.listen(3000, '0.0.0.0', () => console.log('Pong game server is running! Open the game in your browser.'));
