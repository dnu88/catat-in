declare const require: (id: string) => any;
declare const __dirname: string;

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const appRoot = path.join(__dirname, "..", "app");
const mobileRoot = path.join(__dirname, "..");

function readRoute(relativePath: string) {
	return fs.readFileSync(path.join(appRoot, relativePath), "utf8");
}

function listRouteFiles(dir: string): string[] {
	return fs.readdirSync(dir).flatMap((entry: string) => {
		const fullPath = path.join(dir, entry);
		const stat = fs.statSync(fullPath);
		if (stat.isDirectory()) return listRouteFiles(fullPath);
		return fullPath.endsWith(".tsx") ? [fullPath] : [];
	});
}

function jsxTagName(node: any) {
	const tag = node.tagName;
	return tag?.escapedText ?? tag?.getText?.() ?? "unknown";
}

function hasJsxAttribute(attributes: any, name: string) {
	return attributes.properties.some(
		(attribute: any) => attribute.name?.escapedText === name,
	);
}

function collectExpressionElements(expression: any, elements: any[] = []) {
	if (!expression) return elements;
	if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression)) {
		elements.push(expression);
		return elements;
	}
	if (ts.isParenthesizedExpression(expression)) {
		return collectExpressionElements(expression.expression, elements);
	}
	if (ts.isConditionalExpression(expression)) {
		collectExpressionElements(expression.whenTrue, elements);
		collectExpressionElements(expression.whenFalse, elements);
		return elements;
	}
	if (ts.isBinaryExpression(expression)) {
		collectExpressionElements(expression.right, elements);
		return elements;
	}
	if (ts.isJsxFragment(expression)) {
		expression.children.forEach((child: any) => {
			if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
				elements.push(child);
			} else if (ts.isJsxExpression(child)) {
				collectExpressionElements(child.expression, elements);
			}
		});
	}
	return elements;
}

function assertStackChildHasStableIdentity(file: string, sourceFile: any, element: any) {
	const openingElement = ts.isJsxElement(element)
		? element.openingElement
		: element;
	const attributes = openingElement.attributes;
	const hasStableIdentity =
		hasJsxAttribute(attributes, "key") ||
		hasJsxAttribute(attributes, "testID") ||
		hasJsxAttribute(attributes, "accessibilityLabel");
	if (!hasStableIdentity) {
		const position = sourceFile.getLineAndCharacterOfPosition(element.getStart(sourceFile));
		throw new Error(
			`${file}:${position.line + 1} ${jsxTagName(openingElement)} is a direct StaggeredStack child without key/testID/accessibilityLabel`,
		);
	}
}

function assertRouteStackChildrenHaveStableIdentity(file: string) {
	const source = fs.readFileSync(file, "utf8");
	if (!source.includes("StaggeredStack")) return;

	const sourceFile = ts.createSourceFile(
		file,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);

	function visit(node: any) {
		if (ts.isJsxElement(node) && jsxTagName(node.openingElement) === "StaggeredStack") {
			node.children.forEach((child: any) => {
				if (ts.isJsxText(child) && !child.getText().trim()) return;
				if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
					assertStackChildHasStableIdentity(file, sourceFile, child);
					return;
				}
				if (ts.isJsxExpression(child)) {
					collectExpressionElements(child.expression).forEach((element) =>
						assertStackChildHasStableIdentity(file, sourceFile, element),
					);
				}
			});
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
}

describe("motion coverage across mobile routes", () => {
	const tabScreens = [
		"index",
		"transactions",
		"capture",
		"reports",
		"settings",
		"wallets",
		"budgets",
		"bills",
		"groups",
		"imports",
		"transaction-new",
	];

	it.each(tabScreens)("applies page and content entrance to %s tab route", (screen) => {
		const source = readRoute(`(tabs)/${screen}.tsx`);

		expect(source).toContain("PageEntrance");
		expect(source).toMatch(/Staggered(Entrance|Stack)/);
		expect(source).toContain(`testID=\"${screen === "index" ? "home" : screen}-page-entrance\"`);
	});

	it.each(["login", "register", "forgot-password"])(
		"applies staggered content entrance to %s auth route",
		(screen) => {
			const source = readRoute(`(auth)/${screen}.tsx`);

			expect(source).toMatch(/Staggered(Entrance|Stack)/);
		},
	);


	it("staggers actual import sections instead of a single wrapper component", () => {
		const source = readRoute("(tabs)/imports.tsx");
		const stackStart = source.indexOf('<StaggeredStack testIDPrefix="imports-entrance">');
		const stackEnd = source.indexOf("</StaggeredStack>", stackStart);
		const stackSource = source.slice(stackStart, stackEnd);

		expect(stackStart).toBeGreaterThanOrEqual(0);
		expect(stackSource).not.toContain("<ListHeader />");
		[
			'key="import-header"',
			'key="import-hero"',
			'key="import-methods"',
			'key="import-history-header"',
			'key="import-history-list"',
			'key="import-placeholder"',
		].forEach((sectionKey) => expect(stackSource).toContain(sectionKey));
	});

	it("uses stable stack child keys instead of index-only wrapper keys", () => {
		const source = fs.readFileSync(
			path.join(mobileRoot, "src", "components", "motion", "entrance.tsx"),
			"utf8",
		);

		expect(source).toContain("getStableStackChildKey");
		expect(source).not.toContain("fallbackKeys");
		expect(source).not.toContain("slot-${index}");
		expect(source).not.toContain("key={`${testIDPrefix}-${index}`}");
	});

	it("keys dynamic screen sections that appear after conditional content", () => {
		const expectedKeysByRoute: Record<string, string[]> = {
			"(tabs)/budgets.tsx": [
				'key="budgets-create-form"',
				'key="budgets-overview"',
				'key="budgets-active-title"',
			],
			"(tabs)/wallets.tsx": [
				'key="wallet-edit-form"',
				'key="wallet-create-form"',
				'key="wallets-total-hero"',
				'key="wallets-filter"',
				'key="wallets-empty"',
			],
			"(tabs)/bills.tsx": [
				'key="bills-overdue-alert"',
				'key="bills-summary"',
				'key="bills-filter"',
			],
			"(tabs)/groups.tsx": [
				'key="groups-create-form"',
				'key="groups-join-form"',
				'key="groups-empty"',
			],
		};

		Object.entries(expectedKeysByRoute).forEach(([route, expectedKeys]) => {
			const source = readRoute(route);
			expectedKeys.forEach((sectionKey) => expect(source).toContain(sectionKey));
		});
	});

	it("requires stable identity on every direct route StaggeredStack child", () => {
		listRouteFiles(appRoot).forEach(assertRouteStackChildrenHaveStableIdentity);
	});

	it.each(["transactions", "bills"])(
		"uses a memoized FlatList header element for %s motion sections",
		(screen) => {
			const source = readRoute(`(tabs)/${screen}.tsx`);

			expect(source).toContain("const listHeader = useMemo(() => (");
			expect(source).toContain("ListHeaderComponent={listHeader}");
			expect(source).not.toContain("const ListHeader = () => (");
			expect(source).not.toContain("ListHeaderComponent={ListHeader}");
		},
	);

	it("keeps root and auth stack page transition config", () => {
		expect(readRoute("_layout.tsx")).toContain("createKaswiseStackScreenOptions");
		expect(readRoute("(auth)/_layout.tsx")).toContain(
			"createKaswiseStackScreenOptions",
		);
	});
});
