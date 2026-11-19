#!/usr/bin/env node
// Generates OverlayKit's app icon, Android adaptive-icon layers and splash mark
// into assets/images/. Self-authored art: every shape is drawn here from signed
// distance functions, with no image library and no third-party artwork.
//
// The mark: a camera viewfinder (white corner brackets) around a line of text
// with its amber Source_Outline, and a teal translation label pointing at it.
//
// Run: node scripts/make-icons.mjs
// Output is deterministic, so re-running without changes gives identical files.
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

const OUT_DIR = join(import.meta.dirname, '..', 'assets', 'images');
const SIZE = 1024;

const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);

const COLOURS = {
  backgroundTop: hex('#1E4470'),
  backgroundBottom: hex('#0A1628'),
  bracket: hex('#FFFFFF'),
  outline: hex('#FFD54F'), // OUTLINE_COLOUR in src/modules/ui/overlay/styles.ts
  sourceText: hex('#D9E3EE'),
  label: hex('#2DD4BF'),
  labelText: hex('#0A1628'),
  mono: hex('#FFFFFF'),
};

// --- Signed distance functions, in design units (px on a 1024 canvas at scale 1) ---

function roundBox(cx, cy, halfW, halfH, radius) {
  return (x, y) => {
    const qx = Math.abs(x - cx) - (halfW - radius);
    const qy = Math.abs(y - cy) - (halfH - radius);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
  };
}

function ring(sdf, halfStroke) {
  return (x, y) => Math.abs(sdf(x, y)) - halfStroke;
}

/** A line segment with round caps. */
function capsule(ax, ay, bx, by, radius) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  return (x, y) => {
    const px = x - ax;
    const py = y - ay;
    const h = Math.min(Math.max((px * dx + py * dy) / lengthSq, 0), 1);
    return Math.hypot(px - dx * h, py - dy * h) - radius;
  };
}

/** A square turned 45°, with rounded corners. */
function diamond(cx, cy, half, radius) {
  const square = roundBox(0, 0, half, half, radius);
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    return square(Math.SQRT1_2 * (dx + dy), Math.SQRT1_2 * (dy - dx));
  };
}

function union(sdfs) {
  return (x, y) => {
    let d = Infinity;
    for (const sdf of sdfs) d = Math.min(d, sdf(x, y));
    return d;
  };
}

// --- The mark ---

function markLayers({ mono }) {
  const frame = 190; // half size of the viewfinder
  const arm = 100;
  const stroke = 20; // bracket radius (half the stroke width)
  const corners = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      corners.push(capsule(sx * frame, sy * frame, sx * (frame - arm), sy * frame, stroke));
      corners.push(capsule(sx * frame, sy * frame, sx * frame, sy * (frame - arm), stroke));
    }
  }

  const boxY = -64;
  const labelY = 70;
  const colour = (name) => (mono ? COLOURS.mono : COLOURS[name]);

  return [
    { sdf: union(corners), colour: colour('bracket') },
    { sdf: ring(roundBox(0, boxY, 128, 40, 18), 9), colour: colour('outline') },
    {
      sdf: union([roundBox(-40, boxY, 58, 11, 11), roundBox(67, boxY, 31, 11, 11)]),
      colour: colour('sourceText'),
    },
    {
      sdf: union([roundBox(0, labelY, 128, 42, 24), diamond(-66, labelY - 42, 20, 4)]),
      colour: colour('label'),
    },
    {
      sdf: union([roundBox(-44, labelY, 54, 11, 11), roundBox(50, labelY, 30, 11, 11)]),
      colour: COLOURS.labelText,
      // The monochrome (themed) icon is one colour: the label text is cut out.
      erase: mono,
    },
  ];
}

// --- Rendering ---

function gradient(x, y) {
  const t = (x + y) / (2 * SIZE);
  const [top, bottom] = [COLOURS.backgroundTop, COLOURS.backgroundBottom];
  return [0, 1, 2].map((i) => top[i] + (bottom[i] - top[i]) * t);
}

/**
 * Renders the layers over an optional background. `scale` is relative to the
 * design canvas. Coverage comes from the pixel distance to each shape's edge,
 * which gives antialiased edges without supersampling.
 */
function render({ background, layers, scale }) {
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  for (let py = 0; py < SIZE; py += 1) {
    for (let px = 0; px < SIZE; px += 1) {
      const x = (px + 0.5 - SIZE / 2) / scale;
      const y = (py + 0.5 - SIZE / 2) / scale;
      let [r, g, b] = background ? background(px + 0.5, py + 0.5) : [0, 0, 0];
      let a = background ? 1 : 0;
      for (const layer of layers) {
        const coverage = Math.min(Math.max(0.5 - layer.sdf(x, y) * scale, 0), 1);
        if (coverage === 0) continue;
        if (layer.erase) {
          a *= 1 - coverage;
          continue;
        }
        const out = coverage + a * (1 - coverage);
        const [cr, cg, cb] = layer.colour;
        r = (cr * coverage + r * a * (1 - coverage)) / out;
        g = (cg * coverage + g * a * (1 - coverage)) / out;
        b = (cb * coverage + b * a * (1 - coverage)) / out;
        a = out;
      }
      const i = (py * SIZE + px) * 4;
      const visible = a > 0;
      pixels[i] = visible ? Math.round(r * 255) : 0;
      pixels[i + 1] = visible ? Math.round(g * 255) : 0;
      pixels[i + 2] = visible ? Math.round(b * 255) : 0;
      pixels[i + 3] = Math.round(a * 255);
    }
  }
  return pixels;
}

// --- PNG encoding (RGBA, 8 bits per channel, no filtering) ---

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header.set([8, 6, 0, 0, 0], 8); // bit depth 8, colour type RGBA
  const rows = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y += 1) {
    pixels.copy(rows, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Outputs ---

// Android adaptive icons show the middle 66/108 of the layer on every mask. At
// scale 1.05 the mark's farthest point is 303 px from the centre, inside that
// 313 px safe radius. The splash mark stays inside the inscribed circle too.
const OUTPUTS = [
  { file: 'icon.png', background: gradient, layers: markLayers({ mono: false }), scale: 1.5 },
  { file: 'android-icon-background.png', background: gradient, layers: [], scale: 1 },
  { file: 'android-icon-foreground.png', background: null, layers: markLayers({ mono: false }), scale: 1.05 },
  { file: 'android-icon-monochrome.png', background: null, layers: markLayers({ mono: true }), scale: 1.05 },
  { file: 'splash-icon.png', background: null, layers: markLayers({ mono: false }), scale: 1.6 },
];

for (const output of OUTPUTS) {
  const png = encodePng(render(output));
  writeFileSync(join(OUT_DIR, output.file), png);
  process.stdout.write(`wrote assets/images/${output.file} (${SIZE}x${SIZE}, ${png.length} bytes)\n`);
}
