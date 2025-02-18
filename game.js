const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const players = new Map(); // Use Map to store players
let playerNumber = 1;
const paddles = {}; // Assuming this is for game state

io.on("connection", (socket) => {
  console.log("A user connected");

  // Assign player number
  players.set(socket.id, playerNumber);
  const assignedPlayerNumber = playerNumber;
  playerNumber = (playerNumber % 2) + 1; // Alternate player numbers
  socket.emit("playerNumber", assignedPlayerNumber);

  socket.on("disconnect", () => {
    console.log("User disconnected");
    players.delete(socket.id);
    //Handle player leaving the game - reset paddle position for disconnected player
    if (assignedPlayerNumber) {
      paddles[assignedPlayerNumber] = { y: canvas.height / 2 };
    }
  });

  socket.on("updatePaddle", (data) => {
    paddles[players.get(socket.id)] = { y: data.y };
    socket.broadcast.emit("opponentPaddleUpdate", {
      playerNumber: players.get(socket.id),
      y: data.y,
    });
  });

  //Consider removing this as the disconnect event handles it.
  socket.on("playerLeft", (playerNumber) => {
    paddles[playerNumber] = { y: canvas.height / 2 };
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

//Dummy canvas for compilation - replace with your actual canvas setup
const canvas = { height: 500 };
