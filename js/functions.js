import {colors, GOAL_RADIUS, MAX_PLAYER_SPEED, MIN_PLAYER_SPEED} from "./constants.js";

let colorIndex = 0;
export function getRandomColor() {
  colorIndex = (colorIndex + 1) % colors.length;
  return colors[colorIndex];
}

export function random(start, end) {
  return Math.floor(Math.random() * (end - start + 1)) + start;
}

export function newRadius(playerRadius, dotRadius) {
  const ballArea = Math.PI * playerRadius**2;
  const newBallArea = ballArea + Math.PI * dotRadius**2;
  const newRadius = Math.sqrt(newBallArea / Math.PI);
  return newRadius < GOAL_RADIUS ? newRadius : GOAL_RADIUS;
}

export function checkEatable(player, dot) {
  return dot.radius > player.radius * 1.2;
}

export function radiusToScore(radius) {
  return radius < 25 ? 0 : ((radius - 25) / (300 - 25)) * 1000;
}

let scaleFactor = 1
export function getZoom(radius) {
  let targetScale;
  if (radius < 150) {
    targetScale = 1;
  } else if (radius < 250) {
    targetScale = 0.8;
  } else {
    targetScale = 0.5;
  }
  const step = 0.001;
  if (scaleFactor < targetScale) {
    scaleFactor = Math.min(scaleFactor + step, targetScale);
  } else if (scaleFactor > targetScale) {
    scaleFactor = Math.max(scaleFactor - step, targetScale);
  }
  return scaleFactor;
}

export function getSpeed(radius) {
  return Math.max(MIN_PLAYER_SPEED, MAX_PLAYER_SPEED - radius / 50);
}
