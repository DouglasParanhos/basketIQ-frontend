import { http, HttpResponse } from "msw";
import { DESIGN_SEED, shoppingListModel, type Model, type Seed } from "./shoppingListModel";

export { DESIGN_SEED, type Seed } from "./shoppingListModel";

const API = "http://localhost:3000";

export interface Fake extends Pick<Model, "calls" | "state"> {
  handlers: ReturnType<typeof http.get>[];
}

/** The fake shopping-list API as MSW handlers (the model keeps the list in memory). */
export function shoppingListFake(seed: Seed[] = DESIGN_SEED, merchant = "LIDL"): Fake {
  const model = shoppingListModel(seed, merchant);
  const answer = async ({ request }: { request: Request }) => {
    const path = new URL(request.url).pathname.replace("/v1/lists/current", "");
    const body = request.method === "GET" || request.method === "DELETE" ? null : await request.clone().json().catch(() => null);
    const out = model.handle(request.method, path, body);
    return out ? HttpResponse.json(out.body as Record<string, unknown>, { status: out.status }) : new HttpResponse(null, { status: 404 });
  };
  const handlers = [
    http.get(`${API}/v1/lists/current`, answer),
    http.put(`${API}/v1/lists/current/merchant`, answer),
    http.post(`${API}/v1/lists/current/items`, answer),
    http.patch(`${API}/v1/lists/current/items/:id`, answer),
    http.delete(`${API}/v1/lists/current/items/:id`, answer),
    http.post(`${API}/v1/lists/current/items/:id/restore`, answer),
    http.get(`${API}/v1/lists/current/items/:id/evolution`, answer),
    http.get(`${API}/v1/lists/current/suggestions`, answer),
  ];
  return { handlers: handlers as unknown as Fake["handlers"], calls: model.calls, state: model.state };
}
