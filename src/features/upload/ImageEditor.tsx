import { RotateCcw, RotateCw } from "lucide-react";
import { useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Button } from "../../components/ui";
import type { Edit } from "./edit";

const ASPECTS = [
  { label: "Original", value: null },
  { label: "Talão estreito", value: 1 / 3 },
  { label: "Talão largo", value: 1 / 2 },
] as const;

/**
 * Preview with crop (zoom), rotation and format. The edit belongs to the part, not to this component: it comes in as
 * `value` and every change goes out through `onChange`, so it survives switching, reordering and deleting parts.
 * The original file is uploaded unless the person edits it.
 */
export function ImageEditor({ src, value, onChange }: { src: string; value: Edit; onChange: (edit: Edit) => void }) {
  // Where the image has no format of its own (aspect null) the cropper uses the image's own shape: that comes from the image, not from the edit.
  const [natural, setNatural] = useState(3 / 4);
  // The cropper reports several changes in the same turn (a new crop, then its area): each one builds on the latest.
  const latest = useRef(value);
  latest.current = value;
  const emit = (patch: Partial<Edit>) => {
    latest.current = { ...latest.current, ...patch };
    onChange(latest.current);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[55dvh] overflow-hidden rounded-surface bg-ink">
        <Cropper
          image={src}
          crop={value.crop}
          zoom={value.zoom}
          rotation={value.rotation}
          aspect={value.aspect ?? natural}
          onCropChange={(crop) => emit({ crop })}
          onZoomChange={(zoom) => emit({ zoom })}
          onMediaLoaded={(m) => setNatural(m.naturalWidth / m.naturalHeight)}
          onCropComplete={(_, area) => Object.values(area).every(Number.isFinite) && emit({ area })}
          objectFit="contain"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" type="button" onClick={() => emit({ rotation: (value.rotation + 270) % 360 })} aria-label="Rodar para a esquerda">
          <RotateCcw aria-hidden className="size-5" />
        </Button>
        <Button variant="secondary" type="button" onClick={() => emit({ rotation: (value.rotation + 90) % 360 })} aria-label="Rodar para a direita">
          <RotateCw aria-hidden className="size-5" />
        </Button>
        <fieldset className="flex flex-wrap gap-1">
          <legend className="sr-only">Formato do recorte</legend>
          {ASPECTS.map((a) => (
            <label
              key={a.label}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-medium ring-1 ring-line has-checked:bg-brand has-checked:text-white has-checked:ring-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand dark:has-checked:text-ground"
            >
              <input type="radio" name="aspect" className="sr-only" checked={value.aspect === a.value} onChange={() => emit({ aspect: a.value })} />
              {a.label}
            </label>
          ))}
        </fieldset>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm text-ink-soft">
        Zoom
        <input type="range" min={1} max={4} step={0.05} value={value.zoom} onChange={(e) => emit({ zoom: Number(e.target.value) })} className="h-11 flex-1 accent-brand" />
      </label>
    </div>
  );
}
