import { RotateCcw, RotateCw, Undo2 } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "../../components/ui";
import { mapQuad, rectQuad, type Point, type Quad } from "../capture/homography";
import type { Edit } from "./edit";

/** The whole photo: where the corners start without a receipt found. */
const WHOLE = rectQuad(0, 0, 1, 1);
const NAMES = ["superior esquerdo", "superior direito", "inferior direito", "inferior esquerdo"] as const;
const STEP = 0.01; // an arrow moves a corner this share of the photo
const BIG_STEP = 0.05; // with Shift
const LOUPE = 96; // CSS pixels of the loupe while a corner is dragged
const ZOOM = 2; // how much the loupe enlarges

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** A point of the photo (shares of it) as seen after `turns` quarter turns clockwise; `4 - turns` turns it back. */
function toView([x, y]: Point, turns: number): Point {
  return ([[x, y], [1 - y, x], [1 - x, 1 - y], [y, 1 - x]] as const)[turns % 4]!;
}

/**
 * The photo with the four corners of the receipt to drag (or move with the arrows), and the rotation. The
 * corners start where the receipt was found (`found`); the edit belongs to the part (`value`/`onChange`), as
 * in the spec 013 editor. The corners are kept in the photo's own terms, so they stay on the receipt when it turns.
 */
export function QuadEditor({ src, value, found, onChange }: { src: string; value: Edit; found: Quad | null; onChange: (edit: Edit) => void }) {
  const area = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const loupe = useRef<HTMLCanvasElement>(null);
  const [natural, setNatural] = useState({ width: 3, height: 4 });
  const [dragging, setDragging] = useState<number | null>(null);
  const turns = (((value.rotation / 90) % 4) + 4) % 4;
  const sideways = turns % 2 === 1;
  const corners = value.corners ?? found ?? WHOLE;
  const seen = corners.map((p) => toView(p, turns));
  const aspect = sideways ? natural.height / natural.width : natural.width / natural.height;

  const move = (i: number, point: Point) => {
    const moved = toView([clamp(point[0]), clamp(point[1])], 4 - turns);
    onChange({ ...value, corners: mapQuad(corners, (p, j) => (j === i ? moved : p)) });
  };

  const onKey = (i: number, e: KeyboardEvent) => {
    const step = e.shiftKey ? BIG_STEP : STEP;
    const by = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, Point>)[e.key];
    if (!by) return;
    e.preventDefault();
    move(i, [seen[i]![0] + by[0], seen[i]![1] + by[1]]);
  };

  const onDrag = (i: number, e: PointerEvent) => {
    if (dragging !== i || !area.current) return;
    const rect = area.current.getBoundingClientRect();
    move(i, [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height]);
  };

  // The loupe: the photo around the corner being dragged, enlarged, turned as it is seen.
  useEffect(() => {
    const c = loupe.current;
    const img = image.current;
    const box = area.current;
    if (dragging === null || !c || !img?.naturalWidth || !box) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const scale = window.devicePixelRatio || 1;
    if (c.width !== LOUPE * scale) c.width = c.height = LOUPE * scale; // resizing clears and reallocates: once
    const shown = box.getBoundingClientRect().width / (sideways ? img.naturalHeight : img.naturalWidth); // CSS px per photo px
    const half = LOUPE / 2 / ZOOM / shown; // photo px around the corner
    const [x, y] = corners[dragging]!;
    // Only the part of the square inside the photo is drawn (Safari draws nothing for a source outside it).
    const [cx, cy] = [x * img.naturalWidth, y * img.naturalHeight];
    const [sx, sy] = [Math.max(0, cx - half), Math.max(0, cy - half)];
    const [ex, ey] = [Math.min(img.naturalWidth, cx + half), Math.min(img.naturalHeight, cy + half)];
    const k = c.width / (2 * half); // loupe px per photo px
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((turns * Math.PI) / 2);
    if (ex > sx && ey > sy) ctx.drawImage(img, sx, sy, ex - sx, ey - sy, (sx - cx) * k, (sy - cy) * k, (ex - sx) * k, (ey - sy) * k);
    ctx.restore();
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = scale;
    ctx.beginPath();
    ctx.moveTo(c.width / 2, 0);
    ctx.lineTo(c.width / 2, c.height);
    ctx.moveTo(0, c.height / 2);
    ctx.lineTo(c.width, c.height / 2);
    ctx.stroke();
  }, [dragging, corners, turns, sideways]);

  const rotate = (by: number) => onChange({ ...value, rotation: (value.rotation + by) % 360 });
  const outline = seen.map(([u, v]) => `${u},${v}`).join(" ");
  return (
    <div className="flex flex-col gap-3">
      <div className="relative grid h-[55dvh] place-items-center overflow-hidden rounded-surface bg-ink p-6">
        <div className="size-full" style={{ containerType: "size" }}>
          <div ref={area} className="relative mx-auto" style={{ width: `min(100cqw, ${aspect} * 100cqh)`, aspectRatio: aspect, containerType: "size" }}>
            <img
              ref={image}
              src={src}
              alt=""
              onLoad={(e) => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
              className="absolute top-1/2 left-1/2 max-w-none"
              style={{
                width: sideways ? "100cqh" : "100cqw",
                height: sideways ? "100cqw" : "100cqh",
                transform: `translate(-50%, -50%) rotate(${turns * 90}deg)`,
              }}
            />
            <svg aria-hidden viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
              <path d={`M0,0H1V1H0Z M${outline.replaceAll(" ", " L")}Z`} fillRule="evenodd" className="fill-black/50" />
              <polygon points={outline} vectorEffect="non-scaling-stroke" className="fill-none stroke-yellow-300 stroke-2" />
            </svg>
            {seen.map(([u, v], i) => (
              <button
                key={i}
                type="button"
                aria-label={`Canto ${NAMES[(i + turns) % 4]}`}
                className="absolute inline-flex size-11 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white"
                style={{ left: `${+(u * 100).toFixed(3)}%`, top: `${+(v * 100).toFixed(3)}%` }}
                onKeyDown={(e) => onKey(i, e)}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging(i);
                }}
                onPointerMove={(e) => onDrag(i, e)}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
              >
                <span className="size-5 rounded-full border-2 border-white bg-yellow-300 shadow" />
              </button>
            ))}
          </div>
        </div>
        {dragging !== null && (
          <canvas
            ref={loupe}
            aria-hidden
            className={`pointer-events-none absolute top-2 rounded-full border-2 border-white ${seen[dragging]![0] < 0.5 ? "right-2" : "left-2"}`}
            style={{ width: LOUPE, height: LOUPE }}
          />
        )}
      </div>
      <p className="text-sm text-ink-soft">Arraste os cantos até às pontas do talão.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" type="button" onClick={() => rotate(270)} aria-label="Rodar para a esquerda">
          <RotateCcw aria-hidden className="size-5" />
        </Button>
        <Button variant="secondary" type="button" onClick={() => rotate(90)} aria-label="Rodar para a direita">
          <RotateCw aria-hidden className="size-5" />
        </Button>
        <Button variant="secondary" type="button" disabled={value.corners === null} onClick={() => onChange({ ...value, corners: null })}>
          <Undo2 aria-hidden className="size-5" /> Repor cantos
        </Button>
      </div>
    </div>
  );
}
