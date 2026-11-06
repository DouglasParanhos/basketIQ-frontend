import { http, HttpResponse } from "msw";
import { beforeEach, vi } from "vitest";
import { NO_EDIT, type Edit } from "../features/upload/edit";
import { API, server } from "./server";

/** Synthetic files for the Adicionar screen. */
export const jpg = (name: string, body = name) => new File([body], name, { type: "image/jpeg" });
export const pdf = (name = "fatura.pdf") => new File(["%PDF-1.4"], name, { type: "application/pdf" });

/**
 * jsdom has no `URL.createObjectURL`, so today the preview of a photo fails and the editor never mounts in the tests.
 * Call this in a test file (never in setup.ts, which would mount the editor in every other test): it gives each
 * preview a `blob:parte-N` URL and records the ones released. Each test file has its own jsdom, so nothing leaks to the others.
 */
export function stubPreviewUrls() {
  const released: string[] = [];
  let next = 0;
  beforeEach(() => {
    next = 0;
    released.length = 0;
    URL.createObjectURL = vi.fn(() => `blob:parte-${++next}`);
    URL.revokeObjectURL = vi.fn((url: string) => void released.push(url));
  });
  return { released };
}

/** A stand-in for `./QuadEditor` (`vi.mock`): shows the value it receives and has buttons that produce edits. */
export function FakeQuadEditor({ value, onChange }: { src: string; value: Edit; onChange: (edit: Edit) => void }) {
  return (
    <div data-testid="fake-editor">
      <p>
        rotação {value.rotation} cantos {value.corners ? "mexidos" : "encontrados"}
      </p>
      <button type="button" onClick={() => onChange({ ...value, rotation: 90 })}>
        rodar
      </button>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            corners: [
              [0.1, 0.1],
              [0.9, 0.1],
              [0.9, 0.9],
              [0.1, 0.9],
            ],
          })
        }
      >
        mexer nos cantos
      </button>
      <button type="button" onClick={() => onChange(NO_EDIT)}>
        repor
      </button>
    </div>
  );
}

/**
 * msw handlers for the whole upload of one receipt (upload-init, /photos, the presigned storage and process).
 * Returns the calls in order as readable strings («init:a.jpg», «photo:b.jpg», «storage:p0», «process») and the bodies.
 */
export function serveUpload(receiptId = "r20") {
  const calls: string[] = [];
  const bodies: Record<string, Record<string, unknown>> = {};
  const target = (name: string) => ({ url: `http://storage.test/${name}`, fields: {}, expires_at: "x" });
  const processed = { id: "j", status: "QUEUED", attempt_count: 0, processing_route: null, created_at: "x" };
  let photos = 0;
  server.use(
    http.post(`${API}/v1/receipts/upload-init`, async ({ request }) => {
      const body = (await request.json()) as { filename: string };
      calls.push(`init:${body.filename}`);
      bodies[`init:${body.filename}`] = body as unknown as Record<string, unknown>;
      return HttpResponse.json({ receipt_id: receiptId, upload: target("p0"), requirements: { max_bytes: 1, accepted_types: [], max_pdf_pages: 5, max_photos: 6 } }, { status: 201 });
    }),
    http.post(`${API}/v1/receipts/${receiptId}/photos`, async ({ request }) => {
      const body = (await request.json()) as { filename: string };
      calls.push(`photo:${body.filename}`);
      bodies[`photo:${body.filename}`] = body as unknown as Record<string, unknown>;
      photos += 1;
      return HttpResponse.json(target(`p${photos}`), { status: 201 });
    }),
    http.post("http://storage.test/:name", ({ params }) => {
      calls.push(`storage:${String(params.name)}`);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${API}/v1/receipts/${receiptId}/process`, () => {
      calls.push("process");
      return HttpResponse.json(processed, { status: 202 });
    }),
  );
  return { calls, bodies };
}
