import { RotateCcw, RotateCw } from "lucide-react";
import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "../../components/ui";

export interface Edit {
  rotation: number;
  area: Area | null;
  changed: boolean;
}

const ASPECTS = [
  { label: "Original", value: null },
  { label: "Talão estreito", value: 1 / 3 },
  { label: "Talão largo", value: 1 / 2 },
] as const;

/** Preview with crop (zoom) and rotation. The original file is uploaded unless the person edits it. */
export function ImageEditor({ src, onChange }: { src: string; onChange: (edit: Edit) => void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | null>(null);
  const [natural, setNatural] = useState(3 / 4);

  const report = useCallback(
    (area: Area | null, r: number, z: number, a: number | null) =>
      onChange({ rotation: r, area, changed: r !== 0 || z !== 1 || a !== null }),
    [onChange],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[55dvh] overflow-hidden rounded-surface bg-ink">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect ?? natural}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onMediaLoaded={(m) => setNatural(m.naturalWidth / m.naturalHeight)}
          onCropComplete={(_, pixels) => report(pixels, rotation, zoom, aspect)}
          objectFit="contain"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" type="button" onClick={() => setRotation((r) => (r + 270) % 360)} aria-label="Rodar para a esquerda">
          <RotateCcw aria-hidden className="size-5" />
        </Button>
        <Button variant="secondary" type="button" onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Rodar para a direita">
          <RotateCw aria-hidden className="size-5" />
        </Button>
        <fieldset className="flex flex-wrap gap-1">
          <legend className="sr-only">Formato do recorte</legend>
          {ASPECTS.map((a) => (
            <label
              key={a.label}
              className="cursor-pointer rounded-full px-3 py-2 text-sm font-medium ring-1 ring-line has-checked:bg-brand has-checked:text-white has-checked:ring-brand"
            >
              <input type="radio" name="aspect" className="sr-only" checked={aspect === a.value} onChange={() => setAspect(a.value)} />
              {a.label}
            </label>
          ))}
        </fieldset>
      </div>
      <label className="flex items-center gap-3 text-sm text-ink-soft">
        Zoom
        <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-brand" />
      </label>
    </div>
  );
}

/** Render the edited image to a JPEG blob (rotation first, then the crop area). */
export async function renderEdit(src: string, edit: Edit): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  const rad = (edit.rotation * Math.PI) / 180;
  const rotW = Math.abs(Math.cos(rad) * image.width) + Math.abs(Math.sin(rad) * image.height);
  const rotH = Math.abs(Math.sin(rad) * image.width) + Math.abs(Math.cos(rad) * image.height);
  const rotated = document.createElement("canvas");
  rotated.width = Math.round(rotW);
  rotated.height = Math.round(rotH);
  const rctx = rotated.getContext("2d")!;
  rctx.translate(rotW / 2, rotH / 2);
  rctx.rotate(rad);
  rctx.drawImage(image, -image.width / 2, -image.height / 2);

  const area = edit.area ?? { x: 0, y: 0, width: rotated.width, height: rotated.height };
  const out = document.createElement("canvas");
  out.width = Math.round(area.width);
  out.height = Math.round(area.height);
  out.getContext("2d")!.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error("render failed"))), "image/jpeg", 0.92));
}
