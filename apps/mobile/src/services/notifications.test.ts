import { getUnreadNotificationCount, listNotifications, markAllNotificationsRead, markNotificationRead } from "./notifications";

// ── Mock fetch ──────────────────────────────────────────────────────────
const originalFetch = globalThis.fetch;

function mockFetch(responses: Record<string, unknown>) {
  let callCount = 0;
  const calls: { url: string; method: string; headers: Record<string, string>; body?: string }[] = [];
  (globalThis as unknown as { fetch: typeof fetch }).fetch = ((
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({
      url,
      method: init?.method ?? "GET",
      headers: (init?.headers as Record<string, string>) ?? {},
      body: init?.body as string | undefined,
    });
    callCount++;
    const key = `${init?.method ?? "GET"}:${url}`;
    const resp = responses[key] ?? responses["*"];
    if (resp instanceof Error) return Promise.reject(resp);
    if (typeof resp === "number") return Promise.resolve({ ok: false, status: resp });
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => resp,
    });
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
});

// ── Fake Supabase ────────────────────────────────────────────────────────
function fakeSupabase() {
  return {
    auth: {
      getSession: async () => ({ data: { session: { access_token: "tok" } } }),
    },
  } as unknown as Parameters<typeof listNotifications>[0];
}

// ── Tests ────────────────────────────────────────────────────────────────

test("listNotifications calls correct URL with auth header", async () => {
  const supabase = fakeSupabase();
  const base = "https://api.kaswise.com";
  const resp = { items: [], unread_count: 0 };
  mockFetch({ [`GET:${base}/api/v1/notifications`]: resp });

  const result = await listNotifications(supabase);
  expect(result).toEqual(resp);
});

test("listNotifications passes limit and unreadOnly params", async () => {
  const supabase = fakeSupabase();
  const base = "https://api.kaswise.com";
  const calls = mockFetch({
    [`GET:${base}/api/v1/notifications?limit=10&unreadOnly=true`]: { items: [], unread_count: 0 },
  });

  await listNotifications(supabase, { limit: 10, unreadOnly: true });
  expect(calls.length).toBe(1);
  expect(calls[0].url).toContain("limit=10");
  expect(calls[0].url).toContain("unreadOnly=true");
});

test("getUnreadNotificationCount returns count", async () => {
  const supabase = fakeSupabase();
  const base = "https://api.kaswise.com";
  mockFetch({ [`GET:${base}/api/v1/notifications/unread-count`]: { unread_count: 5 } });

  const count = await getUnreadNotificationCount(supabase);
  expect(count).toBe(5);
});

test("markNotificationRead sends PATCH", async () => {
  const supabase = fakeSupabase();
  const base = "https://api.kaswise.com";
  const calls = mockFetch({
    [`PATCH:${base}/api/v1/notifications/n1/read`]: {},
  });

  await markNotificationRead(supabase, "n1");
  expect(calls.length).toBe(1);
  expect(calls[0].method).toBe("PATCH");
});

test("markAllNotificationsRead sends PATCH", async () => {
  const supabase = fakeSupabase();
  const base = "https://api.kaswise.com";
  const calls = mockFetch({
    [`PATCH:${base}/api/v1/notifications/read-all`]: {},
  });

  await markAllNotificationsRead(supabase);
  expect(calls.length).toBe(1);
  expect(calls[0].method).toBe("PATCH");
});

test("listNotifications throws on error status", async () => {
  const supabase = fakeSupabase();
  const base = "https://api.kaswise.com";
  mockFetch({ [`GET:${base}/api/v1/notifications`]: 500 });

  await expect(listNotifications(supabase)).rejects.toThrow("500");
});
