const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  maxHttpBufferSize: 10e6,  // 10 MB — allows two full-size avatar photos
});

const PORT = process.env.PORT || 3000;

// ─── Static files ─────────────────────────────────────────────────────────────
app.use('/control', express.static(path.join(__dirname, 'public/control')));
app.use('/obs',     express.static(path.join(__dirname, 'public/obs')));
app.get('/', (req, res) => res.redirect('/control'));

// ─── Server-side game state (source of truth, survives controller disconnect) ─
let latestState   = null;
let latestTiles   = null;
const avatarCache = [null, null];
let milestonesCache = { milestones: [], scope: 'all' };
let latestLogs    = [];

// ─── Active controller tracking ───────────────────────────────────────────────
let activeControllerId = null;

// ─── Socket connections ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const clientType = socket.handshake.query.type || 'unknown';
  console.log(`[+] ${clientType} connected  (id: ${socket.id})`);

  if (clientType === 'control') {
    // Kick the previous controller if still connected
    if (activeControllerId && activeControllerId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(activeControllerId);
      if (oldSocket) {
        oldSocket.emit('kicked');
        console.log(`[!] Kicked old controller (id: ${activeControllerId})`);
      }
    }
    activeControllerId = socket.id;

    // Send full saved state to the new controller so it can resume
    if (latestState) socket.emit('resumeState', {
      state:      latestState,
      tiles:      latestTiles,
      avatars:    avatarCache,
      milestones: milestonesCache,
      logs:       latestLogs,
    });

  } else {
    // OBS or other clients — catch-up as before
    if (latestState) socket.emit('stateUpdate', latestState);
    if (latestTiles) socket.emit('tilesUpdate',  latestTiles);
    avatarCache.forEach(av => { if (av) socket.emit('avatarUpdate', av); });
  }

  // ── Events from the active controller ───────────────────────────────────────

  socket.on('stateUpdate', (state) => {
    latestState = state;
    socket.broadcast.emit('stateUpdate', state);
  });

  socket.on('tilesUpdate', (data) => {
    latestTiles = data;
    socket.broadcast.emit('tilesUpdate', data);
  });

  socket.on('avatarUpdate', (data) => {
    avatarCache[data.index] = data;
    socket.broadcast.emit('avatarUpdate', data);
  });

  socket.on('milestonesUpdate', (data) => {
    milestonesCache = data;
  });

  socket.on('logsUpdate', (data) => {
    latestLogs = data;
  });

  socket.on('animEvent', (data) => {
    socket.broadcast.emit('animEvent', data);
  });

  socket.on('disconnect', () => {
    if (socket.id === activeControllerId) {
      activeControllerId = null;
      console.log(`[-] Active controller disconnected (id: ${socket.id})`);
    } else {
      console.log(`[-] ${clientType} disconnected (id: ${socket.id})`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🎮 Stream Quest running!`);
  console.log(`   Control room → http://localhost:${PORT}/control`);
  console.log(`   OBS widget   → http://localhost:${PORT}/obs\n`);
});
