import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Notice } from "../../components/ui";
import { effectiveType, validateFile } from "../../lib/upload";
import type { Edit } from "./edit";
import { MerchantChips } from "./MerchantPicker";
import { PartsScreen, type FocusTarget } from "./PartsScreen";
import { add, canAdd, move, newPart, remove, setEdit, toUploadFiles, type Part } from "./photos";
import { previewFor } from "./preview";
import { renderEdit } from "./renderEdit";
import { SOURCES, SourceButtons, type Source } from "./SourceButtons";
import { useUpload } from "./useUpload";

/** Adicionar talão: the first screen (sources and store) until there is a part, then «Confirme as partes». */
export function AddPage() {
  const navigate = useNavigate();
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [parts, setParts] = useState<Part[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [merchant, setMerchant] = useState("");
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const upload = useUpload();
  const urls = useRef<string[]>([]);
  urls.current = parts.flatMap((p) => (p.previewUrl ? [p.previewUrl] : []));
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function onPick(file: File | undefined) {
    if (!file) return;
    const type = effectiveType(file);
    const problem = validateFile(file) ?? canAdd(parts, type);
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
    const part = newPart(file, previewUrl, previewError);
    setParts((all) => add(all, part));
    // The first part opens the parts screen, which focuses its own title.
    if (parts.length > 0) setFocus({ to: "part", id: part.id });
  }

  function removePart(id: string) {
    const gone = parts.find((p) => p.id === id);
    if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
    upload.reset();
    setFileError(null);
    setParts((all) => remove(all, id));
    setFocus({ to: "title" });
  }

  function movePart(id: string, by: -1 | 1) {
    upload.reset();
    setParts((all) => move(all, id, by));
  }

  function discard() {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    upload.reset();
    setParts([]);
    setEditingId(null);
    setFileError(null);
    setConfirmingDiscard(false);
  }

  async function submit(allowDuplicate = false) {
    if (parts.length === 0) return;
    const files = await toUploadFiles(parts, renderEdit);
    const id = await upload.start(files, merchant || null, allowDuplicate);
    if (id) navigate(`/compras/${id}`);
  }

  const onEditChange = (edit: Edit) => {
    if (editingId) setParts((all) => setEdit(all, editingId, edit));
  };

  return (
    <>
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

      {parts.length === 0 ? (
        <div className="flex flex-col gap-4">
          <header className="pb-1 pt-6">
            <h1 className="text-[1.875rem] font-extrabold leading-tight tracking-tight">Adicionar talão</h1>
            <p className="mt-1.5 text-ink-soft">Lemos o talão e confirma os valores.</p>
          </header>
          <MerchantChips value={merchant} onChange={setMerchant} />
          <SourceButtons onPick={(id: Source) => inputs.current[id]?.click()} />
          {fileError && <Notice tone="error">{fileError}</Notice>}
          <p className="pt-2 text-sm text-ink-soft">Para uma boa leitura: talão inteiro na imagem, sobre um fundo escuro, sem sombras nem reflexos.</p>
        </div>
      ) : (
        <PartsScreen
          parts={parts}
          editingId={editingId}
          merchant={merchant}
          fileError={fileError}
          confirmingDiscard={confirmingDiscard}
          upload={upload}
          focus={focus}
          onFocused={() => setFocus(null)}
          onMerchant={setMerchant}
          onAddCamera={() => inputs.current.camera?.click()}
          onAddGallery={() => inputs.current.image?.click()}
          onEdit={(id) => {
            setEditingId(id);
            if (id === null && editingId) setFocus({ to: "part", id: editingId });
          }}
          onEditChange={onEditChange}
          onRemove={removePart}
          onMove={movePart}
          onLeave={() => setConfirmingDiscard(true)}
          onKeep={() => {
            setConfirmingDiscard(false);
            setFocus({ to: "title" });
          }}
          onDiscard={discard}
          onSubmit={(allowDuplicate) => void submit(allowDuplicate)}
        />
      )}
    </>
  );
}
