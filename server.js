const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ─── Static files ─────────────────────────────────────────────────────────────
app.use('/control', express.static(path.join(__dirname, 'public/control')));
app.use('/obs', express.static(path.join(__dirname, 'public/obs')));
app.get('/', (req, res) => res.redirect('/control'));

// ─── Server-side cache (lets late-joining OBS clients catch up instantly) ─────
let latestState = null;
let latestTiles = null;
const avatarCache = [null, null];

// ─── Socket connections ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const clientType = socket.handshake.query.type || 'unknown';
  console.log(`[+] ${clientType} connected  (id: ${socket.id})`);

  // Catch-up: send everything cached to any new joiner
  if (latestState) socket.emit('stateUpdate', latestState);
  if (latestTiles) socket.emit('tilesUpdate', latestTiles);
  avatarCache.forEach(av => { if (av) socket.emit('avatarUpdate', av); });

  // Control room sends full game state after every action
  socket.on('stateUpdate', (state) => {
    latestState = state;
    socket.broadcast.emit('stateUpdate', state);
  });

  // Control room sends tile layout on start / stage advance / shuffle
  socket.on('tilesUpdate', (data) => {
    latestTiles = data;
    socket.broadcast.emit('tilesUpdate', data);
  });

  // Control room sends player avatar as base64 data URL
  socket.on('avatarUpdate', (data) => {
    avatarCache[data.index] = data;
    socket.broadcast.emit('avatarUpdate', data);
  });

  // Control room sends animation events — relay immediately to OBS (no caching needed)
  socket.on('animEvent', (data) => {
    socket.broadcast.emit('animEvent', data);
  });
  console.log(`[-] ${clientType} disconnected (id: ${socket.id})`);
});

server.listen(PORT, () => {
  console.log(`\n🎮 Stream Quest running!`);
  console.log(`   Control room → http://localhost:${PORT}/control`);
  console.log(`   OBS widget   → http://localhost:${PORT}/obs\n`);
});
