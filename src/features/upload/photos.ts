import { effectiveType, MAX_PHOTOS } from "../../lib/upload";
import { NO_CHECK, type StillCheck } from "../capture/analyzeFrame";
import { isEdited, NO_EDIT, type Edit } from "./edit";
import type { UploadFile } from "./useUpload";

/** One part of the receipt being added: a photo (or the PDF), kept only in memory. Its check (`analyzeStill`:
 * what the backend would warn about, the whole receipt in it) arrives after it is added. */
export interface Part extends StillCheck {
  id: string;
  /** The original file; never changed. */
  file: File;
  /** `effectiveType(file)`. */
  type: string;
  /** Object URL of the preview (HEIC converted for this only); null for a PDF or when the preview failed. */
  previewUrl: string | null;
  previewError: boolean;
  edit: Edit;
}

export const newPart = (file: File, previewUrl: string | null, previewError: boolean): Part => ({
  id: crypto.randomUUID(),
  file,
  type: effectiveType(file),
  previewUrl,
  previewError,
  edit: NO_EDIT,
  ...NO_CHECK,
});

/** Why a file of this type cannot be added to the parts, or null when it can. */
export function canAdd(parts: Part[], type: string): string | null {
  if (parts.length > 0 && (type === "application/pdf" || parts.some((p) => p.type === "application/pdf"))) {
    return "Só é possível juntar fotografias a uma fotografia.";
  }
  if (parts.length >= MAX_PHOTOS) return `No máximo ${MAX_PHOTOS} fotos por talão.`;
  return null;
}

export const add = (parts: Part[], part: Part): Part[] => [...parts, part];

export const remove = (parts: Part[], id: string): Part[] => parts.filter((p) => p.id !== id);

/** A part taken again («Fotografar de novo») goes where the old one was. */
export const replace = (parts: Part[], id: string, part: Part): Part[] => parts.map((p) => (p.id === id ? part : p));

export const setCheck = (parts: Part[], id: string, check: StillCheck): Part[] =>
  parts.map((p) => (p.id === id ? { ...p, ...check } : p));

/** Swaps a part with its neighbour; at the ends nothing changes. */
export function move(parts: Part[], id: string, by: -1 | 1): Part[] {
  const from = parts.findIndex((p) => p.id === id);
  const to = from + by;
  if (from < 0 || to < 0 || to >= parts.length) return parts;
  const next = [...parts];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}

export const setEdit = (parts: Part[], id: string, edit: Edit): Part[] => parts.map((p) => (p.id === id ? { ...p, edit } : p));

/** What is sent, in the order shown: the rendered JPEG of an edited part and the original of the others. */
export async function toUploadFiles(parts: Part[], render: (previewUrl: string, edit: Edit) => Promise<Blob>): Promise<UploadFile[]> {
  const files: UploadFile[] = [];
  for (const p of parts) {
    if (p.previewUrl && isEdited(p.edit)) {
      files.push({ blob: await render(p.previewUrl, p.edit), filename: p.file.name.replace(/\.[^.]+$/, "") + ".jpg", contentType: "image/jpeg" });
    } else {
      files.push({ blob: p.file, filename: p.file.name, contentType: p.type });
    }
  }
  return files;
}

/** The orientation for the next part (in the parts screen and on the in-app camera). */
export const nextPartText = (parts: readonly Pick<Part, "id">[]): string => `Parte ${parts.length + 1} · comece onde a parte ${parts.length} acabou`;
