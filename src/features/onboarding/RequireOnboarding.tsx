import { Navigate, Outlet } from "react-router";
import { Spinner } from "../../components/ui";
import { useProfile } from "../profile/useProfile";

/**
 * Sends a signed-in, consented person who has not finished the onboarding to /boas-vindas. It sits above the AppShell,
 * so while it decides only the loading indicator shows (no navigation bar, no Início). If the profile cannot be read,
 * the person is not locked out.
 */
export function RequireOnboarding() {
  const { data: profile, isLoading } = useProfile();
  if (isLoading) return <Spinner />;
  return profile && !profile.onboarding_completed_at ? <Navigate to="/boas-vindas" replace /> : <Outlet />;
}
