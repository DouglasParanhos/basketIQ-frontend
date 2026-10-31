/** The object URL of a photo's preview: HEIC is converted for this only (the original is what is sent unless edited). */
export async function previewFor(file: File, type: string): Promise<string | null> {
  if (type === "application/pdf") return null;
  if (type === "image/heic" || type === "image/heif") {
    // Most browsers cannot display HEIC: convert a copy for the preview only.
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    return URL.createObjectURL(Array.isArray(converted) ? converted[0]! : converted);
  }
  return URL.createObjectURL(file);
}
