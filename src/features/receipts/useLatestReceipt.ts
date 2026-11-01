import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../../api/client";

/** The purchase sent most recently (the API orders by sending). Same key as the Resumo's «any receipts» check, so one request serves both. */
export function useLatestReceipt() {
  return useQuery({
    queryKey: ["receipts", "any"],
    queryFn: async () => unwrap(await api.GET("/v1/receipts", { params: { query: { limit: 1 } } })),
  });
}
