import { Camera, FileText, ImageIcon } from "lucide-react";
import { Notice } from "../../components/ui";

export type Source = "camera" | "image" | "pdf";

/** The hidden file inputs live in the AddPage (always mounted); `accept` and `capture` are the ones the camera, the gallery and the PDF need. */
export const SOURCES = [
  { id: "camera", label: "Fotografar", hint: "Abre a câmara", icon: Camera, accept: "image/*", capture: true },
  { id: "image", label: "Escolher imagem", hint: "Da galeria do telemóvel", icon: ImageIcon, accept: "image/jpeg,image/png,image/heic,image/heif,.heic,.heif" },
  { id: "pdf", label: "Escolher PDF", hint: "Talão eletrónico por e-mail", icon: FileText, accept: "application/pdf,.pdf" },
] as const;

/** The three big buttons and the long-receipt warning. */
export function SourceButtons({ onPick }: { onPick: (source: Source) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {SOURCES.map(({ id, label, hint, icon: Icon }, i) => (
        <button
          key={id}
          type="button"
          onClick={() => onPick(id)}
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
      <Notice tone="warning">
        <b>Talão comprido?</b> Tire mais de uma foto, uma parte de cada vez. Juntamos tudo num só talão.
      </Notice>
    </div>
  );
}
