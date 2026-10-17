import { Camera, FileText, ImageIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Notice, PageHeader, Select, Surface } from "../../components/ui";
import { formatCents, formatDate, merchantName } from "../../lib/format";
import { effectiveType, validateFile } from "../../lib/upload";
import { ImageEditor, renderEdit, type Edit } from "./ImageEditor";
import { useUpload } from "./useUpload";

interface Selected {
  file: File;
  type: string;
  previewUrl: string | null;
  previewError: boolean;
}

const SOURCES = [
  { id: "camera", label: "Fotografar", hint: "Use a câmara do telemóvel", icon: Camera, accept: "image/*", capture: true },
  { id: "image", label: "Escolher imagem", hint: "JPEG, PNG ou HEIC", icon: ImageIcon, accept: "image/jpeg,image/png,image/heic,image/heif,.heic,.heif" },
  { id: "pdf", label: "Escolher PDF", hint: "Fatura em PDF da app ou do e-mail", icon: FileText, accept: "application/pdf,.pdf" },
] as const;

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
  const [selected, setSelected] = useState<Selected | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [merchant, setMerchant] = useState("");
  const [edit, setEdit] = useState<Edit>({ rotation: 0, area: null, changed: false });
  const upload = useUpload();

  useEffect(() => () => void (selected?.previewUrl && URL.revokeObjectURL(selected.previewUrl)), [selected]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    const problem = validateFile(file);
    setFileError(problem);
    if (problem) return;
    upload.reset();
    const type = effectiveType(file);
    let previewUrl: string | null = null;
    let previewError = false;
    try {
      previewUrl = await previewFor(file, type);
    } catch {
      previewError = true;
    }
    setEdit({ rotation: 0, area: null, changed: false });
    setSelected({ file, type, previewUrl, previewError });
  }

  async function submit(allowDuplicate = false) {
    if (!selected) return;
    let blob: Blob = selected.file;
    let name = selected.file.name;
    let type = selected.type;
    if (selected.previewUrl && edit.changed) {
      blob = await renderEdit(selected.previewUrl, edit);
      name = name.replace(/\.[^.]+$/, "") + ".jpg";
      type = "image/jpeg";
    }
    const id = await upload.start(blob, name, type, merchant || null, allowDuplicate);
    if (id) navigate(`/compras/${id}`);
  }

  const busy = ["hashing", "uploading", "starting"].includes(upload.phase);

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

      {!selected && (
        <div className="flex flex-col gap-3">
          <p className="pb-2 text-ink-soft">Uma nota de cada vez. Pode sair do ecrã enquanto é processada.</p>
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

      {selected && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Surface className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{selected.file.name}</p>
              <p className="text-sm text-ink-soft">{(selected.file.size / 1024 / 1024).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} MB</p>
            </div>
            <Button
              type="button"
              variant="quiet"
              aria-label="Escolher outro ficheiro"
              disabled={busy}
              onClick={() => {
                setSelected(null);
                upload.reset();
              }}
            >
              <X aria-hidden className="size-5" />
            </Button>
          </Surface>

          {selected.previewUrl && <ImageEditor src={selected.previewUrl} onChange={setEdit} />}
          {selected.previewError && (
            <Notice tone="info">Não é possível pré-visualizar esta imagem neste navegador. Pode enviá-la na mesma.</Notice>
          )}

          <Select label="Supermercado (opcional)" value={merchant} onChange={(e) => setMerchant(e.target.value)} disabled={busy}>
            <option value="">Detetar automaticamente</option>
            <option value="CONTINENTE">Continente</option>
            <option value="PINGO_DOCE">Pingo Doce</option>
            <option value="LIDL">Lidl</option>
            <option value="AUCHAN">Auchan</option>
          </Select>

          {upload.phase === "uploading" && (
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>A enviar</span>
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
