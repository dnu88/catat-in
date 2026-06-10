import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { KaswiseIcon } from "../icons/kaswise-icons";
import { useTheme } from "../../theme/theme-context";
import { useSupabase } from "../../lib/supabase";
import { getUnreadNotificationCount } from "../../services/notifications";

type Props = {
  /** How often to poll for unread count, in ms. 0 = no polling. */
  pollIntervalMs?: number;
};

export function NotificationBell({ pollIntervalMs = 0 }: Props) {
  const { theme } = useTheme();
  const { supabase } = useSupabase();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount(supabase);
      setUnreadCount(count);
    } catch {
      // silently ignore
    }
  }, [supabase]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (pollIntervalMs <= 0) return;
    const id = setInterval(fetchCount, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchCount, pollIntervalMs]);

  const s = styles(theme);

  return (
    <Pressable
      testID="notification-bell"
      accessibilityRole="button"
      accessibilityLabel={`Notifikasi, ${unreadCount} belum dibaca`}
      onPress={() => router.push("/notifications" as never)}
      style={({ pressed }) => [s.bell, pressed && s.bellPressed]}
    >
      <KaswiseIcon
        name="insight"
        size={22}
        color={theme.colors.textPrimary}
        weight="bold"
      />
      {unreadCount > 0 && (
        <View testID="notification-bell-badge" style={s.badge}>
          <Text style={s.badgeText}>
            {unreadCount > 9 ? "9+" : String(unreadCount)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function styles(
  theme: ReturnType<typeof useTheme>["theme"]
) {
  return StyleSheet.create({
    bell: {
      padding: 6,
      position: "relative" as const,
    },
    bellPressed: {
      opacity: 0.7,
    },
    badge: {
      position: "absolute" as const,
      top: 2,
      right: 2,
      backgroundColor: theme.colors.danger,
      borderRadius: 9,
      minWidth: 18,
      height: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 4,
    },
    badgeText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "bold" as const,
    },
  });
}
