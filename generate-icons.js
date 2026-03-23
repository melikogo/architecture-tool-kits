const { createCanvas } = require("canvas");
const fs = require("fs");

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#2563EB";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", size / 2, size / 2);

  return canvas.toBuffer("image/png");
}

fs.writeFileSync("public/icon-192.png", generateIcon(192));
fs.writeFileSync("public/icon-512.png", generateIcon(512));
console.log("Icons generated!");
