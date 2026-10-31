import { ArrowDown, ArrowUp, FileText } from "lucide-react";
import { Button } from "../../components/ui";
import type { Part } from "./photos";

/** One part of the receipt: its preview, its number and its actions (crop, delete, move). */
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
  return (
    <li className="flex flex-col gap-2">
      <div className="grid h-64 place-items-center overflow-hidden rounded-surface bg-ink">
        {part.previewUrl ? (
          <img src={part.previewUrl} alt="" className="size-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 px-3 text-center text-sm text-white/80">
            <FileText aria-hidden className="size-8" />
            {part.type === "application/pdf" ? "PDF" : "Sem pré-visualização"}
          </span>
        )}
      </div>
      {part.previewError && <p className="text-sm text-ink-soft">Não é possível pré-visualizar esta imagem neste navegador. Pode enviá-la na mesma.</p>}
      <div className="min-w-0">
        <p className="font-bold">Parte {n}</p>
        <p className="truncate text-sm text-ink-soft">{part.file.name}</p>
        <p className="text-xs text-ink-soft">{(part.file.size / 1024 / 1024).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} MB</p>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {part.previewUrl && (
          <Button type="button" variant="secondary" className="px-2" data-part-edit={part.id} aria-label={`Recortar a parte ${n}`} disabled={disabled} onClick={onEdit}>
            Recortar
          </Button>
        )}
        <Button type="button" variant="dangerQuiet" className="px-2" aria-label={`Apagar a parte ${n}`} disabled={disabled} onClick={onRemove}>
          Apagar
        </Button>
        {count > 1 && (
          <>
            <Button type="button" variant="quiet" aria-label={`Subir a parte ${n}`} disabled={disabled || index === 0} onClick={() => onMove(-1)}>
              <ArrowUp aria-hidden className="size-5" />
            </Button>
            <Button type="button" variant="quiet" aria-label={`Descer a parte ${n}`} disabled={disabled || index === count - 1} onClick={() => onMove(1)}>
              <ArrowDown aria-hidden className="size-5" />
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
