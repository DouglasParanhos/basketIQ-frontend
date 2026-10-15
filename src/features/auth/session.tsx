import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { ApiError, api, unwrap, type Schemas } from "../../api/client";
import { Spinner } from "../../components/ui";

export type Me = Schemas["MeOut"];

export function useMe() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return unwrap(await api.GET("/v1/me"));
      } catch (e) {
        // Never signed in → null (login page). Signed in before → the session expired (error path).
        if (e instanceof ApiError && e.status === 401 && !qc.getQueryData(["me"])) return null;
        throw e;
      }
    },
    staleTime: 60_000,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.POST("/v1/auth/logout");
    },
    onSettled: () => {
      qc.clear();
      window.location.assign("/login");
    },
  });
}

/** Signed-in and consented users only; others go to login or to the privacy consent. */
export function RequireSession({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { data: me, isLoading, error } = useMe();
  const location = useLocation();
  if (isLoading) return <Spinner />;
  if (error) throw error;
  if (!me) return <Navigate to="/login" replace />;
  if (!me.privacy_accepted_at || me.privacy_version !== me.current_privacy_version) {
    return <Navigate to="/privacidade" replace state={{ from: location.pathname }} />;
  }
  if (admin && me.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}
