import { Camera, ChevronLeft, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { FullScreen } from "../../components/FullScreen";
import { Button, Notice, ROUND_NEUTRAL } from "../../components/ui";
import { formatCents, formatDate, formatPercent } from "../../lib/format";
import { merchantName } from "../../lib/merchants";
import { stillText } from "../capture/hints";
import { MAX_PHOTOS } from "../../lib/upload";
import type { Edit } from "./edit";
import { MerchantField } from "./MerchantPicker";
import { PartCard } from "./PartCard";
import { PartEditor } from "./PartEditor";
import { nextPartText, type Part } from "./photos";
import type { useUpload } from "./useUpload";

/** Where the focus goes after the parts change: the screen title, or the «Recortar» of a part. */
export type FocusTarget = { to: "title" } | { to: "part"; id: string };

type Upload = ReturnType<typeof useUpload>;

const FORM_ID = "parts-form";

/** «Confirme as partes»: every part with its preview, adding another, the store, and the send. */
export function PartsScreen(props: {
  parts: Part[];
  editingId: string | null;
  merchant: string;
  fileError: string | null;
  confirmingDiscard: boolean;
  upload: Upload;
  focus: FocusTarget | null;
  onFocused: () => void;
  onMerchant: (merchant: string) => void;
  onAddCamera: () => void;
  onAddGallery: () => void;
  onEdit: (id: string | null) => void;
  onEditChange: (edit: Edit) => void;
  onRemove: (id: string) => void;
  onRetake: (id: string) => void;
  onMove: (id: string, by: -1 | 1) => void;
  onLeave: () => void;
  onKeep: () => void;
  onDiscard: () => void;
  onSubmit: (allowDuplicate?: boolean) => void;
}) {
  const { parts, editingId, upload, focus } = props;
  const title = useRef<HTMLHeadingElement>(null);
  const busy = ["hashing", "uploading", "starting"].includes(upload.phase);
  const hasPdf = parts.some((p) => p.type === "application/pdf");
  const atLimit = parts.length >= MAX_PHOTOS;
  // The last photo already holds the whole receipt: another part is possible but not asked for.
  const complete = !!parts.at(-1)?.whole;
  const editing = parts.findIndex((p) => p.id === editingId);

  // The first time the screen opens the focus goes to its title.
  useEffect(() => title.current?.focus(), []);
  // After a part is added, deleted or edited, the focus goes where the person was working.
  useEffect(() => {
    if (!focus) return;
    const target = focus.to === "part" ? document.querySelector<HTMLElement>(`[data-part-edit="${focus.id}"]`) : null;
    (target ?? title.current)?.focus();
    props.onFocused();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per focus request
  }, [focus]);
  useEffect(() => {
    if (props.confirmingDiscard) document.querySelector<HTMLElement>("[data-keep-editing]")?.focus();
  }, [props.confirmingDiscard]);

  return (
    <FullScreen
      title="Confirme as partes"
      titleRef={title}
      start={
        <button type="button" className={ROUND_NEUTRAL} aria-label="Voltar" disabled={busy} onClick={props.onLeave}>
          <ChevronLeft aria-hidden className="size-6" />
        </button>
      }
      footer={
        editing < 0 && (
          <>
            <Button type="submit" form={FORM_ID} size="lg" className="w-full" busy={busy} disabled={upload.phase === "duplicate"}>
              {upload.phase === "failed" ? "Tentar novamente" : busy ? "A enviar…" : parts.length > 1 ? `Enviar talão · ${parts.length} fotos` : "Enviar talão"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={props.onLeave}>
              Cancelar
            </Button>
          </>
        )
      }
    >
      {props.confirmingDiscard && (
        <Notice
          tone="warning"
          title={`Descartar as ${parts.length} ${parts.length === 1 ? "foto" : "fotos"}?`}
          action={
            <>
              <Button type="button" variant="danger" onClick={props.onDiscard}>
                Descartar
              </Button>
              <Button type="button" variant="secondary" data-keep-editing onClick={props.onKeep}>
                Continuar a editar
              </Button>
            </>
          }
        />
      )}

      {editing >= 0 ? (
        <PartEditor part={parts[editing]!} index={editing} onChange={props.onEditChange} onDone={() => props.onEdit(null)} />
      ) : (
        <form
          id={FORM_ID}
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            props.onSubmit();
          }}
        >
          <ul aria-label="Partes do talão" className="grid grid-cols-2 gap-3">
            {parts.map((part, i) => (
              <PartCard
                key={part.id}
                part={part}
                index={i}
                count={parts.length}
                disabled={busy}
                onEdit={() => props.onEdit(part.id)}
                onRemove={() => props.onRemove(part.id)}
                onMove={(by) => props.onMove(part.id, by)}
              />
            ))}
          </ul>

          {/* What the backend would warn about a photo: said before sending, never blocking it (US5). */}
          {parts.map(
            (part, i) =>
              part.warnings.length > 0 && (
                <Notice
                  key={part.id}
                  tone="warning"
                  title={`A parte ${i + 1} pode ser melhorada`}
                  action={
                    <Button type="button" variant="secondary" aria-label={`Fotografar de novo a parte ${i + 1}`} disabled={busy} onClick={() => props.onRetake(part.id)}>
                      <Camera aria-hidden className="size-5" /> Fotografar de novo
                    </Button>
                  }
                >
                  {stillText(part.warnings)} Pode enviá-la na mesma.
                </Notice>
              ),
          )}

          {props.fileError && <Notice tone="error">{props.fileError}</Notice>}

          {!hasPdf && (
            <div className="flex flex-col gap-2">
              {!atLimit && (
                <p id="next-part" className="text-sm font-semibold">
                  {complete ? "O talão parece completo nesta foto: pode enviar." : nextPartText(parts)}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-[3.25rem] border-dashed"
                aria-describedby={atLimit ? undefined : "next-part"}
                disabled={busy || atLimit}
                onClick={props.onAddCamera}
              >
                <Plus aria-hidden className="size-5" /> Adicionar outra parte
              </Button>
              <Button type="button" variant="quiet" disabled={busy || atLimit} onClick={props.onAddGallery}>
                <Camera aria-hidden className="size-5" /> Escolher da galeria
              </Button>
              {atLimit && <p className="text-sm text-ink-soft">No máximo {MAX_PHOTOS} fotos por talão.</p>}
            </div>
          )}

          <MerchantField value={props.merchant} onChange={props.onMerchant} disabled={busy} />

          {parts.length > 1 && (
            <p className="text-sm text-ink-soft">
              Juntamos as {parts.length} fotos num só talão antes de enviar. Se as partes se sobrepuserem, cuidamos das linhas repetidas.
            </p>
          )}

          {upload.phase === "uploading" && (
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>{parts.length > 1 ? `A enviar a foto ${upload.photo + 1} de ${parts.length}` : "A enviar"}</span>
                <span>{formatPercent(Math.round(upload.progress * 100))}</span>
              </div>
              <progress className="h-2 w-full accent-brand" max={1} value={upload.progress} aria-label="Progresso do envio" />
            </div>
          )}

          {upload.phase === "duplicate" && (
            <Notice
              tone="warning"
              title="Este talão parece já ter sido importado"
              action={
                <>
                  <Button type="button" variant="secondary" onClick={() => props.onSubmit(true)}>
                    Guardar nova versão
                  </Button>
                  {upload.duplicate && (
                    <Link className="inline-flex min-h-12 items-center px-2 font-semibold text-brand underline" to={`/compras/${upload.duplicate.receipt_id}`}>
                      Ver a compra existente
                    </Link>
                  )}
                </>
              }
            >
              {upload.duplicate && (
                <>
                  {merchantName(upload.duplicate.merchant)}, {formatDate(upload.duplicate.purchase_at)}, {formatCents(upload.duplicate.total_cents)}.
                </>
              )}{" "}
              Se não quiser importar de novo, escolha outro ficheiro.
            </Notice>
          )}

          {upload.phase === "failed" && (
            <Notice tone="error" title="O envio não terminou">
              {upload.error} {upload.hasPending() && "A compra fica guardada e o envio retoma de onde parou."}
            </Notice>
          )}

        </form>
      )}
    </FullScreen>
  );
}
