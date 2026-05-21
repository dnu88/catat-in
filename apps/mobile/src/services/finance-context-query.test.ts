import {
  applyFinanceContextFilter,
  buildFinanceInsertAudit,
  canCreateInContext,
  canDeleteInContext,
  canUpdateInContext,
  type FinanceContext,
} from "./finance-context-query";

function makeQueryRecorder() {
  const calls: Array<[string, string, unknown?]> = [];
  const query = {
    is(column: string, value: unknown) {
      calls.push(["is", column, value]);
      return query;
    },
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
  };
  return { query, calls };
}

describe("finance context query helpers", () => {
  it("filters personal rows to household_id is null", () => {
    const { query, calls } = makeQueryRecorder();

    applyFinanceContextFilter(query, { type: "personal" });

    expect(calls).toEqual([["is", "household_id", null]]);
  });

  it("filters household rows by active household id", () => {
    const { query, calls } = makeQueryRecorder();

    applyFinanceContextFilter(query, {
      type: "household",
      householdId: "hh-1",
      role: "member",
    });

    expect(calls).toEqual([["eq", "household_id", "hh-1"]]);
  });

  it("builds personal insert audit fields without household_id", () => {
    expect(buildFinanceInsertAudit({ type: "personal" }, "user-1")).toEqual({
      user_id: "user-1",
      household_id: null,
      created_by: "user-1",
      updated_by: "user-1",
    });
  });

  it("builds household insert audit fields with household id", () => {
    expect(
      buildFinanceInsertAudit(
        { type: "household", householdId: "hh-1", role: "admin" },
        "user-1",
      ),
    ).toEqual({
      user_id: "user-1",
      household_id: "hh-1",
      created_by: "user-1",
      updated_by: "user-1",
    });
  });

  it("allows owner/admin/member to create but viewer cannot create", () => {
    expect(canCreateInContext({ type: "personal" })).toBe(true);
    expect(
      canCreateInContext({
        type: "household",
        householdId: "hh-1",
        role: "owner",
      }),
    ).toBe(true);
    expect(
      canCreateInContext({
        type: "household",
        householdId: "hh-1",
        role: "admin",
      }),
    ).toBe(true);
    expect(
      canCreateInContext({
        type: "household",
        householdId: "hh-1",
        role: "member",
      }),
    ).toBe(true);
    expect(
      canCreateInContext({
        type: "household",
        householdId: "hh-1",
        role: "viewer",
      }),
    ).toBe(false);
  });

  it("limits member update/delete to rows they created", () => {
    const member: FinanceContext = {
      type: "household",
      householdId: "hh-1",
      role: "member",
    };
    const ownRow = { household_id: "hh-1", created_by: "user-1" };
    const otherRow = { household_id: "hh-1", created_by: "user-2" };

    expect(canUpdateInContext(member, ownRow, "user-1")).toBe(true);
    expect(canDeleteInContext(member, ownRow, "user-1")).toBe(true);
    expect(canUpdateInContext(member, otherRow, "user-1")).toBe(false);
    expect(canDeleteInContext(member, otherRow, "user-1")).toBe(false);
  });
});
