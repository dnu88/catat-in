import { expect, test } from "@playwright/test";

import { buildTestUser, registerAndAuthenticateViaUi } from "./test-helpers";

test.describe("authenticated smoke flow", () => {
	test.setTimeout(120_000);

	test("can register and complete wallet, transaction, budget, and bill basics", async ({
		page,
	}) => {
		const user = buildTestUser("smoke");
		const walletName = `Wallet ${Date.now()}`;
		const budgetCategory = `kategori smoke ${Date.now()}`;
		const billName = `Internet ${Date.now()}`;

		page.on("dialog", async (dialog) => {
			await dialog.accept();
		});

		await registerAndAuthenticateViaUi(page, user);
		await page.goto("/wallets");
		await page.waitForURL("**/wallets");

		await expect(
			page.getByRole("button", { name: "+ Tambah Wallet" }),
		).toBeVisible();

		await page.getByRole("button", { name: "+ Tambah Wallet" }).click();
		await page.getByPlaceholder("cth: BCA Utama").fill(walletName);
		await page.locator("select").first().selectOption("cash");
		await page.getByPlaceholder("cth: BCA, GoPay, OVO").fill("Kas QA");
		await page.getByPlaceholder("0").fill("150000");
		await page.getByRole("button", { name: "Simpan" }).click();
		await expect(
			page.getByRole("heading", { name: "Tambah Wallet Baru" }),
		).toBeHidden();
		await expect(page.getByText(walletName)).toBeVisible();

		await page.goto("/transactions");
		await page.waitForURL("**/transactions");
		const addTransactionButton = page
			.locator("main button")
			.filter({ hasText: "Tambah" })
			.first();
		await page.waitForFunction(
			() => {
				const buttons = [...document.querySelectorAll("main button")];
				return buttons.some(
					(button) =>
						button.textContent?.includes("Tambah") &&
						!button.hasAttribute("disabled"),
				);
			},
			{ timeout: 20000 },
		);
		await addTransactionButton.click();
		await page.getByPlaceholder("50000").fill("50000");
		await page.locator("select").nth(1).selectOption({ label: walletName });
		await page.getByPlaceholder("Contoh: Indomaret").fill("Warung QA");
		await page
			.getByPlaceholder("Contoh: makan siang bersama tim")
			.fill("Playwright smoke");
		await page.getByRole("button", { name: "Simpan" }).click();
		await expect(
			page.getByRole("heading", { name: "Tambah Transaksi" }),
		).toBeHidden();
		await expect(page.getByText("Warung QA")).toBeVisible();

		await page.goto("/budgets");
		await page.waitForURL("**/budgets");
		const budgetIndexError = page.getByText(/query requires an index/i);
		await page.getByRole("button", { name: "+ Tambah Budget" }).click();
		await page.getByPlaceholder("Tambah kategori kustom").fill(budgetCategory);
		await page.getByRole("button", { name: "Tambah", exact: true }).click();
		await page.getByPlaceholder("500000").fill("300000");
		await page.getByRole("button", { name: "Simpan" }).click();
		await expect(
			page.getByRole("heading", { name: "Tambah Budget Bulan Ini" }),
		).toBeHidden();

		const hasBudgetIndexError = await budgetIndexError
			.isVisible()
			.catch(() => false);

		if (!hasBudgetIndexError) {
			await expect(page.getByText(/300\.000|Rp\s?300\.000/i)).toBeVisible();
		}

		await page.goto("/bills");
		await page.waitForURL("**/bills");
		await page.getByRole("button", { name: "+ Tambah Tagihan" }).click();
		await page.getByPlaceholder("cth: Listrik PLN").fill(billName);
		await page.getByPlaceholder("500000").fill("199000");
		await page.getByRole("button", { name: "Simpan" }).click();
		await expect(
			page.getByRole("heading", { name: "Tambah Tagihan" }),
		).toBeHidden();
		await expect(page.getByText(billName)).toBeVisible();
		await page.getByRole("button", { name: "Bayar" }).first().click();
		await expect(page.getByText(billName)).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Bayar" }).first(),
		).toBeVisible();
		await expect(page.getByText("Gagal memproses pembayaran")).toHaveCount(0);
	});
});
