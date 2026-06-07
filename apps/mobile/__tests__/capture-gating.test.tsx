// Mock all native/router deps so capture.tsx module can be imported for its
// exported helpers without triggering RN/expo-router transforms.
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("../src/lib/supabase", () => ({ supabase: {}, useSupabase: () => ({ supabase: {} }) }));
jest.mock("../src/hooks/useTransactionRealtime", () => ({ useTransactionRealtime: () => ({ loading: false, transaction: null }) }));
jest.mock("../src/i18n/i18n-context", () => ({ useI18n: () => ({ language: "id" }) }));
jest.mock("../src/theme/theme-context", () => ({ useTheme: () => ({ theme: { colors: {}, typography: { fontSize: {}, fontWeight: {}, letterSpacing: {} }, radius: {}, iconBubbles: { primary: {} } } }) }));
jest.mock("../src/components/motion", () => ({ PageEntrance: ({ children }: any) => children, StaggeredStack: ({ children }: any) => children }));
jest.mock("../src/components/ui", () => ({ IconBubble: () => null }));
jest.mock("../src/components/icons/kaswise-icons", () => ({ KaswiseIcon: () => null }));
jest.mock("../src/services/budget-envelopes", () => ({ createEnvelopeAllocation: jest.fn() }));
jest.mock("../src/services/transactions", () => ({ createTransaction: jest.fn() }));
jest.mock("../src/services/receipt-intake", () => ({ analyzeReceiptImage: jest.fn(), getReceiptAuthSession: jest.fn(), receiptExtractionToDraft: jest.fn(), uploadReceiptImage: jest.fn() }));
jest.mock("../src/services/categories", () => ({ listCategories: jest.fn(async () => []) }));
jest.mock("../src/services/wallets", () => ({ listWallets: jest.fn(async () => []) }));
jest.mock("../src/state/finance-context", () => ({ useFinanceContext: () => ({ activeContext: { type: "personal" }, canCreate: true }) }));
jest.mock("../src/services/transaction-classifier", () => ({ classifyTransactionTextBatch: jest.fn(() => []), CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD: 0.8 }));
jest.mock("../src/services/category-taxonomy", () => ({ getLocalizedCategoryName: (n: string) => n }));
jest.mock("expo-image-picker", () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock("../src/hooks/useEntitlements", () => ({ useEntitlements: () => ({ data: null, loading: false, refresh: jest.fn() }) }));

import { photoLocked, quotaLabel } from "../app/(tabs)/capture";

test("photo locked when limit 0 (free)", () => {
  expect(photoLocked({ photo_limit: 0 } as any)).toBe(true);
  expect(photoLocked({ photo_limit: 100 } as any)).toBe(false);
  expect(photoLocked(null)).toBe(false);
});

test("quota label shows used/limit", () => {
  expect(quotaLabel({ chat_used: 3, chat_limit: 25 } as any)).toBe("Chat AI: 3/25");
  expect(quotaLabel(null)).toBe("");
});
