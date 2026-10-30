import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, unwrap } from "../api/client";

/**
 * The customer-facing name comes from the backend (config/app-config.yaml, key
 * APP_NAME_FOR_CUSTOMER) through GET /v1/config. This constant is only shown until the answer
 * arrives or if the request fails; it is not the source of the name.
 */
export const FALLBACK_APP_NAME = "Super Mercado";

export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: async () => unwrap(await api.GET("/v1/config")),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Whether the smart-list destination is shown (GET /v1/config → smart_list_enabled, key
 * SMART_LIST_ENABLED). Anything other than `true` (missing field, pending or failed request) is off.
 * The field is not in src/api/schema.d.ts until the backend exposes it (spec 013 US8) and
 * `pnpm gen:api` runs; the local type below is temporary (task T023 of specs/009-navegacao-5-botoes).
 */
export function useSmartListEnabled(): boolean {
  const config = useAppConfig().data as { smart_list_enabled?: boolean } | undefined;
  return config?.smart_list_enabled === true;
}

export function useAppName(): string {
  return useAppConfig().data?.app_name ?? FALLBACK_APP_NAME;
}

/** Keeps the browser tab title in sync with the configured name. Renders nothing. */
export function DocumentTitle() {
  const name = useAppName();
  useEffect(() => {
    document.title = name;
  }, [name]);
  return null;
}
