import { Fingerprint } from "lucide-react";
import { Button, Notice, Surface } from "../../components/ui";
import { addPasskeyError, useAddPasskey, usePasskeySupport, usePasskeys } from "../auth/passkeys";
import { useProfile, useSaveProfile } from "../profile/useProfile";

/**
 * The one-time offer of a passkey on the Início (spec 016), once it has purchases: on a phone that can use one, to an
 * account without any, until it is accepted or dismissed. The dismissal is kept on the server (no local storage).
 */
export function PasskeyOffer() {
  const supported = usePasskeySupport();
  const profile = useProfile();
  const pending = supported && profile.isSuccess && !profile.data.passkey_offer_dismissed_at;
  const passkeys = usePasskeys(pending);
  const show = pending && passkeys.data?.length === 0;
  const { ready, mutation: add } = useAddPasskey(show);
  const save = useSaveProfile();
  if (!show) return null;

  const dismiss = () => save.mutate({ passkey_offer_dismissed: true });
  const addError = addPasskeyError(add.error);
  return (
    <Surface tone="bordered" className="flex flex-col gap-3">
      <div className="flex gap-3">
        <Fingerprint aria-hidden className="mt-0.5 size-6 shrink-0 text-brand" />
        <div>
          <h2 className="text-[length:calc(15px_*_var(--text-scale))] font-bold">Entrar mais depressa</h2>
          <p className="mt-1 text-[length:calc(13px_*_var(--text-scale))] text-ink-soft">Ative a passkey e entre com a digital, o rosto ou o PIN do telemóvel.</p>
        </div>
      </div>
      {addError && <Notice tone="error">{addError}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!ready} busy={add.isPending} onClick={() => add.mutate(undefined, { onSuccess: dismiss })}>
          Ativar
        </Button>
        <Button variant="quiet" busy={save.isPending} onClick={dismiss}>
          Agora não
        </Button>
      </div>
    </Surface>
  );
}
