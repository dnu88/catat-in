import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { IconBubble } from "../ui";
import type { AccountDeletionRequestItem } from "../../services/account-deletion";

function formatRequestDate(value: string, language: "id" | "en") {
  try {
    return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function describeStatus(status: AccountDeletionRequestItem["status"], language: "id" | "en") {
  if (language === "id") {
    switch (status) {
      case "pending":
        return "Menunggu ditinjau support";
      case "in_review":
        return "Sedang ditinjau support";
      case "completed":
        return "Sudah diproses";
      case "rejected":
        return "Ditolak / butuh klarifikasi";
      case "cancelled":
        return "Dibatalkan";
      default:
        return status;
    }
  }

  switch (status) {
    case "pending":
      return "Pending support review";
    case "in_review":
      return "Under support review";
    case "completed":
      return "Processed";
    case "rejected":
      return "Rejected / needs clarification";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function AccountDeletionSection({
  language,
  styles,
  profileEmail,
  expanded,
  onToggleExpanded,
  request,
  reason,
  details,
  onChangeReason,
  onChangeDetails,
  onSubmit,
  loading,
  loadingStatus,
  message,
}: {
  language: "id" | "en";
  styles: Record<string, any>;
  profileEmail: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  request: AccountDeletionRequestItem | null;
  reason: string;
  details: string;
  onChangeReason: (value: string) => void;
  onChangeDetails: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  loadingStatus: boolean;
  message: { type: "success" | "error"; message: string } | null;
}) {
  const hasActiveRequest = request?.status === "pending" || request?.status === "in_review";
  const requestDate = request?.requested_at ? formatRequestDate(request.requested_at, language) : null;

  return (
    <View testID="settings-account-deletion-section" style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>
        {language === "id" ? "Request Penghapusan Akun" : "Account Deletion Request"}
      </Text>
      <Text style={styles.sectionSub}>
        {language === "id"
          ? "Track A memakai alur request yang diverifikasi support sebelum akun dan data aktif dihapus."
          : "Track A uses a support-verified request flow before the account and active data are removed."}
      </Text>

      <Pressable
        testID="settings-account-deletion-toggle"
        accessibilityRole="button"
        style={styles.navigationRow}
        onPress={onToggleExpanded}
      >
        <View style={styles.navigationCopy}>
          <IconBubble name="lock" tone="danger" size={32} />
          <View style={styles.navigationTextBlock}>
            <Text style={styles.navigationTitle}>
              {language === "id" ? "Ajukan penghapusan akun" : "Submit account deletion request"}
            </Text>
            <Text style={styles.navigationHelper}>
              {loadingStatus
                ? language === "id"
                  ? "Memuat status request..."
                  : "Loading request status..."
                : request
                  ? language === "id"
                    ? `${describeStatus(request.status, language)}${requestDate ? ` • ${requestDate}` : ""}`
                    : `${describeStatus(request.status, language)}${requestDate ? ` • ${requestDate}` : ""}`
                  : language === "id"
                    ? "Ajukan dari akun aktif Anda. Target proses maksimal 30 hari."
                    : "Submit from your active account. Target processing time is within 30 days."}
            </Text>
          </View>
        </View>
        <Text style={styles.navigationChevron}>{expanded ? "⌃" : "›"}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.passwordForm}>
          <TextInput
            editable={false}
            value={profileEmail || (language === "id" ? "Memuat email akun..." : "Loading account email...")}
            style={[styles.textInput, styles.readOnlyInput]}
            testID="settings-account-deletion-email"
          />
          <TextInput
            value={reason}
            onChangeText={onChangeReason}
            placeholder={language === "id" ? "Alasan singkat (opsional)" : "Short reason (optional)"}
            style={styles.textInput}
            maxLength={120}
            editable={!hasActiveRequest && !loading}
            testID="settings-account-deletion-reason"
          />
          <TextInput
            value={details}
            onChangeText={onChangeDetails}
            placeholder={language === "id" ? "Detail tambahan untuk tim support (opsional)" : "Extra details for support (optional)"}
            style={[styles.textInput, styles.multilineInput]}
            multiline
            textAlignVertical="top"
            maxLength={500}
            editable={!hasActiveRequest && !loading}
            testID="settings-account-deletion-details"
          />
          {request?.review_notes ? (
            <Text style={styles.sectionSub}>
              {language === "id" ? "Catatan support: " : "Support note: "}
              {request.review_notes}
            </Text>
          ) : null}
          {message ? (
            <Text style={[styles.inlineMessage, message.type === "error" && styles.inlineMessageError]}>
              {message.message}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={onSubmit}
            disabled={loading || hasActiveRequest || !profileEmail}
            style={[styles.primaryButton, (loading || hasActiveRequest || !profileEmail) && styles.buttonDisabled]}
            testID="settings-submit-account-deletion"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {hasActiveRequest
                  ? language === "id"
                    ? "Request sedang diproses"
                    : "Request in progress"
                  : language === "id"
                    ? "Kirim request penghapusan"
                    : "Submit deletion request"}
              </Text>
            )}
          </Pressable>
          <Text style={styles.sectionSub}>
            {language === "id"
              ? "Support akan memverifikasi akun aktif, meninjau request, lalu memproses penghapusan atau memberi klarifikasi jika ada data yang harus ditahan sementara."
              : "Support verifies the active account, reviews the request, then processes deletion or requests clarification if some data must be retained temporarily."}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
