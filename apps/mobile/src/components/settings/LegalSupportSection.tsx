import { Pressable, Text, View } from "react-native";

import { IconBubble } from "../ui";
import { KASWISE_LEGAL_URLS } from "../../config/legal-links";

type LegalSupportSectionProps = {
  language: "id" | "en";
  styles: Record<string, any>;
  onOpenUrl: (url: string) => void | Promise<void>;
};

export function LegalSupportSection({ language, styles, onOpenUrl }: LegalSupportSectionProps) {
  return (
    <View testID="settings-legal" style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>
        {language === "id" ? "Legal & Dukungan" : "Legal & Support"}
      </Text>
      <Text style={styles.sectionSub}>
        {language === "id"
          ? "Akses cepat ke kebijakan privasi, penghapusan akun, dan syarat layanan."
          : "Quick access to privacy, account deletion, and service terms."}
      </Text>

      <Pressable
        testID="settings-privacy-policy"
        accessibilityRole="button"
        style={styles.navigationRow}
        onPress={() => onOpenUrl(KASWISE_LEGAL_URLS.privacy)}
      >
        <View style={styles.navigationCopy}>
          <IconBubble name="lock" tone="primary" size={32} />
          <View style={styles.navigationTextBlock}>
            <Text style={styles.navigationTitle}>
              {language === "id" ? "Kebijakan Privasi" : "Privacy Policy"}
            </Text>
            <Text style={styles.navigationHelper}>
              {language === "id"
                ? "Lihat cara Kaswise mengelola data akun dan data keuangan."
                : "See how Kaswise handles account and finance data."}
            </Text>
          </View>
        </View>
        <Text style={styles.navigationChevron}>›</Text>
      </Pressable>

      <Pressable
        testID="settings-account-deletion"
        accessibilityRole="button"
        style={styles.navigationRow}
        onPress={() => onOpenUrl(KASWISE_LEGAL_URLS.accountDeletion)}
      >
        <View style={styles.navigationCopy}>
          <IconBubble name="lock" tone="danger" size={32} />
          <View style={styles.navigationTextBlock}>
            <Text style={styles.navigationTitle}>
              {language === "id" ? "Penghapusan Akun" : "Account Deletion"}
            </Text>
            <Text style={styles.navigationHelper}>
              {language === "id"
                ? "Lihat cara meminta penghapusan akun dan data Anda."
                : "See how to request deletion of your account and data."}
            </Text>
          </View>
        </View>
        <Text style={styles.navigationChevron}>›</Text>
      </Pressable>

      <Pressable
        testID="settings-terms-of-service"
        accessibilityRole="button"
        style={styles.navigationRow}
        onPress={() => onOpenUrl(KASWISE_LEGAL_URLS.terms)}
      >
        <View style={styles.navigationCopy}>
          <IconBubble name="file" tone="info" size={32} />
          <View style={styles.navigationTextBlock}>
            <Text style={styles.navigationTitle}>
              {language === "id" ? "Syarat Layanan" : "Terms of Service"}
            </Text>
            <Text style={styles.navigationHelper}>
              {language === "id"
                ? "Baca ketentuan penggunaan Kaswise dan batas tanggung jawab layanan."
                : "Read Kaswise usage terms and service limitations."}
            </Text>
          </View>
        </View>
        <Text style={styles.navigationChevron}>›</Text>
      </Pressable>
    </View>
  );
}
