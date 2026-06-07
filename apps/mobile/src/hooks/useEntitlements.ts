import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getEntitlements, type Entitlements } from "../services/billing";

export function useEntitlements() {
  const [data, setData] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getEntitlements(supabase));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}
