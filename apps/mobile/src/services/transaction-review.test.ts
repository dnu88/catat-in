import { getTransactionReviewSummary } from "./transaction-review";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase");

// Helper: builds a mock chain for supabase.from("transactions").select("*").order(...).limit(...)
function mockQueryChain(opts: {
  rows?: any[];
  error?: any;
  mockEq?: jest.Mock;
}) {
  const { rows = [], error = null } = opts;
  const mockThen = jest
    .fn()
    .mockImplementation((cb: Function) =>
      Promise.resolve(cb({ data: rows, error })),
    );

  const mockIs = jest.fn().mockReturnValue({ then: mockThen });
  const eqFn = opts.mockEq ?? jest.fn().mockReturnValue({ then: mockThen });
  const mockLimit = jest.fn().mockReturnValue({ is: mockIs, eq: eqFn });

  const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
  const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });

  (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });
  (supabase as any).auth = {
    getUser: jest
      .fn()
      .mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
  };

  return { mockEq: eqFn, mockLimit };
}

function tx(overrides: any = {}): any {
  return {
    id: overrides.id ?? "tx-1",
    user_id: "u1",
    type: "expense",
    nominal: 50000,
    kategori: "Food",
    catatan: "Lunch",
    tanggal: "2026-06-10",
    confidence: 0.9,
    review_required: false,
    is_verified: false,
    household_id: null,
    ...overrides,
  };
}

describe("Transaction Review Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns empty for clean transactions", async () => {
    mockQueryChain({ rows: [tx(), tx({ id: "tx-2" })] });

    const result = await getTransactionReviewSummary({ type: "personal" });
    expect(result.summary.count).toBe(0);
    expect(result.transactions).toHaveLength(0);
  });

  test("flags review_required transactions", async () => {
    mockQueryChain({
      rows: [tx(), tx({ id: "tx-2", review_required: true })],
    });

    const result = await getTransactionReviewSummary({ type: "personal" });
    expect(result.summary.count).toBe(1);
    expect(result.summary.reasons.review_required).toBe(1);
    expect(result.transactions[0].id).toBe("tx-2");
  });

  test("ignores verified transactions even if they were previously low confidence", async () => {
    mockQueryChain({
      rows: [
        tx({
          id: "tx-verified",
          review_required: true,
          confidence: 0.2,
          kategori: "Lainnya",
          nominal: 0,
          is_verified: true,
        }),
      ],
    });

    const result = await getTransactionReviewSummary({ type: "personal" });
    expect(result.summary.count).toBe(0);
    expect(result.summary.reasons.review_required).toBe(0);
    expect(result.summary.reasons.low_confidence).toBe(0);
    expect(result.transactions).toHaveLength(0);
  });

  test("flags low confidence transactions (below 0.5)", async () => {
    mockQueryChain({
      rows: [
        tx(),
        tx({ id: "tx-2", confidence: 0.3 }),
        tx({ id: "tx-3", confidence: 0.49 }),
        tx({ id: "tx-4", confidence: 0.9 }),
      ],
    });

    const result = await getTransactionReviewSummary({ type: "personal" });
    expect(result.summary.reasons.low_confidence).toBe(2);
    expect(result.summary.count).toBe(2);
    expect(result.transactions.map((t) => t.id)).toEqual(["tx-2", "tx-3"]);
  });

  test("flags 'Lainnya' and 'Other' categories", async () => {
    mockQueryChain({
      rows: [
        tx({ id: "tx-1", kategori: "Lainnya" }),
        tx({ id: "tx-2", kategori: "Other" }),
        tx({ id: "tx-3", kategori: "Other expenses" }),
        tx({ id: "tx-4", kategori: "Food" }),
      ],
    });

    const result = await getTransactionReviewSummary({ type: "personal" });
    expect(result.summary.reasons.other_category).toBe(3);
    expect(result.transactions.map((t) => t.id)).toEqual([
      "tx-1",
      "tx-2",
      "tx-3",
    ]);
  });

  test("flags missing fields (amount/category/date)", async () => {
    mockQueryChain({
      rows: [
        tx({ id: "tx-1", nominal: 0 }),
        tx({ id: "tx-2", kategori: "" }),
        tx({ id: "tx-3", tanggal: "" }),
        tx({
          id: "tx-4",
          nominal: 50000,
          kategori: "Food",
          tanggal: "2026-06-10",
        }),
      ],
    });

    const result = await getTransactionReviewSummary({ type: "personal" });
    expect(result.summary.reasons.missing_fields).toBe(3);
    expect(result.transactions.map((t) => t.id)).toEqual([
      "tx-1",
      "tx-2",
      "tx-3",
    ]);
  });

  test("one transaction can have multiple review reasons", async () => {
    mockQueryChain({
      rows: [
        tx({
          id: "tx-bad",
          review_required: true,
          confidence: 0.3,
          kategori: "Lainnya",
          nominal: 0,
        }),
      ],
    });

    const result = await getTransactionReviewSummary({ type: "personal" });
    expect(result.summary.count).toBe(1);
    expect(result.summary.reasons.review_required).toBe(1);
    expect(result.summary.reasons.low_confidence).toBe(1);
    expect(result.summary.reasons.other_category).toBe(1);
    expect(result.summary.reasons.missing_fields).toBe(1);
  });

  test("applies household context filter", async () => {
    const mockEq = jest.fn().mockReturnValue({
      then: jest.fn().mockImplementation((cb: Function) =>
        Promise.resolve(cb({ data: [], error: null })),
      ),
    });
    mockQueryChain({ rows: [], mockEq });

    await getTransactionReviewSummary({
      type: "household",
      householdId: "h-oo",
      role: "owner",
    });

    expect(mockEq).toHaveBeenCalledWith("household_id", "h-oo");
  });

  test("respects limit parameter", async () => {
    const { mockLimit } = mockQueryChain({ rows: [] });

    await getTransactionReviewSummary({ type: "personal" }, 25);
    expect(mockLimit).toHaveBeenCalledWith(25);
  });

  test("propagates database errors", async () => {
    const mockThen = jest
      .fn()
      .mockImplementation((_onFulfilled: any, onRejected: any) => {
        onRejected(new Error("DB connection lost"));
      });
    const mockQuery = {
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({ then: mockThen }),
        }),
      }),
    };
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue(mockQuery),
    });
    (supabase as any).auth = {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
    };

    await expect(
      getTransactionReviewSummary({ type: "personal" }),
    ).rejects.toThrow("DB connection lost");
  });
});
