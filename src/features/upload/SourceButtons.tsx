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
    <div className="flex flex-col gap-2.5">
      {SOURCES.map(({ id, label, hint, icon: Icon }, i) => (
        <button
          key={id}
          type="button"
          onClick={() => onPick(id)}
          className={`flex min-h-[5.25rem] items-center gap-3.5 rounded-[22px] px-4 py-3.5 text-left ${
            i === 0 ? "bg-brand text-on-brand" : "bg-paper text-ink ring-1 ring-inset ring-line"
          }`}
        >
          <span className={`grid size-12 shrink-0 place-items-center rounded-full ${i === 0 ? "bg-on-brand/15" : "bg-brand-soft text-brand"}`}>
            <Icon aria-hidden className="size-6" />
          </span>
          <span className="flex flex-col">
            <span className="text-[length:calc(17px_*_var(--text-scale))] font-bold">{label}</span>
            {/* In the dark scheme the hint is not dimmed: 80 % of the dark text on the green is only 3.9:1. */}
            <span className={`text-[length:calc(13px_*_var(--text-scale))] ${i === 0 ? "text-white/80 dark:text-on-brand" : "text-ink-soft"}`}>{hint}</span>
          </span>
        </button>
      ))}
      <Notice tone="warning">
        <b>Talão comprido?</b> Tire mais de uma foto, uma parte de cada vez. Juntamos tudo num só talão.
      </Notice>
    </div>
  );
}
