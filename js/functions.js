import {colors, GOAL_RADIUS } from "./constants.js";
export function getRandomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
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
