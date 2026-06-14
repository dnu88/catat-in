import { KASWISE_PUBLIC_WEB_URL, KASWISE_SUPPORT_EMAIL, KASWISE_LEGAL_URLS } from "../src/config/legal-links";

describe("KASWISE_LEGAL_URLS", () => {
  it("points privacy, terms, and contact to public production pages", () => {
    expect(KASWISE_PUBLIC_WEB_URL).toBe("https://kaswise.com");
    expect(KASWISE_SUPPORT_EMAIL).toBe("kaswise.id@gmail.com");
    expect(KASWISE_LEGAL_URLS.privacy).toBe("https://kaswise.com/privacy");
    expect(KASWISE_LEGAL_URLS.terms).toBe("https://kaswise.com/terms");
    expect(KASWISE_LEGAL_URLS.contact).toBe("https://kaswise.com/contact");
  });

  it("exposes a public account deletion page for mobile settings", () => {
    expect(KASWISE_LEGAL_URLS.accountDeletion).toBe("https://kaswise.com/account-deletion");
  });
});
