import { keepPreviousData, onlineManager, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";
import { api, unwrap, type Merchant, type Schemas } from "../../api/client";

export type ShoppingList = Schemas["ShoppingListOut"];
export type ShoppingItem = Schemas["ShoppingItemOut"];
type ItemPatch = Schemas["ShoppingItemPatch"];

const KEY = ["shopping-list"] as const;
const SCOPE = { id: "shopping-list" };
const OTHER = "outros";

/** An item the server has not answered for yet: it cannot be edited, removed or opened until it has its own id. */
export const TEMP = "temp-";
export const isTemp = (item: ShoppingItem) => item.id.startsWith(TEMP);

/** The counts the header and the note read, after a change on the screen. */
function counted(list: ShoppingList, items: ShoppingItem[]): ShoppingList {
  return {
    ...list,
    items,
    items_total: items.length,
    checked_count: items.filter((i) => i.checked).length,
    already_have_excluded: items.filter((i) => i.already_have && !i.checked).length,
  };
}

const patchItem = (list: ShoppingList, id: string, patch: Partial<ShoppingItem>) =>
  counted(list, list.items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

export function useShoppingList() {
  return useQuery({ queryKey: KEY, queryFn: async () => unwrap(await api.GET("/v1/lists/current")) });
}

/** Whether the device has a connection: the list keeps working on the screen without it, and saves when it returns. */
export function useOnline() {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
    () => true,
  );
}

export function useEvolution(itemId: string, months: number) {
  return useQuery({
    queryKey: [...KEY, "evolution", itemId, months],
    // Changing the period keeps the chart on the screen until the new one arrives.
    placeholderData: keepPreviousData,
    queryFn: async () =>
      unwrap(await api.GET("/v1/lists/current/items/{item_id}/evolution", { params: { path: { item_id: itemId }, query: { months } } })),
  });
}

export function useSuggestions() {
  return useQuery({
    queryKey: [...KEY, "suggestions"],
    queryFn: async () => unwrap(await api.GET("/v1/lists/current/suggestions")),
  });
}

type Failed = { error: Error; retry: () => void } | null;

/** One change of the list: shown on the screen at once; the server answers with the whole list, which replaces it when no other change is waiting. */
function useAction<V>(
  setFailed: (failed: Failed) => void,
  request: (v: V) => Promise<ShoppingList>,
  optimistic?: (list: ShoppingList, v: V) => ShoppingList,
  /** Whether the change can alter the suggestions (what is on the list): then they are read again once it is saved. */
  affectsSuggestions = false,
) {
  const qc = useQueryClient();
  const mutation = useMutation({
    scope: SCOPE,
    mutationFn: request,
    onMutate: async (v: V) => {
      setFailed(null);
      await qc.cancelQueries({ queryKey: KEY, exact: true });
      const before = qc.getQueryData<ShoppingList>(KEY);
      if (before && optimistic) qc.setQueryData(KEY, optimistic(before, v));
    },
    onSuccess: (list) => {
      const waiting = qc.isMutating({ predicate: (m) => m.options.scope?.id === SCOPE.id });
      if (waiting <= 1) qc.setQueryData(KEY, list);
    },
    onError: (error, v) => {
      setFailed({ error, retry: () => mutation.mutate(v) });
      void qc.invalidateQueries({ queryKey: KEY, exact: true });
    },
    onSettled: () => {
      if (affectsSuggestions) void qc.invalidateQueries({ queryKey: [...KEY, "suggestions"] });
    },
  });
  return mutation.mutate;
}

/**
 * Every change the list can take. Without a connection the changes wait (in memory only, nothing is kept on the
 * device) and are sent in order when it returns. A change that fails is undone by reading the list again, and `failed`
 * lets the screen offer «Tentar de novo».
 */
export function useShoppingListActions() {
  const [failed, setFailed] = useState<Failed>(null);

  const setMerchant = useAction(setFailed, async (merchant: Merchant) =>
    unwrap(await api.PUT("/v1/lists/current/merchant", { body: { merchant } })),
  );

  /** Ticking, «já tenho» and editing are one change: some fields of one item. */
  const update = useAction(
    setFailed,
    async (v: { id: string; changes: ItemPatch }) =>
      unwrap(await api.PATCH("/v1/lists/current/items/{item_id}", { params: { path: { item_id: v.id } }, body: v.changes })),
    (list, v) => {
      const { name, quantity, unit, category, checked, already_have } = v.changes;
      const patch: Partial<ShoppingItem> = {};
      if (name) patch.name = name;
      if (quantity !== undefined && quantity !== null) patch.quantity = String(quantity);
      if (unit !== undefined) patch.unit = unit;
      if (category) {
        patch.category = category;
        patch.category_name = list.categories.find((c) => c.id === category)?.name ?? "";
      }
      if (checked !== undefined && checked !== null) patch.checked = checked;
      if (already_have !== undefined && already_have !== null) patch.already_have = already_have;
      return patchItem(list, v.id, patch);
    },
    true,
  );

  const remove = useAction(
    setFailed,
    async (id: string) => unwrap(await api.DELETE("/v1/lists/current/items/{item_id}", { params: { path: { item_id: id } } })),
    (list, id) => counted(list, list.items.filter((i) => i.id !== id)),
    true,
  );

  const restore = useAction(
    setFailed,
    async (v: { item: ShoppingItem; index: number }) =>
      unwrap(await api.POST("/v1/lists/current/items/{item_id}/restore", { params: { path: { item_id: v.item.id } } })),
    (list, v) => {
      const items = [...list.items];
      items.splice(Math.min(v.index, items.length), 0, v.item);
      return counted(list, items);
    },
    true,
  );

  const add = useAction(
    setFailed,
    async (v: { name: string; already_have?: boolean; product_id?: string }) =>
      unwrap(await api.POST("/v1/lists/current/items", { body: { name: v.name, quantity: 1, already_have: v.already_have ?? false, product_id: v.product_id } })),
    (list, v) => {
      const other = list.categories.find((c) => c.id === OTHER);
      const item: ShoppingItem = {
        id: `${TEMP}${crypto.randomUUID()}`,
        name: v.name,
        category: OTHER,
        category_name: other?.name ?? "Outros",
        quantity: "1",
        unit: null,
        checked: false,
        already_have: v.already_have ?? false,
        product_id: v.product_id ?? null,
        expected: null,
      };
      return counted(list, [...list.items, item]);
    },
    true,
  );

  return {
    setMerchant,
    check: (id: string, checked: boolean) => update({ id, changes: { checked } }),
    haveAtHome: (id: string, already_have: boolean) => update({ id, changes: { already_have } }),
    edit: (id: string, changes: ItemPatch) => update({ id, changes }),
    remove,
    restore,
    add,
    failed,
  };
}
