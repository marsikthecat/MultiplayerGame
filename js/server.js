const express = require('express');
const app = express()
const expressWs = require("express-ws");
expressWs(app);
const { v4: uuidv4 } = require("uuid");
const {random, getRandomColor, newRadius, checkEatable} = require("./functions.js");
const {colors, DOT_SIZE, MAP_WIDTH,
  MAP_HEIGHT, MIN_PLAYER_SIZE, BULLET_SPEED} = require("./constants.js");

app.use(express.static('public'));

let players = {};
let dots = [];
let characters = [];
let bullets = {};
let clients = new Set();

function spawnDot() {
  return {
    x: random(0, MAP_WIDTH - DOT_SIZE),
    y: random(0, MAP_HEIGHT - DOT_SIZE),
    radius: DOT_SIZE / 2,
    color: getRandomColor()
  };
}
function spawnHole() {
  const size = random(15, 100) * 2;
  return {
    name: "hole",
    x: random(0, MAP_WIDTH - size),
    y: random(0, MAP_HEIGHT - size),
    radius: size / 2,
    color: "black"
  };
}
function spawnYummy() {
  return  {
    name: "yummy",
    x: random(0, MAP_WIDTH - 38),
    y: random(0, MAP_HEIGHT - 38),
    radius: 19,
    color: colors[8]
  };
}

function initializeGame() {
  for (let i = 0; i < 1000; i++) {
    dots.push(spawnDot());
  }
  for (let i = 0; i < 10; i++) {
    characters.push(spawnYummy());
    characters.push(spawnHole())
  }
}
initializeGame();

function createBullet(id, x, y, dx, dy, color, heading) {
  return {
    id: uuidv4(),
    from: id,
    x: x,
    y: y,
    dx: dx,
    dy: dy,
    radius: 10,
    color: color,
    heading: heading
  }
}

const avg = [];

app.ws('/socket', function (ws, req) {
  ws.on('message', function (msg) {
    const data = JSON.parse(msg);
    switch (data.type) {
      case 'join':
        const id = uuidv4();
        players[id] = {
          id,
          nickname: data.nickname,
          x: random(0, MAP_WIDTH - 50),
          y: random(0, MAP_HEIGHT - 50),
          radius: MIN_PLAYER_SIZE,
          score: 0,
          color: colors[10],
          smiley: null
        };
        clients.add(ws);
        ws.send(JSON.stringify({ type: "init", id, players, dots, characters}));
        const msg = `${players[id].nickname} just joined the game`;
        broadcast(JSON.stringify({ type: "notify", msg}))
        broadcast(JSON.stringify( {type: "newPlayer", newPlayer: players[id]}))
        break;
      case 'move':
        const playerToMove = players[data.myId];
        if (playerToMove === undefined) return;
        playerToMove.x += data.dx;
        playerToMove.y += data.dy;
        if (playerToMove.y > MAP_HEIGHT - playerToMove.radius ||
          playerToMove.y < playerToMove.radius) {
           ws.send(JSON.stringify({ type: "reflect", dx: data.dx, dy: -data.dy}))
        }
        if (playerToMove.x > MAP_WIDTH - playerToMove.radius ||
          playerToMove.x < playerToMove.radius) {
          ws.send(JSON.stringify({ type: "reflect", dx: -data.dx, dy: data.dy}))
        }
        broadcast(JSON.stringify({
          type: "move",
          playerId: playerToMove.id,
          newPlayerX: playerToMove.x,
          newPlayerY: playerToMove.y,
        }));

        let collMs = 0;
        const s = performance.now()

        checkDotCollision(playerToMove);
        checkPlayerCollision(playerToMove);
        checkCharacterCollision(playerToMove);

        collMs = performance.now() - s;
        avg.push(collMs);
        let avgNum = 0;
        for (let j = 0; j < avg.length; j++) {
          avgNum += avg[j];
        }
        console.log("Average (Server)", avgNum / avg.length);

        break;
      case "smiley":
        players[data.id].smiley = data.src;
        broadcast(JSON.stringify({
          type: "smiley",
          id: data.id,
          src: data.src
        }));
        break;
      case "smiley-gone":
        if (players[data.id] === undefined) return;
        players[data.id].smiley = null;
        broadcast(JSON.stringify({
          type: "smiley-gone",
          id: data.id
        }));
        break;
      case "addBullet":
        const bullet = createBullet(data.id, data.x, data.y, data.dx, data.dy, data.color, data.heading)
        bullets[bullet.id] = bullet;
        const playerWhoFired = players[data.id];
        playerWhoFired.radius = Math.sqrt(((Math.PI * playerWhoFired.radius ** 2) - Math.PI * 10 ** 2) / Math.PI);
        broadcast(JSON.stringify({
          type: "addBullet",
          bullet,
          playerId: data.id,
          newRadius: playerWhoFired.radius
        }))
        break;
      case "moveBullets":
        moveBullets();
        break;
      case "ping":
        ws.send(JSON.stringify({
          type: "pong",
          start: data.start
        }));
        break;
    }
  });

  ws.on('close', function () {
    delete players[ws.id];
    clients.delete(ws);
  });
});

app.listen(3000)

function broadcast(Json) {
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(Json);
    }
  });
}

function checkDotCollision(player) {
  for (let i = dots.length - 1; i >= 0; i--) {
    const dot = dots[i];
    if ( dot.x < player.x - player.radius - 5
      || dot.x > player.x + player.radius + 5
      || dot.y < player.y - player.radius - 5
      || dot.y > player.y + player.radius + 5 ) {
      continue; // outside of box around player means skip
    }

    const dx = dot.x - player.x;
    const dy = dot.y - player.y;
    if (dx*dx + dy*dy <= (player.radius + dot.radius)**2) {
      player.radius = newRadius(player.radius, dot.radius);
      dots.splice(i, 1);
      const newDot = spawnDot();
      dots.push(newDot);
      broadcast(JSON.stringify({
        type: "newDot",
        i,
        newDot
      }))
    }
  }
}

function checkCharacterCollision(player) {
  for (let i = characters.length - 1; i >= 0; i--) {
    const character = characters[i];
    if (player === undefined) return;
    if ( character.x < player.x - player.radius - 5 ||
         character.x > player.x + player.radius + 5 ||
         character.y < player.y - player.radius - 5 ||
         character.y > player.y + player.radius + 5 ) {
      continue; // outside of box around player means skip
    }
    const dx = player.x - character.x;
    const dy = player.y - character.y;
    if (dx*dx + dy*dy < (player.radius + character.radius)**2) {
      if (character.name === "yummy") {
        if (checkEatable(character, player)) {
          player.radius = newRadius(player.radius, character.radius);
          const newYummy = spawnYummy()
          characters.push(newYummy);
          broadcast(JSON.stringify({
            type: "newYummy",
            i,
            newYummy
          }))
          characters.splice(i, 1);
          newRadiusOfPlayer(player.id, player.radius);
          return;
        }
      } else if (character.name === "hole") {
        if (player.radius > character.radius * 1.2) {
          player.radius *= 0.5;
          newRadiusOfPlayer(player.id, player.radius);
          characters.splice(i, 1);
          const newHole = spawnHole();
          characters.push(newHole);
          broadcast(JSON.stringify({
            type: "newHole",
            i,
            newHole
          }))
          if (player.radius < MIN_PLAYER_SIZE) {
            gameOver(player.id, `${player.nickname} has been eaten by a hole`);
          }
        }
        else if (character.radius > player.radius * 1.2) {
          gameOver(player.id, `${player.nickname} has been eaten by a hole`);
        }
      }
    }
  }
}

function checkPlayerCollision(player) {
  for (const id in players) {
    if (id === player.id) continue; // don't check collision with yourself
    const enemy = players[id];
    if ( enemy.x < player.x - player.radius - 8 ||
         enemy.x > player.x + player.radius + 8 ||
         enemy.y < player.y - player.radius - 8 ||
         enemy.y > player.y + player.radius + 8 ) {
      continue; // outside of box around player means skip
    }
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    if (dx*dx + dy*dy < (player.radius + enemy.radius)**2) {
      if (checkEatable(enemy, player)) {
        player.radius = newRadius(player.radius, enemy.radius);
        gameOver(id, `${enemy.nickname} has been killed by ${player.nickname}`);
        newRadiusOfPlayer(player.id, player.radius);
        return;
      }
      if (checkEatable(player, enemy)) {
        enemy.radius = newRadius(enemy.radius, player.radius);
        gameOver(player.id, `${player.nickname} has been killed by ${enemy.nickname}`)
        newRadiusOfPlayer(enemy.id, enemy.radius);
        return;
      }
    }
  }
}

function moveBullets() {
  for (const id in bullets) {
    const bullet = bullets[id];
    bullet.x += bullet.dx * BULLET_SPEED;
    bullet.y += bullet.dy * BULLET_SPEED;
    if (
      bullet.y < bullet.radius || bullet.y > MAP_HEIGHT - bullet.radius ||
      bullet.x < bullet.radius || bullet.x > MAP_WIDTH - bullet.radius
    ) {
      removeBullet(id);
      continue;
    }
    // If bullet collides with hole, remove it
    for (const hole of characters) {
      if (hole.name !== "hole") continue;
      const dx = bullet.x - hole.x;
      const dy = bullet.y - hole.y;
      if (dx * dx + dy * dy < (bullet.radius + hole.radius) ** 2) {
        removeBullet(id);
        break;
      }
    }
    // TODO: if bullet hit yummy, spread multiple bullets
    //  and remove yummy or make yummy bigger until it explodes while spreading bullets.
    if (!bullets[id]) continue;
    // Check Collision between bullet and player
    for (const playerId in players) {
      const player = players[playerId];
      const dx = player.x - bullet.x;
      const dy = player.y - bullet.y;
      if (dx * dx + dy * dy < (player.radius + bullet.radius) ** 2) {
        player.radius -= 10;
        newRadiusOfPlayer(player.id, player.radius);
        removeBullet(id);

        if (player.radius < MIN_PLAYER_SIZE) {
          const shooter = players[bullet.from];
          if (shooter) shooter.radius += 10;
          newRadiusOfPlayer(shooter.id, shooter.radius);
          gameOver(playerId, `${player.nickname} has been killed by ${shooter.nickname}`);
        }
        break;
      }
    }
  }
  broadcast(JSON.stringify({ type: "moveBullets", bullets }));
}

function removeBullet(id) {
  delete bullets[id];
  broadcast(JSON.stringify({ type: "removeBullet", id }));
}

function newRadiusOfPlayer(id, radius) {
  broadcast(JSON.stringify( {type: "newRadius", id, radius }));
}

function gameOver(playerId, msg) {
  delete players[playerId];
  broadcast(JSON.stringify( {type: "gameOver", playerId, msg }));
}
