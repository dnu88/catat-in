import { getAiInsight, AiInsightPremiumRequiredError } from "./ai-insights";

jest.mock("./api-client", () => ({
  getApiBaseUrl: () => "https://api.test",
  authHeader: jest
    .fn()
    .mockResolvedValue({ Authorization: "Bearer test-token" }),
}));

const fakeSupabase: any = {
  auth: { getSession: async () => ({ data: { session: { access_token: "tok" } } }) },
};

afterEach(() => jest.restoreAllMocks());

const mockAiInsightResponse = {
  period: "monthly",
  generated_at: "2026-06-09T10:00:00Z",
  summary: "Pengeluaran Anda bulan ini naik 15% dibanding bulan lalu.",
  highlights: [
    "Kategori Makanan & Minuman mendominasi 40% pengeluaran",
    "Transaksi tertinggi: Rp 500.000 di restoran",
  ],
  recommendations: [
    "Coba batasi pengeluaran makan di luar menjadi maksimal Rp 1.500.000 per bulan",
    "Pertimbangkan untuk memasak di rumah 2x seminggu",
  ],
  risk_flags: [
    "Pengeluaran kategori Hiburan naik 200% dari bulan lalu",
  ],
  data_quality: {
    transaction_count: 47,
    has_previous_period: true,
    other_category_percent: 12.5,
  },
};

test("getAiInsight returns AiInsight object on success", async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => mockAiInsightResponse,
  })) as any;

  const result = await getAiInsight(fakeSupabase);

  expect(result.period).toBe("monthly");
  expect(result.summary).toBe(
    "Pengeluaran Anda bulan ini naik 15% dibanding bulan lalu.",
  );
  expect(result.highlights).toHaveLength(2);
  expect(result.recommendations).toHaveLength(2);
  expect(result.risk_flags).toHaveLength(1);
  expect(result.data_quality.transaction_count).toBe(47);
  expect(result.data_quality.has_previous_period).toBe(true);
  expect(result.data_quality.other_category_percent).toBe(12.5);
});

test("getAiInsight throws AiInsightPremiumRequiredError on 402", async () => {
  global.fetch = jest.fn(async () => ({
    ok: false,
    status: 402,
    json: async () => ({ detail: "Premium required" }),
  })) as any;

  await expect(getAiInsight(fakeSupabase)).rejects.toThrow(
    AiInsightPremiumRequiredError,
  );
});

test("getAiInsight throws AiInsightPremiumRequiredError on 403", async () => {
  global.fetch = jest.fn(async () => ({
    ok: false,
    status: 403,
    json: async () => ({ detail: "Forbidden" }),
  })) as any;

  await expect(getAiInsight(fakeSupabase)).rejects.toThrow(
    AiInsightPremiumRequiredError,
  );
});

test("getAiInsight throws generic error on 500", async () => {
  global.fetch = jest.fn(async () => ({
    ok: false,
    status: 500,
    json: async () => ({ detail: "Internal server error" }),
  })) as any;

  await expect(getAiInsight(fakeSupabase)).rejects.toThrow(
    "Gagal memuat insight AI (500)",
  );
});

test("getAiInsight calls correct URL with POST method", async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => mockAiInsightResponse,
  })) as any;

  await getAiInsight(fakeSupabase);

  const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toBe("https://api.test/api/v1/ai/insight");
  expect(opts.method).toBe("POST");
});

test("getAiInsight passes auth header", async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => mockAiInsightResponse,
  })) as any;

  await getAiInsight(fakeSupabase);

  const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
  expect(opts.headers.Authorization).toBe("Bearer test-token");
});

test("getAiInsight sends period in request body", async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => mockAiInsightResponse,
  })) as any;

  await getAiInsight(fakeSupabase, "weekly");

  const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
  expect(JSON.parse(opts.body)).toEqual({ period: "weekly" });
});

test("getAiInsight defaults period to monthly when not provided", async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => mockAiInsightResponse,
  })) as any;

  await getAiInsight(fakeSupabase);

  const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
  expect(JSON.parse(opts.body)).toEqual({ period: "monthly" });
});
