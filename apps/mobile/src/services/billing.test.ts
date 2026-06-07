import { getEntitlements, createPayment, getPricing, getPaymentStatus } from "./billing";

jest.mock("./receipt-intake", () => ({ getApiBaseUrl: () => "https://api.test" }));

const fakeSupabase: any = {
  auth: { getSession: async () => ({ data: { session: { access_token: "tok" } } }) },
};

afterEach(() => jest.restoreAllMocks());

test("getEntitlements calls backend with bearer token", async () => {
  const json = { plan: "free", chat_used: 3, chat_limit: 25, photo_used: 0, photo_limit: 0 };
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => json })) as any;
  const out = await getEntitlements(fakeSupabase);
  expect(out.plan).toBe("free");
  const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toBe("https://api.test/api/v1/me/entitlements");
  expect(opts.headers.Authorization).toBe("Bearer tok");
});

test("createPayment posts plan and returns snap data", async () => {
  const json = { snap_token: "tok-1", redirect_url: "https://snap/x", amount: 29000 };
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => json })) as any;
  const out = await createPayment(fakeSupabase, "monthly");
  expect(out.redirect_url).toBe("https://snap/x");
  const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toBe("https://api.test/api/v1/payments/create");
  expect(JSON.parse(opts.body)).toEqual({ plan: "monthly" });
});

test("getPricing returns tier + prices", async () => {
  const json = { tier: "promo", monthly: 29000, yearly: 249000 };
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => json })) as any;
  const out = await getPricing(fakeSupabase);
  expect(out.tier).toBe("promo");
});

test("getPaymentStatus hits status endpoint", async () => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200,
    json: async () => ({ order_id: "kw-x", status: "paid" }) })) as any;
  const out = await getPaymentStatus(fakeSupabase, "kw-x");
  expect(out.status).toBe("paid");
  expect((global.fetch as jest.Mock).mock.calls[0][0])
    .toBe("https://api.test/api/v1/payments/kw-x/status");
});
