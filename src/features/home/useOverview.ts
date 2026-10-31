import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../../api/client";

/** The Início of one month: a single request, always with the month (the server could otherwise disagree on «this month» at the turn of the month). */
export function useOverview(month: string) {
  return useQuery({
    queryKey: ["overview", month],
    queryFn: async () => unwrap(await api.GET("/v1/analytics/overview", { params: { query: { month } } })),
    staleTime: 30_000,
  });
}
