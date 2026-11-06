import {
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, unwrap } from "../../api/client";

/**
 * Passkeys (RF-01, spec 016): sign in with the phone's lock (fingerprint, face or PIN). The account is created with Google;
 * a passkey is added from a session.
 *
 * The options (and their one-time challenge) are fetched before the tap and renewed before they expire (5 minutes on the
 * server): Safari on the iPhone only opens Face ID when the WebAuthn call happens inside the tap, with no request in between.
 */
const OPTIONS_REFRESH_MS = 4 * 60_000;

/** Whether this phone can make and use a passkey with its own lock. False in browsers without WebAuthn. */
export function usePasskeySupport(): boolean {
  const { data } = useQuery({
    queryKey: ["passkey-support"],
    queryFn: () => platformAuthenticatorIsAvailable(),
    staleTime: Infinity,
    retry: false,
  });
  return data === true;
}

/** The person cancelled the phone's prompt, or let it time out (WebAuthn's NotAllowedError). */
const isCancelled = (error: unknown) => error instanceof Error && error.name === "NotAllowedError";
const isRateLimited = (error: unknown) => error instanceof ApiError && error.status === 429;

/**
 * One WebAuthn ceremony: its options, prefetched and renewed, and the mutation that runs `ceremony` with them. After an
 * attempt the options are fetched again, unless the challenge never reached the server (a cancel) or the API refused it
 * before reading it (429).
 */
function useCeremony<Options, Result>(
  kind: "login" | "register",
  enabled: boolean,
  fetchOptions: () => Promise<Options>,
  ceremony: (options: Options) => Promise<Result>,
  onSuccess: () => Promise<unknown>,
) {
  const qc = useQueryClient();
  const queryKey = ["passkey-options", kind];
  const options = useQuery({
    queryKey,
    queryFn: fetchOptions,
    enabled,
    staleTime: OPTIONS_REFRESH_MS,
    refetchInterval: OPTIONS_REFRESH_MS,
    gcTime: OPTIONS_REFRESH_MS,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () => {
      if (!options.data) throw new Error("The passkey options are not loaded yet.");
      return ceremony(options.data);
    },
    onSuccess,
    onSettled: (_result, error) => {
      if (!isCancelled(error) && !isRateLimited(error)) void qc.invalidateQueries({ queryKey });
    },
  });
  return { ready: options.isSuccess, options: options.data, mutation };
}

// The generated bodies and answers are `{ [key: string]: unknown }`: the WebAuthn JSON interfaces need a cast or a spread.

/**
 * Sign in with a passkey. On success the session cookies are set and `me` is fetched again. The options allow only the
 * passkeys made on this phone (the server remembers them in a cookie), so the phone goes straight to its lock: never a QR
 * code or another device. Without any, `allowCredentials` is empty and there is nothing to offer.
 */
export function usePasskeySignIn() {
  const qc = useQueryClient();
  return useCeremony(
    "login",
    true,
    async () => unwrap(await api.POST("/v1/auth/passkey/options")) as unknown as PublicKeyCredentialRequestOptionsJSON,
    async (optionsJSON) => {
      const assertion = await startAuthentication({ optionsJSON });
      unwrap(await api.POST("/v1/auth/passkey/verify", { body: { ...assertion } }));
    },
    () => qc.invalidateQueries({ queryKey: ["me"] }),
  );
}

/** Add a passkey on this phone to the signed-in account. */
export function useAddPasskey(enabled: boolean) {
  const qc = useQueryClient();
  return useCeremony(
    "register",
    enabled,
    async () => unwrap(await api.POST("/v1/me/passkeys/options")) as unknown as PublicKeyCredentialCreationOptionsJSON,
    async (optionsJSON) => {
      const credential = await startRegistration({ optionsJSON });
      return unwrap(await api.POST("/v1/me/passkeys", { body: { ...credential } }));
    },
    () => qc.invalidateQueries({ queryKey: ["passkeys"] }),
  );
}

/** The account's passkeys. Kept for a while: adding and removing one refresh the list. */
export function usePasskeys(enabled = true) {
  return useQuery({
    queryKey: ["passkeys"],
    queryFn: async () => unwrap(await api.GET("/v1/me/passkeys")),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useRemovePasskey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await api.DELETE("/v1/me/passkeys/{passkey_id}", { params: { path: { passkey_id: id } } }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passkeys"] }),
  });
}

/** The message for a failed passkey sign-in; null when the person cancelled (the login says so in its own words). */
export function signInError(error: unknown): string | null {
  if (isCancelled(error)) return null;
  if (error instanceof ApiError && error.status === 401) return "Esta passkey já não é válida. Entre com Google.";
  if (isRateLimited(error)) return "Demasiadas tentativas. Aguarde um minuto e tente novamente.";
  return "Não foi possível entrar com a passkey. Tente novamente ou entre com Google.";
}

/** The message for a failed «Adicionar passkey»; null without an error or when the person cancelled. */
export function addPasskeyError(error: unknown): string | null {
  if (!error || isCancelled(error)) return null;
  // InvalidStateError: this phone already holds a passkey of this account.
  if ((error instanceof ApiError && error.status === 409) || (error instanceof Error && error.name === "InvalidStateError")) {
    return "Este telemóvel já tem uma passkey desta conta.";
  }
  return "Não foi possível adicionar a passkey. Tente novamente.";
}
