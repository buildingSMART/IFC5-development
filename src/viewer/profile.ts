type Point = [number, number];

interface Polyline {
  "bsi::ifc::geometry::procedural::polyline": {
    Points: Point[];
  };
}

interface CircularArc {
  "bsi::ifc::geometry::procedural::circular_arc": {
    Points: [Point, Point, Point];
  };
}

interface CompositeCurve {
  "bsi::ifc::geometry::procedural::composite_curve": {
    Segments: Array<Polyline | CircularArc>;
  };
}

interface Rectangle {
  "bsi::ifc::geometry::procedural::rectangle": {
    position?: { Location?: Point };
    Width: number;
    Height: number;
  };
}

export type Profile =
  | { "bsi::ifc::geometry::procedural::composite_profile": { Profiles: Profile[] } }
  | { "bsi::ifc::geometry::procedural::profile_with_voids": { exterior: Profile; Interior?: Profile[] } }
  | Rectangle
  | CompositeCurve
  | Polyline;

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function newBounds(): Bounds {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}
function addPt(b: Bounds, p: Point) {
  b.minX = Math.min(b.minX, p[0]);
  b.minY = Math.min(b.minY, p[1]);
  b.maxX = Math.max(b.maxX, p[0]);
  b.maxY = Math.max(b.maxY, p[1]);
}

function threePointArcParams(p0: Point, pm: Point, p1: Point) {
  const [x1, y1] = p0; const [x2, y2] = pm; const [x3, y3] = p1;
  const a = x1 * (y2 - y3) - y1 * (x2 - x3) + x2 * y3 - x3 * y2;

  const x1sqy1sq = x1 * x1 + y1 * y1;
  const x2sqy2sq = x2 * x2 + y2 * y2;
  const x3sqy3sq = x3 * x3 + y3 * y3;
  const bx = x1sqy1sq * (y2 - y3) + x2sqy2sq * (y3 - y1) + x3sqy3sq * (y1 - y2);
  const by = x1sqy1sq * (x3 - x2) + x2sqy2sq * (x1 - x3) + x3sqy3sq * (x2 - x1);
  const cx = -bx / (2 * a);
  const cy = -by / (2 * a);
  const r = Math.hypot(x1 - cx, y1 - cy);

  const aStart = Math.atan2(y1 - cy, x1 - cx);
  const aMid   = Math.atan2(y2 - cy, x2 - cx);
  const aEnd   = Math.atan2(y3 - cy, x3 - cx);

  // Choose direction so mid-angle lies on the arc sweep
  const norm = (t: number) => (t + 2 * Math.PI) % (2 * Math.PI);
  const dCCW = norm(aEnd - aStart);
  const onCCW = norm(aMid - aStart) <= dCCW;
  const ccw = onCCW;
  const sweepAngle = ccw ? dCCW : norm(aStart - aEnd);
  const largeArcFlag = sweepAngle <= Math.PI ? 1 : 0;

  // Because we flip Y later via scale(1, -1), use sweepFlag=1 for math-CCW
  const sweepFlag = !ccw ? 1 : 0;

  return { r, largeArcFlag, sweepFlag };
}

function polylinePath(points: Point[], bounds: Bounds): string {
  if (!points.length) return "";
  points.forEach(p => addPt(bounds, p));
  const [x0, y0] = points[0];
  const moves = [`M ${x0} ${y0}`];
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    moves.push(`L ${x} ${y}`);
  }
  return moves.join(" ");
}

function arcPath(arc: CircularArc["bsi::ifc::geometry::procedural::circular_arc"], bounds: Bounds): string {
  const [p0, pm, p1] = arc.Points;
  addPt(bounds, p0); addPt(bounds, pm); addPt(bounds, p1);
  const { r, largeArcFlag, sweepFlag } = threePointArcParams(p0, pm, p1);
  return `M ${p0[0]} ${p0[1]} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${p1[0]} ${p1[1]}`;
}

function rectanglePath(rect: Rectangle["bsi::ifc::geometry::procedural::rectangle"], bounds: Bounds): string {
  let [x, y] = rect.position?.Location ?? [0, 0];
  const w = rect.Width, h = rect.Height;
  x -= w / 2.;
  y -= h / 2.;
  addPt(bounds, [x, y]);
  addPt(bounds, [x + w, y + h]);
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

function renderProfileToPaths(profile: Profile, bounds: Bounds, out: string[]): void {
  const k = Object.keys(profile)[0] as keyof Profile;
  const v: any = (profile as any)[k];

  switch (k) {
    case "bsi::ifc::geometry::procedural::polyline": {
      const d = polylinePath(v.Points, bounds);
      if (d) out.push(d);
      return;
    }
    case "bsi::ifc::geometry::procedural::circular_arc": {
      const d = arcPath(v, bounds);
      if (d) out.push(d);
      return;
    }
    case "bsi::ifc::geometry::procedural::composite_curve": {
      const segs: Array<Polyline | CircularArc> = v.Segments ?? [];
      for (const seg of segs) {
        const sk = Object.keys(seg)[0];
        const sv: any = (seg as any)[sk];
        if (sk === "bsi::ifc::geometry::procedural::polyline") {
          const d = polylinePath(sv.Points, bounds);
          if (d) out.push(d);
        } else if (sk === "bsi::ifc::geometry::procedural::circular_arc") {
          const d = arcPath(sv, bounds);
          if (d) out.push(d);
        }
      }
      return;
    }
    case "bsi::ifc::geometry::procedural::rectangle": {
      const d = rectanglePath(v, bounds);
      out.push(d);
      return;
    }
    case "bsi::ifc::geometry::procedural::profile_with_voids": {
      // Stroke-only: render exterior and each interior as separate paths
      renderProfileToPaths(v.exterior, bounds, out);
      (v.Interior ?? []).forEach((p: Profile) => renderProfileToPaths(p, bounds, out));
      return;
    }
    case "bsi::ifc::geometry::procedural::composite_profile": {
      (v.Profiles ?? []).forEach((p: Profile) => renderProfileToPaths(p, bounds, out));
      return;
    }
    default:
      return;
  }
}

export interface SvgOptions {
  stroke?: string;
  strokeWidth?: number;
  pixelSize?: number;
  pad?: number;
}

/**
 * Build a stroke-only SVG string from the procedural geometry.
 */
export function buildSVGFromProceduralGeometry(
  input: Profile,
  opts: SvgOptions = {}
): string {
  const stroke = opts.stroke ?? "black";
  const strokeWidth = opts.strokeWidth ?? 0.0008;
  const pad = opts.pad ?? 0.002;
  const pixelSize = opts.pixelSize ?? 512;

  const bounds = newBounds();
  const pathDs: string[] = [];

  renderProfileToPaths(input, bounds, pathDs);

  if (!pathDs.length || !isFinite(bounds.minX)) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 10 10"/>`;
  }

  // Pad bounds
  const minX = bounds.minX - pad;
  const minY = bounds.minY - pad;
  const maxX = bounds.maxX + pad;
  const maxY = bounds.maxY + pad;

  const width = maxX - minX;
  const height = maxY - minY;

  const tx = -minX;
  const ty = -minY;

  const paths = pathDs.map(d => `<path d="${d}" fill="none"/>`).join("\n    ");

  return `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${pixelSize}" height="${pixelSize}"
     viewBox="0 0 ${width} ${height}">
  <g transform="translate(${tx}, ${ty})"
     stroke="${stroke}" stroke-width="${strokeWidth}">
    ${paths}
  </g>
</svg>`.trim();
}
