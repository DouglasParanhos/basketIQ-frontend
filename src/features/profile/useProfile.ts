import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, unwrap, type Schemas } from "../../api/client";

/** The server says the privacy policy changed since the person accepted it (403 privacy_consent_required). */
export const isConsentError = (error: Error) => error instanceof ApiError && error.status === 403 && error.code === "privacy_consent_required";

/**
 * The person's profile (empty until saved). No retries: the onboarding guard waits for this query, and when it fails
 * the person must get in rather than wait for the backoff.
 */
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => unwrap(await api.GET("/v1/me/profile")),
    staleTime: 60_000,
    retry: false,
  });
}

/** PATCH /v1/me/profile: omitted fields are kept. The answer replaces the cached profile; a consent error refreshes the session. */
export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Schemas["ProfilePatch"]) => unwrap(await api.PATCH("/v1/me/profile", { body: patch })),
    onSuccess: (profile) => qc.setQueryData(["profile"], profile),
    onError: (error) => {
      if (isConsentError(error)) void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

/** The supported merchants, as the API names them (7, in a fixed order). */
export function useMerchants() {
  return useQuery({
    queryKey: ["merchants"],
    queryFn: async () => unwrap(await api.GET("/v1/merchants")),
    staleTime: 60 * 60_000,
  });
}
