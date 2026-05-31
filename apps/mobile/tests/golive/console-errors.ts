export function isIgnoredGoLiveConsoleError(message: string) {
  const normalized = message.replace(/\s+/g, ' ').trim();

  if (/auth session missing/i.test(normalized)) {
    return /AuthSessionMissingError|supabase|gotrue|auth/i.test(normalized);
  }

  // Supabase Auth can emit a background getUser() fetch rejection while the smoke
  // runner is switching auth contexts. The explicit login/logout assertions still
  // validate the user-visible auth flow; do not ignore data-mutation fetch errors.
  if (/^TypeError: Failed to fetch/i.test(normalized)) {
    return /_getUser|_useSession|gotrue|auth/i.test(normalized);
  }

  return false;
}
