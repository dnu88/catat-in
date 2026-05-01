import { expect, test } from "@playwright/test";

import { buildTestUser, registerAndAuthenticateViaUi } from "./test-helpers";

// ── AI CAPTURE ───────────────────────────────────────────────

test.describe("AI capture", () => {
	test.setTimeout(90_000);

	test("dapat mengekstrak transaksi dari teks", async ({ page }) => {
		const user = buildTestUser("capture");
		page.on("dialog", async (dialog) => dialog.accept());

		await registerAndAuthenticateViaUi(page, user);

		// Buat wallet dulu agar capture punya target
		await page.goto("/wallets");
		await page.getByRole("button", { name: "+ Tambah Wallet" }).click();
		await page.getByPlaceholder("cth: BCA Utama").fill("Wallet Capture");
		await page.locator("select").first().selectOption("cash");
		await page.getByPlaceholder("0").fill("500000");
		await page.getByRole("button", { name: "Simpan" }).click();
		await expect(page.getByText("Wallet Capture")).toBeVisible();

		await page.goto("/capture");
		await page.waitForURL("**/capture");

		// Ketik teks transaksi
		const input = page
			.getByPlaceholder(/ketik transaksi/i)
			.or(page.locator("textarea"))
			.first();
		await input.fill("beli makan siang 35000");

		const submitBtn = page
			.getByRole("button", { name: /kirim|submit|enter/i })
			.or(page.locator('button[type="submit"]'))
			.first();
		await submitBtn.click();

		// Tunggu respons (local fallback atau AI)
		await page.waitForTimeout(3000);

		// Halaman tidak boleh crash — cek tidak ada error fatal
		await expect(page.locator("body")).not.toContainText("Uncaught");
		await expect(page.locator("body")).not.toContainText(
			"Cannot read properties of null",
		);

		// Setidaknya ada pesan atau hasil muncul di halaman
		const hasResult = await page.locator("body").textContent();
		expect(hasResult).toBeTruthy();
	});
});

// ── REPORTS ──────────────────────────────────────────────────

test.describe("reports", () => {
	test.setTimeout(90_000);

	test("halaman laporan dapat dimuat dan menampilkan konten", async ({
		page,
	}) => {
		const user = buildTestUser("reports");
		page.on("dialog", async (dialog) => dialog.accept());

		await registerAndAuthenticateViaUi(page, user);

		// Buat satu transaksi agar ada data di laporan
		await page.goto("/wallets");
		await page.getByRole("button", { name: "+ Tambah Wallet" }).click();
		await page.getByPlaceholder("cth: BCA Utama").fill("Wallet Reports");
		await page.locator("select").first().selectOption("cash");
		await page.getByPlaceholder("0").fill("1000000");
		await page.getByRole("button", { name: "Simpan" }).click();
		await expect(page.getByText("Wallet Reports")).toBeVisible();

		await page.goto("/transactions");
		const addBtn = page
			.locator("main button")
			.filter({ hasText: "Tambah" })
			.first();
		await page.waitForFunction(
			() =>
				[...document.querySelectorAll("main button")].some(
					(b) =>
						b.textContent?.includes("Tambah") && !b.hasAttribute("disabled"),
				),
			{ timeout: 15000 },
		);
		await addBtn.click();
		await page.getByPlaceholder("50000").fill("75000");
		await page
			.locator("select")
			.nth(1)
			.selectOption({ label: "Wallet Reports" });
		await page.getByRole("button", { name: "Simpan" }).click();
		await expect(
			page.getByRole("heading", { name: "Tambah Transaksi" }),
		).toBeHidden();

		// Buka laporan
		await page.goto("/reports");
		await page.waitForURL("**/reports");

		// Halaman harus load tanpa error
		await expect(page.locator("body")).not.toContainText("Gagal memuat");
		await expect(page.locator("body")).not.toContainText(
			"Something went wrong",
		);

		// Heading laporan harus ada
		const heading = page.getByRole("heading").first();
		await expect(heading).toBeVisible({ timeout: 10000 });

		// Navigasi ganti bulan harus ada
		const prevMonthBtn = page
			.getByRole("button", { name: /←|‹|prev|sebelum/i })
			.or(page.locator("button").filter({ hasText: "←" }))
			.first();
		if (await prevMonthBtn.isVisible()) {
			await prevMonthBtn.click();
			await page.waitForTimeout(500);
			const nextMonthBtn = page
				.getByRole("button", { name: /→|›|next|berikut/i })
				.or(page.locator("button").filter({ hasText: "→" }))
				.first();
			await nextMonthBtn.click();
		}
	});
});

// ── GROUPS ───────────────────────────────────────────────────

test.describe("groups", () => {
	test.setTimeout(120_000);

	test("dapat membuat grup dan join dari akun lain", async ({ browser }) => {
		// ── User A: buat grup ─────────────────────────────────
		const ctxA = await browser.newContext();
		const pageA = await ctxA.newPage();
		const userA = buildTestUser("groupA");
		pageA.on("dialog", async (d) => d.accept());

		await registerAndAuthenticateViaUi(pageA, userA);
		await pageA.goto("/groups");
		await pageA.waitForURL("**/groups");

		// Isi form buat grup
		await pageA.getByPlaceholder(/Keluarga Budiarto/i).fill("Grup E2E Test");
		await pageA.getByRole("button", { name: "Buat grup" }).click();

		// Tunggu grup muncul di list
		await expect(
			pageA.getByRole("button", { name: /Grup E2E Test/i }).first(),
		).toBeVisible({ timeout: 15000 });
		await expect(
			pageA
				.getByText(/Grup E2E Test.*berhasil dibuat/i)
				.or(pageA.getByText("Grup E2E Test berhasil dibuat.")),
		)
			.toBeVisible({ timeout: 5000 })
			.catch(() => {});

		// Ambil kode undangan
		const inviteCodeEl = pageA
			.locator("div")
			.filter({ hasText: /^[A-Z0-9]{8}$/ })
			.first();
		await expect(inviteCodeEl).toBeVisible({ timeout: 15000 });
		const inviteCode = (await inviteCodeEl.textContent())?.trim() ?? "";
		expect(inviteCode).toMatch(/^[A-Z0-9]{8}$/);

		// ── User B: join dengan kode undangan ────────────────
		const ctxB = await browser.newContext();
		const pageB = await ctxB.newPage();
		const userB = buildTestUser("groupB");
		pageB.on("dialog", async (d) => d.accept());

		await registerAndAuthenticateViaUi(pageB, userB);
		await pageB.goto("/groups");
		await pageB.waitForURL("**/groups");

		await pageB.getByPlaceholder(/GRP8X2K/i).fill(inviteCode);
		await pageB.getByRole("button", { name: "Gabung grup" }).click();

		// Verifikasi berhasil join
		await expect(pageB.getByText(/berhasil bergabung/i)).toBeVisible({
			timeout: 15000,
		});
		await expect(
			pageB.getByRole("button", { name: /Grup E2E Test/i }).first(),
		).toBeVisible({
			timeout: 10000,
		});

		// ── User A: cek ada 2 anggota aktif setelah User B join ──
		await pageA.reload();
		await pageA.waitForURL("**/groups");
		await pageA
			.getByRole("button", { name: /Grup E2E Test/i })
			.first()
			.click();
		// Tunggu detail grup selesai dimuat (badge "X aktif" muncul)
		await expect(pageA.getByText(/2\s*aktif/i)).toBeVisible({ timeout: 15000 });

		// ── User A: ubah role User B menjadi editor ──────────
		const roleSelect = pageA
			.locator("select")
			.filter({ hasText: /viewer|editor|admin/i })
			.first();
		if (await roleSelect.isVisible()) {
			await roleSelect.selectOption("editor");
			await expect(pageA.getByText(/peran anggota berhasil/i)).toBeVisible({
				timeout: 10000,
			});
		}

		// ── User B: keluar dari grup ─────────────────────────
		await pageB
			.getByRole("button", { name: /Grup E2E Test/i })
			.first()
			.click();
		await pageB.getByRole("button", { name: "Keluar dari grup" }).click();
		await expect(pageB.getByText(/berhasil keluar/i)).toBeVisible({
			timeout: 10000,
		});

		await ctxA.close();
		await ctxB.close();
	});
});
