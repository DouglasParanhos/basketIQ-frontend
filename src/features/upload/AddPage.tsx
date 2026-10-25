import { ArrowDown, ArrowUp, Camera, FileText, ImageIcon, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Notice, PageHeader, Select, Surface } from "../../components/ui";
import { formatCents, formatDate, MERCHANT_OPTIONS, merchantName } from "../../lib/format";
import { effectiveType, MAX_PHOTOS, validateFile } from "../../lib/upload";
import { ImageEditor, renderEdit, type Edit } from "./ImageEditor";
import { useUpload, type UploadFile } from "./useUpload";

interface Photo {
  id: string;
  file: File;
  type: string;
  previewUrl: string | null;
  previewError: boolean;
  edit: Edit;
}

const SOURCES = [
  { id: "camera", label: "Fotografar", hint: "Use a câmara do telemóvel", icon: Camera, accept: "image/*", capture: true },
  { id: "image", label: "Escolher imagem", hint: "JPEG, PNG ou HEIC", icon: ImageIcon, accept: "image/jpeg,image/png,image/heic,image/heif,.heic,.heif" },
  { id: "pdf", label: "Escolher PDF", hint: "Fatura em PDF da app ou do e-mail", icon: FileText, accept: "application/pdf,.pdf" },
] as const;

const NO_EDIT: Edit = { rotation: 0, area: null, changed: false };

async function previewFor(file: File, type: string): Promise<string | null> {
  if (type === "application/pdf") return null;
  if (type === "image/heic" || type === "image/heif") {
    // Most browsers cannot display HEIC: convert a copy for the preview only.
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    return URL.createObjectURL(Array.isArray(converted) ? converted[0]! : converted);
  }
  return URL.createObjectURL(file);
}

export function AddPage() {
  const navigate = useNavigate();
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [merchant, setMerchant] = useState("");
  const upload = useUpload();
  const urls = useRef<string[]>([]);
  urls.current = photos.flatMap((p) => (p.previewUrl ? [p.previewUrl] : []));
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const active = photos.find((p) => p.id === activeId) ?? photos[0] ?? null;
  const onEdit = useCallback(
    (edit: Edit) => setPhotos((all) => all.map((p) => (p.id === activeId ? { ...p, edit } : p))),
    [activeId],
  );

  async function onPick(file: File | undefined) {
    if (!file) return;
    const type = effectiveType(file);
    const problem =
      validateFile(file) ??
      (photos.length > 0 && type === "application/pdf" ? "Só é possível juntar fotografias a uma fotografia." : null) ??
      (photos.length >= MAX_PHOTOS ? `No máximo ${MAX_PHOTOS} fotos por nota.` : null);
    setFileError(problem);
    if (problem) return;
    upload.reset(); // a different selection is a different upload
    let previewUrl: string | null = null;
    let previewError = false;
    try {
      previewUrl = await previewFor(file, type);
    } catch {
      previewError = true;
    }
    const photo: Photo = { id: crypto.randomUUID(), file, type, previewUrl, previewError, edit: NO_EDIT };
    setPhotos((all) => [...all, photo]);
    setActiveId(photo.id);
  }

  function remove(id: string) {
    const gone = photos.find((p) => p.id === id);
    if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
    upload.reset();
    setPhotos((all) => all.filter((p) => p.id !== id));
  }

  function move(id: string, by: -1 | 1) {
    upload.reset();
    setPhotos((all) => {
      const from = all.findIndex((p) => p.id === id);
      const to = from + by;
      if (to < 0 || to >= all.length) return all;
      const next = [...all];
      [next[from], next[to]] = [next[to]!, next[from]!];
      return next;
    });
  }

  async function submit(allowDuplicate = false) {
    if (photos.length === 0) return;
    const files: UploadFile[] = [];
    for (const p of photos) {
      if (p.previewUrl && p.edit.changed) {
        files.push({ blob: await renderEdit(p.previewUrl, p.edit), filename: p.file.name.replace(/\.[^.]+$/, "") + ".jpg", contentType: "image/jpeg" });
      } else {
        files.push({ blob: p.file, filename: p.file.name, contentType: p.type });
      }
    }
    const id = await upload.start(files, merchant || null, allowDuplicate);
    if (id) navigate(`/compras/${id}`);
  }

  const busy = ["hashing", "uploading", "starting"].includes(upload.phase);
  const canAddPhoto = photos.length > 0 && photos.every((p) => p.type !== "application/pdf") && photos.length < MAX_PHOTOS;

  return (
    <>
      <PageHeader title="Adicionar compra" />
      {SOURCES.map((s) => (
        <input
          key={s.id}
          ref={(el) => {
            inputs.current[s.id] = el;
          }}
          type="file"
          accept={s.accept}
          capture={"capture" in s ? "environment" : undefined}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          data-testid={`input-${s.id}`}
          onChange={(e) => {
            void onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      ))}

      {photos.length === 0 && (
        <div className="flex flex-col gap-3">
          <p className="pb-2 text-ink-soft">Uma nota de cada vez. Se for muito comprida, pode juntar várias fotos.</p>
          {SOURCES.map(({ id, label, hint, icon: Icon }, i) => (
            <button
              key={id}
              type="button"
              onClick={() => inputs.current[id]?.click()}
              className={`flex min-h-20 items-center gap-4 rounded-surface p-4 text-left ${
                i === 0 ? "bg-brand text-white dark:text-ground" : "bg-paper text-ink ring-1 ring-inset ring-line"
              }`}
            >
              <Icon aria-hidden className="size-7 shrink-0" />
              <span className="flex flex-col">
                <span className="text-lg font-bold">{label}</span>
                <span className={i === 0 ? "text-white/80 dark:text-ground/80" : "text-sm text-ink-soft"}>{hint}</span>
              </span>
            </button>
          ))}
          {fileError && <Notice tone="error">{fileError}</Notice>}
          <p className="pt-2 text-sm text-ink-soft">
            Para uma boa leitura: nota inteira na imagem, sobre um fundo escuro, sem sombras nem reflexos.
          </p>
        </div>
      )}

      {photos.length > 0 && active && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <ul className="flex flex-col gap-2" aria-label="Fotos da nota">
            {photos.map((p, i) => (
              <li key={p.id}>
                <Surface className={`flex items-center justify-between gap-2 ${p.id === active.id ? "ring-2 ring-brand" : ""}`}>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setActiveId(p.id)} aria-current={p.id === active.id}>
                    <p className="truncate font-semibold">{photos.length > 1 ? `Foto ${i + 1}: ${p.file.name}` : p.file.name}</p>
                    <p className="text-sm text-ink-soft">{(p.file.size / 1024 / 1024).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} MB</p>
                  </button>
                  {photos.length > 1 && (
                    <>
                      <Button type="button" variant="quiet" aria-label={`Subir a foto ${i + 1}`} disabled={busy || i === 0} onClick={() => move(p.id, -1)}>
                        <ArrowUp aria-hidden className="size-5" />
                      </Button>
                      <Button type="button" variant="quiet" aria-label={`Descer a foto ${i + 1}`} disabled={busy || i === photos.length - 1} onClick={() => move(p.id, 1)}>
                        <ArrowDown aria-hidden className="size-5" />
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="quiet"
                    aria-label={photos.length > 1 ? `Remover a foto ${i + 1}` : "Escolher outro ficheiro"}
                    disabled={busy}
                    onClick={() => remove(p.id)}
                  >
                    <X aria-hidden className="size-5" />
                  </Button>
                </Surface>
              </li>
            ))}
          </ul>

          {active.previewUrl && <ImageEditor key={active.id} src={active.previewUrl} onChange={onEdit} />}
          {active.previewError && (
            <Notice tone="info">Não é possível pré-visualizar esta imagem neste navegador. Pode enviá-la na mesma.</Notice>
          )}

          {canAddPhoto && (
            <div className="flex flex-col gap-2 rounded-surface bg-paper p-4 ring-1 ring-inset ring-line">
              <p className="font-semibold">Nota comprida? Tire mais fotos.</p>
              <p className="text-sm text-ink-soft">
                Em cada nova foto, deixe visíveis os 2 ou 3 últimos produtos da foto anterior: assim juntamos as fotos sem repetir nem
                perder linhas.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => inputs.current.camera?.click()}>
                  <Camera aria-hidden className="size-5" /> Fotografar mais
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => inputs.current.image?.click()}>
                  <Plus aria-hidden className="size-5" /> Escolher outra foto
                </Button>
              </div>
              {fileError && <Notice tone="error">{fileError}</Notice>}
            </div>
          )}

          <Select label="Loja (opcional)" value={merchant} onChange={(e) => setMerchant(e.target.value)} disabled={busy}>
            <option value="">Detetar automaticamente</option>
            {MERCHANT_OPTIONS.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>

          {upload.phase === "uploading" && (
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>{photos.length > 1 ? `A enviar a foto ${upload.photo + 1} de ${photos.length}` : "A enviar"}</span>
                <span>{Math.round(upload.progress * 100)} %</span>
              </div>
              <progress className="h-2 w-full accent-brand" max={1} value={upload.progress} aria-label="Progresso do envio" />
            </div>
          )}

          {upload.phase === "duplicate" && (
            <Notice
              tone="warning"
              title="Esta nota parece já ter sido importada"
              action={
                <>
                  <Button type="button" variant="secondary" onClick={() => void submit(true)}>
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

          <Button type="submit" busy={busy} disabled={upload.phase === "duplicate"}>
            {upload.phase === "failed" ? "Tentar novamente" : busy ? "A enviar…" : "Enviar nota"}
          </Button>
        </form>
      )}
    </>
  );
}
