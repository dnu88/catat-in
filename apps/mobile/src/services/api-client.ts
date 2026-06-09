import Constants from "expo-constants";
import type { SupabaseClient } from "@supabase/supabase-js";

const processEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;
const expoExtra = Constants.expoConfig?.extra as
  | Record<string, string | undefined>
  | undefined;

function readConfigValue(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function getApiBaseUrl() {
  return (
    readConfigValue(
      processEnv?.EXPO_PUBLIC_API_URL,
      processEnv?.API_URL,
      expoExtra?.apiUrl,
      expoExtra?.EXPO_PUBLIC_API_URL,
    ) ?? "https://api.kaswise.com"
  ).replace(/\/$/, "");
}

export async function authHeader(supabase: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
  return { Authorization: `Bearer ${token}` };
}
