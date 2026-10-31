import type { Area } from "react-easy-crop";

/** The edit of one part: everything the editor needs to show it again, so it survives switching, reordering and deleting parts. */
export interface Edit {
  /** Degrees, one of 0, 90, 180, 270. */
  rotation: number;
  /** 1 to 4. */
  zoom: number;
  /** Position of the crop in the editor. */
  crop: { x: number; y: number };
  /** null = the original shape; 1/3 narrow receipt; 1/2 wide receipt. */
  aspect: number | null;
  /** Pixels of the crop; null until the editor has measured it. */
  area: Area | null;
}

export const NO_EDIT: Edit = { rotation: 0, zoom: 1, crop: { x: 0, y: 0 }, aspect: null, area: null };

/** Moving the crop at zoom 1 keeps the whole image, so it is not an edit: only a rotation, a zoom or a format are. */
export function isEdited(edit: Edit): boolean {
  return edit.rotation !== 0 || edit.zoom !== 1 || edit.aspect !== null;
}
