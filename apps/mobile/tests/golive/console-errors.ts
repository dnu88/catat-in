export function isIgnoredGoLiveConsoleError(message: string) {
  const normalized = message.replace(/\s+/g, ' ').trim();
  if (!/auth session missing/i.test(normalized)) return false;
  return /AuthSessionMissingError|supabase|gotrue|auth/i.test(normalized);
}
