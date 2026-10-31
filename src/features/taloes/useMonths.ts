import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../../api/client";

/** Confirmed purchases and spending per month, newest first: the headers of the list and the years of the selector. */
export function useMonths() {
  return useQuery({
    queryKey: ["months"],
    queryFn: async () => unwrap(await api.GET("/v1/analytics/months")),
  });
}
