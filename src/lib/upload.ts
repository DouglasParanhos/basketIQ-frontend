export const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif",
};
export const MAX_BYTES = 15 * 1024 * 1024;

/** Some browsers give HEIC files an empty type: infer it from the extension. */
export function effectiveType(file: File): string {
  if (file.type) return file.type === "image/jpg" ? "image/jpeg" : file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "heic" ? "image/heic" : ext === "heif" ? "image/heif" : "";
}

export function validateFile(file: File): string | null {
  const type = effectiveType(file);
  if (!(type in ACCEPTED_TYPES)) return "Este tipo de ficheiro não é suportado. Escolha um PDF, JPEG, PNG ou HEIC.";
  if (file.size === 0) return "O ficheiro está vazio.";
  if (file.size > MAX_BYTES) return "O ficheiro tem mais de 15 MB. Escolha um ficheiro mais pequeno.";
  return null;
}

function readBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer().then((b) => new Uint8Array(b));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const bytes = await readBytes(blob);
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class UploadError extends Error {
  constructor(
    message: string,
    readonly network: boolean,
  ) {
    super(message);
  }
}

/** POST to the presigned URL with progress (fetch has no upload progress). */
export function postToStorage(
  upload: { url: string; fields: Record<string, string> },
  file: Blob,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(upload.fields)) form.append(k, v);
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", upload.url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new UploadError("O armazenamento recusou o ficheiro. Verifique o tipo e o tamanho.", false));
    xhr.onerror = () => reject(new UploadError("A ligação falhou durante o envio.", true));
    xhr.send(form);
  });
}
