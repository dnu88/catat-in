import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { KaswiseLogoMark } from "../brand/KaswiseLogoMark";
import { useTheme } from "../../theme/theme-context";
import { financeEditorial as fe } from "../../theme/finance-editorial";
import { mobileLegalPages, type MobileLegalPage } from "../../content/legal-pages";

export function LegalInfoScreen({ page }: { page: MobileLegalPage }) {
  const { theme } = useTheme();
  const content = mobileLegalPages[page];
  const styles = createStyles(theme);

  return (
    <View testID={`legal-screen-${page}`} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[fe.navySurface, fe.blueDeep, fe.blueBright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.brandRow}>
            <KaswiseLogoMark size={36} />
            <View style={styles.brandCopy}>
              <Text style={styles.eyebrow}>{content.eyebrow}</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {content.title}
              </Text>
            </View>
          </View>
          <Text style={styles.intro}>{content.intro}</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(content.ctaHref)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>{content.ctaLabel}</Text>
          </Pressable>
        </LinearGradient>

        {content.sections.map((section, index) => (
          <View key={section.title} style={styles.sectionCard}>
            <Text style={styles.sectionIndex}>{String(index + 1).padStart(2, "0")}</Text>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: fe.paper,
    },
    content: {
      padding: 20,
      gap: 12,
      paddingBottom: 28,
    },
    heroCard: {
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
      padding: 20,
      gap: 14,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    brandCopy: {
      flex: 1,
      gap: 4,
    },
    eyebrow: {
      color: "rgba(255,255,255,0.72)",
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    title: {
      color: fe.white,
      fontSize: 28,
      fontWeight: "700",
      lineHeight: 30,
    },
    intro: {
      color: "rgba(255,255,255,0.72)",
      fontSize: 14,
      lineHeight: 21,
    },
    primaryButton: {
      alignSelf: "flex-start",
      backgroundColor: fe.white,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    primaryButtonText: {
      color: fe.navySurface,
      fontSize: 13,
      fontWeight: "800",
    },
    sectionCard: {
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: fe.white,
      padding: 18,
      gap: 8,
    },
    sectionIndex: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      lineHeight: 22,
    },
    sectionBody: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
  });
}
