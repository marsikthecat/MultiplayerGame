import {radiusToScore} from "./functions.js";
import {MAP_HEIGHT, MAP_WIDTH, MIN_PLAYER_SIZE, PLAYER_SPEED} from "./constants.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const backGroundCanvas = document.createElement("canvas");
const bCtx = backGroundCanvas.getContext("2d");
backGroundCanvas.width = MAP_WIDTH;
backGroundCanvas.height = MAP_HEIGHT;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const scoreText = document.createElement("p");
document.documentElement.appendChild(scoreText);
scoreText.style.position = "absolute";
scoreText.style.fontSize = "18pt";
scoreText.style.top = "20px";
scoreText.style.left = "20px";
scoreText.style.margin = "0";

const messageBar = document.getElementById("messageBar");

let _score = 0;
const score = {
  get value() { return _score; },
  set value(v) {
    _score = Math.floor(radiusToScore(v));
    scoreText.textContent = "Score: " + _score;
  }
};

const smileyBtn = document.querySelector(".smileyBtn");
const smileys = document.querySelector(".smileys");
const smileyCache = new Map();

smileyBtn.addEventListener("click", () => {
  smileys.style.display = smileys.style.display === "block" ? "none" : "block";
  smileyBtn.classList.toggle("active");
});

let block = false;
const smileyList = document.getElementsByTagName("img");
for (const img of smileyList) {
  const smileyImg = new Image();
  smileyImg.src = img.src;
  smileyCache.set(img.src, smileyImg);

  img.addEventListener("click", () => {
    if (block) return
    ws.send(JSON.stringify({ type: "smiley", id: myId, src: img.src,}))
    block = true;
    setTimeout(() => {
      ws.send(JSON.stringify({ type: "smiley-gone", id: myId}))
      block = false;
    }, 3500);
  });
}

document.addEventListener("keypress", e => {
  if (e.key === "Enter") shot();
});

const urlParams = new URLSearchParams(window.location.search);
const myNick = urlParams.get("nick") || "unnamed player";

const ws = new WebSocket("ws://localhost:3000/socket");
let myId = null;
let players = {};
let dots = [];
let characters = [];
let bullets = {}

// TODO: If player leaves server by reloading or closing window, remove him (onbeforeunload event)

let lastFrameTime = performance.now();
let ping = 0;

function measurePing() {
  const start = performance.now();
  ws.send(JSON.stringify({ type: "ping", start }));
}

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "join", nickname: myNick }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "init") {
    myId = data.id;
    players = data.players;
    dots = data.dots;
    characters = data.characters;
    moveBullets();
    drawBackground();
  }
  if (data.type === "newPlayer") {
    const newPlayer = data.newPlayer;
    players[newPlayer.id] = newPlayer;
  }
  if (data.type === "notify") {
    notify(data.msg);
  }
  if (data.type === "move") {
    const player = players[data.playerId];
    player.x = data.newPlayerX;
    player.y = data.newPlayerY;
  }
  if (data.type === "reflect") {
    direction.x = data.dx / PLAYER_SPEED;
    direction.y = data.dy / PLAYER_SPEED;
  }
  if (data.type === "newRadius") {
    const playerWithNewRadius = players[data.id];
    playerWithNewRadius.radius = data.radius;
  }
  if (data.type === "newDot") {
    dots.splice(data.i, 1)
    dots.push(data.newDot);
    drawBackground()
  }
  if (data.type === "newYummy") {
    characters.splice(data.i, 1);
    characters.push(data.newYummy);
    drawBackground()
  }
  if (data.type === "newHole") {
    characters.splice(data.i, 1);
    characters.push(data.newHole);
    drawBackground()
  }
  if (data.type === "gameOver") {
    if (data.playerId === myId) {
      document.getElementById("gameOverWindow").style.display = "block";
    }
    delete players[data.playerId];
    notify(data.msg)
  }
  if (data.type === "smiley") {
    const player = players[data.id];
    player.smiley = data.src;
  }
  if (data.type === "smiley-gone") {
    if (players[data.id]) {
      players[data.id].smiley = null;
    }
  }
  if (data.type === "moveBullets") {
    bullets = data.bullets || {};
  }
  if (data.type === "addBullet") {
    bullets[data.bullet.id] = data.bullet;
    const playerWhoFired = players[data.playerId];
    playerWhoFired.radius = data.newRadius;
  }
  if (data.type === "removeBullet") {
    delete bullets[data.id];
  }
  if (data.type === "pong") {
    ping = performance.now() - data.start;
  }
};

setInterval(measurePing, 250);

function notify(string) {
  const msg = document.createElement("p")
  msg.style.backgroundColor = "white";
  msg.style.fontFamily = "Arial";
  msg.textContent = string;
  messageBar.appendChild(msg);
  setTimeout(() => {
    messageBar.removeChild(msg);
  }, 5000);
}

let direction = {x: 0, y: 0};

function shot() {
  const myself = players[myId];
  if (myself.radius < MIN_PLAYER_SIZE || direction.x === 0 && direction.y === 0) return;
  const calcX = myself.x + direction.x * (myself.radius + 10);
  const calcY = myself.y + direction.y * (myself.radius + 10);
  ws.send(JSON.stringify({
    id: myId,
    type: "addBullet",
    x: calcX,
    y: calcY,
    dx: direction.x,
    dy: direction.y,
    color: myself.color,
  }))
}

document.getElementById("reload").onclick = function () {
  ws.close();
  window.location.reload();
}
document.getElementById("toStart").onclick = function () {
  ws.close();
  location.replace("start.html");
}

function drawBackground() {
  bCtx.clearRect(0,0, MAP_WIDTH, MAP_HEIGHT);
  bCtx.fillStyle = "#eee";
  bCtx.fillRect(0,0, MAP_WIDTH, MAP_HEIGHT);

  // Draw Dots
  for (let i = 0; i < dots.length; i++) {
    let dot = dots[i];
    bCtx.fillStyle = dot.color;
    bCtx.beginPath();
    bCtx.arc(dot.x, dot.y, dot.radius, 0, Math.PI*2);
    bCtx.fill();
  }
  // Draw Characters
  for (let i = 0; i < characters.length; i++) {
    let character = characters[i];
    bCtx.fillStyle = character.color;
    bCtx.beginPath();
    bCtx.arc(character.x, character.y, character.radius, 0, Math.PI*2);
    bCtx.fill();
  }
}

let lastStatsUpdate = 0;
let fps = 0;

function draw() {
  const now = performance.now();
  let delta = now - lastFrameTime;
  lastFrameTime = now;
  if (delta <= 0 || delta > 1000) {
    delta = 16;
  }
  const currentFps = 1000 / delta;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  if (!myId || !players[myId]) {
    requestAnimationFrame(draw);
    return;
  }

  const me = players[myId];
  const camX = me.x - canvas.width / 2;
  const camY = me.y - canvas.height / 2;
  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.drawImage(backGroundCanvas, 0, 0);

  // Draw Other players
  for (let id in players) {
    const p = players[id];
    if (p.smiley) {
      const newImg = smileyCache.get(p.smiley);
      ctx.drawImage(newImg, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.nickname, p.x, p.y - p.radius - 5);
  }
  // Draw Bullets
  for (let id in bullets) {
    let bullet = bullets[id];
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
  score.value = radiusToScore(me.radius);

  if (now - lastStatsUpdate > 250) {
    fps = currentFps;
    lastStatsUpdate = now;
  }

  ctx.fillStyle = "black";
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Ping: " + ping.toFixed(1) + " ms", window.innerWidth - 150, 20);
  ctx.fillText("FPS: " + fps.toFixed(1), window.innerWidth - 150, 40);
}

let moving = false;
canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const me = players[myId];
  const worldX = clickX + (me.x - canvas.width / 2);
  const worldY = clickY + (me.y - canvas.height / 2);

  const dx = worldX - me.x;
  const dy = worldY - me.y;

  // stop movement if clicked on ball
  if (dx*dx + dy*dy <= (me.radius)**2) {
    moving = false; // Stop
  } else {
    // calc and normalize direction
    const len = Math.sqrt(dx*dx + dy*dy);
    direction.x = dx / len;
    direction.y = dy / len;
    moving = true;
  }
});

function detectMovement() {
  if (moving) {
    const dx = direction.x * PLAYER_SPEED;
    const dy = direction.y * PLAYER_SPEED;
    ws.send(JSON.stringify({ type: "move", myId, dx, dy }));
  }
}

function moveBullets() {
  if (ws.readyState === WebSocket.OPEN && Object.keys(bullets).length > 0) {
    ws.send(JSON.stringify({ type: "moveBullets" }));
  }
}

function gameLoop() {
  draw();
  detectMovement();
  moveBullets();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
