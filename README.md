# 🎮 Stream Quest — Multiplayer Setup

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
npm start
```
Server runs on **http://localhost:3000**

---

## Who opens what

| Who | URL | Description |
|-----|-----|-------------|
| **Streamer (host)** | `http://localhost:3000/control` | Full game UI — roll dice, see events, control everything |
| **OBS (both streamers)** | `http://localhost:3000/obs` | Read-only board — add as Browser Source in OBS |

---

## OBS Setup (for each streamer)

1. In OBS, add a **Browser Source**
2. Set URL to `http://localhost:3000/obs`
   - If OBS is on a **different PC** on the same network, replace `localhost` with the host PC's local IP (e.g. `http://192.168.1.42:3000/obs`)
3. Set width: **1280**, height: **720**
4. Check **"Refresh browser when scene becomes active"**

---

## Finding your local IP (for multi-PC setups)

**Windows:** `ipconfig` in Command Prompt → look for IPv4 Address  
**Mac/Linux:** `ifconfig` or `ip addr` → look for `inet` under your network adapter

---

## How it works

```
Control Room (streamer clicks ROLL)
    │
    ▼
Socket.io emit('stateUpdate', state)
    │
    ▼
Server relays to all connected clients
    │
    ▼
OBS widgets re-render the board instantly
```

- The **server holds the last known state**, so if OBS reloads (e.g. switching scenes), it immediately catches up
- **Player photos** are also relayed — upload them in the setup screen on the control room and they appear as tokens on OBS too
- **Tile layouts** are synced on game start, stage advance, and board shuffle

---

## Config

Edit the `CFG` block at the top of `public/control/index.html`:

```js
const CFG = {
  TILES_PER_STAGE: 15,   // tiles per stage
  POINT_GOAL:      50,   // points needed to win
  STAGE_UP_BONUS:  5,    // bonus for reaching stage-up tile
  BOARD_COLS:      8,    // columns in the snake layout
  TILE_DIST: { green:0.20, purple:0.10, red:0.20, yellow:0.30 },
};
```
