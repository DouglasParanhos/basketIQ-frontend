import { ArrowDown, ArrowUp, Crop, FileText, Trash2 } from "lucide-react";
import { Button, ROUND_DANGER, ROUND_NEUTRAL } from "../../components/ui";
import { FlatPreview } from "./FlatPreview";
import type { Part } from "./photos";

/** One part of the receipt: its preview (the receipt straightened when its corners are known), its number and its actions (crop, delete, move). */
export function PartCard({
  part,
  index,
  count,
  disabled,
  onEdit,
  onRemove,
  onMove,
}: {
  part: Part;
  index: number;
  count: number;
  disabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMove: (by: -1 | 1) => void;
}) {
  const n = index + 1;
  const flat = part.edit.corners ?? part.quad; // the receipt straightened, as it will be read
  return (
    <li className="flex flex-col gap-2">
      <div className="grid h-[250px] place-items-center overflow-hidden rounded-[18px] bg-ink">
        {part.previewUrl ? (
          flat ? (
            <FlatPreview src={part.previewUrl} quad={flat} />
          ) : (
            <img src={part.previewUrl} alt="" className="size-full object-contain" />
          )
        ) : (
          <span className="flex flex-col items-center gap-1 px-3 text-center text-sm text-white/80">
            <FileText aria-hidden className="size-8" />
            {part.type === "application/pdf" ? "PDF" : "Sem pré-visualização"}
          </span>
        )}
      </div>
      {part.previewError && <p className="text-sm text-ink-soft">Não é possível pré-visualizar esta imagem neste navegador. Pode enviá-la na mesma.</p>}
      <div className="flex items-center justify-between gap-1">
        <p className="text-sm font-bold">Parte {n}</p>
        <div className="flex gap-1">
          {part.previewUrl && (
            <button type="button" className={ROUND_NEUTRAL} data-part-edit={part.id} aria-label={`Recortar a parte ${n}`} disabled={disabled} onClick={onEdit}>
              <Crop aria-hidden className="size-5" />
            </button>
          )}
          <button type="button" className={ROUND_DANGER} aria-label={`Apagar a parte ${n}`} disabled={disabled} onClick={onRemove}>
            <Trash2 aria-hidden className="size-5" />
          </button>
        </div>
      </div>
      <div className="flex gap-1 text-xs text-ink-soft">
        <p className="min-w-0 truncate">{part.file.name}</p>
        <p className="shrink-0">· {(part.file.size / 1024 / 1024).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} MB</p>
      </div>
      {count > 1 && (
        <div className="grid grid-cols-2 gap-1">
          <Button type="button" variant="quiet" aria-label={`Subir a parte ${n}`} disabled={disabled || index === 0} onClick={() => onMove(-1)}>
            <ArrowUp aria-hidden className="size-5" />
          </Button>
          <Button type="button" variant="quiet" aria-label={`Descer a parte ${n}`} disabled={disabled || index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown aria-hidden className="size-5" />
          </Button>
        </div>
      )}
    </li>
  );
}
