import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/theme-context";
import { useSupabase } from "../../src/lib/supabase";
import { KaswiseIcon } from "../../src/components/icons/kaswise-icons";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "../../src/services/notifications";

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Barusan";
  if (diffMin < 60) return `${diffMin}m lalu`;
  if (diffHr < 24) return `${diffHr}j lalu`;
  if (diffDay < 7) return `${diffDay}h lalu`;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "budget_threshold":
      return <KaswiseIcon name="budgets" size={20} weight="bold" />;
    case "weekly_summary":
      return <KaswiseIcon name="chart" size={20} weight="bold" />;
    case "ai_insight_ready":
      return <KaswiseIcon name="insight" size={20} weight="bold" />;
    default:
      return <KaswiseIcon name="home" size={20} weight="bold" />;
  }
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { supabase } = useSupabase();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = StyleSheet.create(styles(theme, insets));

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listNotifications(supabase, { limit: 100 });
      setItems(data.items);
      setUnreadCount(data.unread_count);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePress = useCallback(
    async (item: NotificationItem) => {
      if (!item.read_at) {
        await markNotificationRead(supabase, item.id);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, read_at: new Date().toISOString() } : i
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      const target = item.data?.target_path as string | undefined;
      if (target) {
        router.push(target as never);
      }
    },
    [supabase, router]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    await markAllNotificationsRead(supabase);
    setItems((prev) =>
      prev.map((i) => (i.read_at ? i : { ...i, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
  }, [supabase, unreadCount]);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          testID="notifications-back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={s.backBtn}
        >
          <KaswiseIcon
            name="back"
            size={18}
            color={theme.colors.textPrimary}
            weight="bold"
          />
        </Pressable>
        <Text style={s.title}>Notifikasi</Text>
        {unreadCount > 0 && (
          <Pressable
            testID="notifications-mark-all-read"
            accessibilityRole="button"
            onPress={handleMarkAllRead}
            style={s.markAllBtn}
          >
            <Text style={s.markAllText}>Tandai semua dibaca</Text>
          </Pressable>
        )}
      </View>

      {/* Body */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <View testID="notifications-empty" style={s.center}>
          <KaswiseIcon
            name="home"
            size={48}
            color={theme.colors.textMuted}
            weight="regular"
          />
          <Text style={s.emptyText}>Belum ada notifikasi.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              testID={`notification-item-${item.id}`}
              accessibilityRole="button"
              style={[s.item, item.read_at && s.itemRead]}
              onPress={() => handlePress(item)}
            >
              <View style={s.itemRow}>
                <NotificationIcon type={item.type} />
                <View style={s.itemContent}>
                  <Text style={s.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={s.itemBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
                {!item.read_at && <View testID={`unread-dot-${item.id}`} style={s.unreadDot} />}
              </View>
              <Text style={s.itemTime}>{formatRelativeTime(item.created_at)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function styles(
  theme: ReturnType<typeof useTheme>["theme"],
  insets: { top: number }
) {
  return {
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingTop: insets.top + 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSoft,
    },
    backBtn: {
      padding: 4,
      marginRight: 8,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "bold" as const,
      flex: 1,
    },
    markAllBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    markAllText: {
      color: theme.colors.brandPrimary,
      fontSize: 14,
      fontWeight: "600" as const,
    },
    center: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 12,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 15,
    },
    item: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSoft,
    },
    itemRead: {
      opacity: 0.6,
    },
    itemRow: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 10,
    },
    itemContent: {
      flex: 1,
    },
    itemTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "600" as const,
      marginBottom: 2,
    },
    itemBody: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.brandPrimary,
      marginTop: 6,
    },
    itemTime: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 6,
    },
  };
}
