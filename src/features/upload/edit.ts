import type { Quad } from "../capture/homography";

/** The edit of one part: everything the editor needs to show it again, so it survives switching, reordering and deleting parts. */
export interface Edit {
  /** Degrees clockwise, one of 0, 90, 180, 270. */
  rotation: number;
  /** The corners the person set (top-left, top-right, bottom-right, bottom-left of the receipt, as shares of
   * the photo before the rotation); null while they are the ones found, and then the photo goes whole. */
  corners: Quad | null;
}

export const NO_EDIT: Edit = { rotation: 0, corners: null };

/** The corners found are only shown: the backend finds the same ones. A rotation or corners the person set are an edit. */
export function isEdited(edit: Edit): boolean {
  return edit.rotation !== 0 || edit.corners !== null;
}
