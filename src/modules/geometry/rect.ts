import type { Point, Quad } from '../shared';

/** An axis-aligned rectangle in view space, origin top left. */
export type Rect = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

/** The axis-aligned bounding box of the quad's four corners. */
export function quadBounds(quad: Quad): Rect {
  const xs = quad.map((p) => p.x);
  const ys = quad.map((p) => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { x: left, y: top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}

/** True when the rectangle lies inside the region, edges included. */
export function rectInside(rect: Rect, region: Rect): boolean {
  return (
    rect.x >= region.x &&
    rect.y >= region.y &&
    rect.x + rect.width <= region.x + region.width &&
    rect.y + rect.height <= region.y + region.height
  );
}

/** Area shared by two rectangles. Zero when they only touch along an edge. */
export function rectOverlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

type Edge = {
  readonly inside: (p: Point) => boolean;
  readonly cross: (from: Point, to: Point) => Point;
};

function verticalEdge(x: number, keepRight: boolean): Edge {
  return {
    inside: (p) => (keepRight ? p.x >= x : p.x <= x),
    cross: (from, to) => ({ x, y: from.y + ((to.y - from.y) * (x - from.x)) / (to.x - from.x) }),
  };
}

function horizontalEdge(y: number, keepBelow: boolean): Edge {
  return {
    inside: (p) => (keepBelow ? p.y >= y : p.y <= y),
    cross: (from, to) => ({ x: from.x + ((to.x - from.x) * (y - from.y)) / (to.y - from.y), y }),
  };
}

/** Sutherland–Hodgman clip of a polygon to a rectangle. Returns a new polygon; the input is never changed. */
export function clipPolygonToRect(polygon: readonly Point[], rect: Rect): Point[] {
  const edges = [
    verticalEdge(rect.x, true),
    verticalEdge(rect.x + rect.width, false),
    horizontalEdge(rect.y, true),
    horizontalEdge(rect.y + rect.height, false),
  ];
  let output: Point[] = [...polygon];
  for (const edge of edges) {
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i += 1) {
      const current = input[i];
      const previous = input[(i + input.length - 1) % input.length];
      const currentIn = edge.inside(current);
      const previousIn = edge.inside(previous);
      if (currentIn) {
        if (!previousIn) output.push(edge.cross(previous, current));
        output.push(current);
      } else if (previousIn) {
        output.push(edge.cross(previous, current));
      }
    }
    if (output.length === 0) break;
  }
  return output;
}

/** Absolute shoelace area of a polygon with any number of corners. */
export function polygonArea(polygon: readonly Point[]): number {
  let twiceArea = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    twiceArea += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twiceArea) / 2;
}

/** Area of the quad polygon that lies inside the rectangle. */
export function quadOverlapArea(quad: Quad, rect: Rect): number {
  return polygonArea(clipPolygonToRect(quad, rect));
}
