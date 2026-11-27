"""Normalize legacy Indonesian `kategori` text on transactions to the user's
canonical English categories, and (after the category-discipline migration)
backfill `transactions.category_id`.

This is a one-off operational tool, run manually by an operator. It does NOT
run during normal request flow.

Why it exists
-------------
Production rows carry mixed-language `kategori` text (e.g. "Makan & Minum"
alongside the user's canonical "Food & Beverage"). Category discipline moves
transactions to FK-backed `category_id`; this script maps the legacy text to
the canonical category the user actually owns, backfills `category_id`, and
re-points transactions from duplicate categories (e.g. "Kartu Kredit" vs
"Credit Card") to the canonical one — WITHOUT deleting the duplicate category
row (that is left for the user/product to decide).

Mappings (source text → canonical category name):

    Makan & Minum              → Food & Beverage
    Belanja Bulanan            → Groceries
    Transportasi               → Transport
    Kebutuhan Rumah & Pribadi  → Household & Personal Care
    Olahraga                   → Sport
    Gaji                       → Salary
    Lainnya                    → Other expenses

A mapping only applies for a user who actually owns a category with the
canonical name; users without it are reported as a GAP (the script never
creates categories).

Usage
-----
Run from the backend directory with production env loaded:

    # Dry-run (default) — read-only report, writes nothing.
    uv run python scripts/normalize_legacy_categories.py

    # Apply (writes! creates a JSON backup first):
    uv run python scripts/normalize_legacy_categories.py --execute

    # Roll back a previous --execute from its backup file:
    uv run python scripts/normalize_legacy_categories.py --rollback backups/normalize-categories-<ts>.json

Safety
------
* Dry-run is the default; ``--execute`` is required to write.
* Reads go through the service-role client (RLS bypass is required because the
  script must report across all users). Production is only ever written by
  ``--execute`` / ``--rollback``, never by the dry-run.
* Idempotent: rows already matching the target are skipped on every run.
* No secrets are printed. Credentials come from SUPABASE_URL /
  SUPABASE_SERVICE_ROLE_KEY in the environment or ``--env-file``.
* Requires the ``202611280001_category_discipline`` migration (category_id
  column) for ``--execute`` / ``--rollback``; dry-run works without it.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# Make ``app.*`` importable when run as a standalone script.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("normalize_legacy_categories")

LEGACY_TO_CANONICAL: dict[str, str] = {
    "Makan & Minum": "Food & Beverage",
    "Belanja Bulanan": "Groceries",
    "Transportasi": "Transport",
    "Kebutuhan Rumah & Pribadi": "Household & Personal Care",
    "Olahraga": "Sport",
    "Gaji": "Salary",
    "Lainnya": "Other expenses",
    # Danu 28 Nov: nilai tak terpetakan dipetakan ke kategori yang cocok.
    "food": "Food & Beverage",
    "Makanan": "Food & Beverage",
    "Makanan & Minuman": "Food & Beverage",
    "Makan": "Food & Beverage",
    "Kesehatan": "Health",
    "Hiburan": "Entertainment",
    "Belanja Pribadi": "Personal Shopping",
    "housing": "Household & Personal Care",
    "Hadiah & Donasi": "Gifts & Donations",
    "other": "Other expenses",
    # Nilai yang jelas sesuai nama kanonik (id/en ekuivalen).
    "Salary November": "Salary",
    # Danu 28 Nov: sisa nilai ambigu → Other expenses milik user (bukan kategori baru).
    "Belanja": "Other expenses",
    # Danu 28 Nov (review): freelance = transaksi INCOME → kategori income.
    "freelance": "Freelance",
    "investment": "Other expenses",
    # Danu 28 Nov (review): padanan jelas expense.
    "Pendidikan": "Education",
}

# Nilai ambigu → Other expenses milik user (fallback per user, bukan kategori
# baru). Diisi saat pelaporan: kandidat di daftar ini yang tetap tak terpetakan
# oleh LEGACY_TO_CANONICAL akan disimpan ke kategori Other expenses user.

# Duplicate-category consolidation: both names exist per user; canonical first.
DUPLICATE_CATEGORY_PAIRS: list[tuple[str, str]] = [
    ("Kartu Kredit", "Credit Card"),
]

TRANSACTION_COLUMNS_BASE = "id,user_id,household_id,type,kategori,created_at"
TRANSACTION_COLUMNS_FULL = "id,user_id,household_id,type,kategori,category_id,created_at"
PAGE_SIZE = 500


def transactions_select_columns(client) -> tuple[str, bool]:
    """Probe whether transactions.category_id exists (migration applied?).

    The dry-run must work against a database without the category-discipline
    migration; only --execute / --rollback require the column.
    """
    try:
        client.table("transactions").select("category_id").limit(1).execute()
        return TRANSACTION_COLUMNS_FULL, True
    except Exception as exc:  # noqa: BLE001 - inspect, then decide
        if getattr(exc, "code", None) == "42703" or "does not exist" in str(exc):
            return TRANSACTION_COLUMNS_BASE, False
        raise


def _norm(value: str | None) -> str:
    return (value or "").strip().casefold()


def load_env(env_file: Path | None) -> None:
    """Load KEY=VALUE pairs into os.environ without ever printing values."""
    candidates: list[Path] = []
    if env_file:
        candidates.append(env_file)
    else:
        # Repo root .env.production, then backend/.env, then plain env vars.
        candidates.append(BACKEND_ROOT.parent / ".env.production")
        candidates.append(BACKEND_ROOT / ".env")
    for path in candidates:
        if not path.exists():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
        break  # only the first existing file wins


def get_client():
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        log.error(
            "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured (env or --env-file)."
        )
        sys.exit(2)
    return create_client(url, key)


def fetch_all(client, table: str, columns: str) -> list[dict]:
    """Paginate a whole table through the service-role client."""
    rows: list[dict] = []
    offset = 0
    while True:
        res = (
            client.table(table)
            .select(columns)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        page = getattr(res, "data", None) or []
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def categorize(rows: list[dict], key: str) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row.get(key) or ""].append(row)
    return grouped


def resolve_canonical_category(
    categories: list[dict], canonical_name: str
) -> tuple[dict | None, str]:
    """Find the user's canonical category. Returns (row | None, match_kind)."""
    for cat in categories:
        if (cat.get("name") or "").strip() == canonical_name:
            return cat, "exact"
    target = _norm(canonical_name)
    for cat in categories:
        if _norm(cat.get("name")) == target:
            return cat, "case-insensitive"
    return None, "missing"


def resolve_user_other_category(categories: list[dict]) -> tuple[dict | None, str]:
    """User's own Other expenses — fallback teraman, TIDAK membuat kategori baru."""
    target, kind = resolve_canonical_category(categories, "Other expenses")
    if target is not None:
        return target, f"other-fallback-{kind}"
    # Nama lain yang dikenal untuk Other (mis. 'Other').
    for cat in categories:
        if _norm(cat.get("name")) in {"other", "other expenses", "lainnya"}:
            return cat, "other-fallback-alias"
    return None, "missing"


def category_matches_type(category: dict | None, transaction_type: str | None) -> bool:
    """Guard Danu (28 Nov): kategori target harus se-tipe dengan transaksi.

    Kategori tanpa `type` (legacy) dianggap cocok; transaksi tanpa `type`
    dianggap expense (default skema).
    """
    if category is None:
        return False
    cat_type = (category.get("type") or "").strip().lower() or None
    tx_type = (transaction_type or "expense").strip().lower() or "expense"
    return cat_type is None or cat_type == tx_type


def resolve_target_for_type(
    categories: list[dict], canonical_name: str, transaction_type: str | None
) -> tuple[dict | None, str]:
    """Resolve canonical target DAN cocokkan tipe. None = mismatch/missing.

    kind: 'exact' | 'case-insensitive' | 'type-mismatch' | 'missing'
    """
    target, kind = resolve_canonical_category(categories, canonical_name)
    if target is None:
        return None, "missing"
    if not category_matches_type(target, transaction_type):
        return None, "type-mismatch"
    return target, kind


def resolve_ambiguous_fallback(
    categories: list[dict], transaction_type: str | None
) -> tuple[dict | None, str]:
    """Fallback untuk nilai ambigu, mengikuti tipe transaksi (Danu 28 Nov):
    expense → Other expenses user; income → kategori income fallback user
    (Lainnya/Other income bila ada). Tidak ada → None (teks dibiarkan +
    dilaporkan; TIDAK membuat kategori)."""
    tx_type = (transaction_type or "expense").strip().lower() or "expense"
    if tx_type == "income":
        target, kind = resolve_canonical_category(categories, "Other income")
        if target is None:
            for cat in categories:
                norm = _norm(cat.get("name"))
                if norm in {"other income", "lainnya", "other", "income lainnya"}:
                    target, kind = cat, "income-fallback-alias"
                    break
        if target is not None and category_matches_type(target, "income"):
            return target, kind
        return None, "no-income-fallback"
    target, kind = resolve_user_other_category(categories)
    if target is not None and category_matches_type(target, "expense"):
        return target, kind
    return None, "no-expense-fallback"


def build_report(client) -> dict:
    columns, has_category_id = transactions_select_columns(client)
    transactions = fetch_all(client, "transactions", columns)
    categories = fetch_all(client, "categories", "id,user_id,name,type")
    tx_by_user = categorize(transactions, "user_id")
    cat_by_user = categorize(categories, "user_id")

    report: dict = {
        "category_id_column_present": has_category_id,
        "totals": {
            "transactions_scanned": len(transactions),
            "categories_scanned": len(categories),
            "users_scanned": len(tx_by_user),
        },
        "mappings": [],
        "duplicate_category_pairs": [],
        "unmapped_kategori_values": [],
    }

    # Rows whose text already equals a canonical target are idempotent skips.
    all_canonical_norm = {_norm(v) for v in LEGACY_TO_CANONICAL.values()}
    for dup_pair in DUPLICATE_CATEGORY_PAIRS:
        all_canonical_norm.update(_norm(n) for n in dup_pair)

    candidate_norms = {_norm(k) for k in LEGACY_TO_CANONICAL}
    unmapped_counter: dict[str, int] = {}
    for user_id, txs in tx_by_user.items():
        cats = cat_by_user.get(user_id, [])
        cat_norm_to_row = {_norm(c.get("name")): c for c in cats}
        for row in txs:
            k = _norm(row.get("kategori"))
            if not k or k in candidate_norms or k in all_canonical_norm:
                continue
            if k in cat_norm_to_row:
                continue  # text matches a real category of this user
            unmapped_counter[row.get("kategori") or "(kosong)"] = (
                unmapped_counter.get(row.get("kategori") or "(kosong)", 0) + 1
            )
    report["unmapped_kategori_values"] = [
        {"kategori": k, "rows": n}
        for k, n in sorted(unmapped_counter.items(), key=lambda kv: -kv[1])
    ]

    for legacy, canonical in LEGACY_TO_CANONICAL.items():
        entry: dict = {
            "legacy": legacy,
            "canonical": canonical,
            "users": [],
            "total_rows": 0,
            "skipped_type_mismatch_rows": 0,
        }
        for user_id, txs in tx_by_user.items():
            cats = cat_by_user.get(user_id, [])
            rows = [r for r in txs if _norm(r.get("kategori")) == _norm(legacy)]
            if not rows:
                continue
            # Danu 28 Nov (guard): resolusi target per TIPE transaksi. Mapping
            # yang targetnya beda tipe → SKIP baris itu + dilaporkan, jangan
            # paksa income menunjuk kategori expense (dan sebaliknya).
            by_type: dict[str, list[dict]] = {}
            for r in rows:
                by_type.setdefault(
                    (r.get("type") or "expense").strip().lower() or "expense", []
                ).append(r)
            targets_by_type: dict[str, dict] = {}
            user_skipped = 0
            for tx_type, type_rows in sorted(by_type.items()):
                target, match_kind = resolve_target_for_type(cats, canonical, tx_type)
                if target is None and match_kind == "type-mismatch":
                    user_skipped += len(type_rows)
                    targets_by_type[tx_type] = {
                        "target_category_id": None,
                        "target_category_name": None,
                        "match_kind": "type-mismatch",
                        "rows_matching_legacy_text": len(type_rows),
                        "rows_already_done": 0,
                        "rows_to_update": 0,
                        "skipped": True,
                    }
                    continue
                fallback_used = False
                if target is None:
                    # Danu 28 Nov: user tanpa kategori target pakai fallback
                    # ambigu se-tipe miliknya (Other expenses / income fallback).
                    target, match_kind = resolve_ambiguous_fallback(cats, tx_type)
                    fallback_used = target is not None
                already = (
                    [r for r in type_rows if r.get("category_id") == target["id"]]
                    if has_category_id and target
                    else []
                )
                todo = len(type_rows) - len(already)
                targets_by_type[tx_type] = {
                    "target_category_id": (target or {}).get("id"),
                    "target_category_name": (target or {}).get("name"),
                    "match_kind": match_kind,
                    "fallback_used": fallback_used,
                    "rows_matching_legacy_text": len(type_rows),
                    "rows_already_done": len(already),
                    "rows_to_update": todo,
                }
            total_todo = sum(t["rows_to_update"] for t in targets_by_type.values())
            entry["users"].append(
                {
                    "user_id": user_id,
                    "targets_by_type": targets_by_type,
                    "rows_matching_legacy_text": len(rows),
                    "rows_already_done": sum(
                        t["rows_already_done"] for t in targets_by_type.values()
                    ),
                    "rows_to_update": total_todo,
                    "skipped_type_mismatch_rows": user_skipped,
                }
            )
            entry["skipped_type_mismatch_rows"] += user_skipped
            if all(
                t["match_kind"] in {"type-mismatch", "no-income-fallback", "no-expense-fallback"}
                for t in targets_by_type.values()
            ):
                entry.setdefault("gap", True)
            entry["total_rows"] += total_todo
        report["mappings"].append(entry)

    for dup_from, dup_to in DUPLICATE_CATEGORY_PAIRS:
        pair_entry: dict = {
            "duplicate_name": dup_from,
            "canonical_name": dup_to,
            "users": [],
            "total_rows_to_repoint": 0,
        }
        for user_id, cats in cat_by_user.items():
            from_cat, _ = resolve_canonical_category(cats, dup_from)
            to_cat, _ = resolve_canonical_category(cats, dup_to)
            if from_cat is None or to_cat is None or from_cat["id"] == to_cat["id"]:
                continue
            txs = tx_by_user.get(user_id, [])
            by_cid = [r for r in txs if r.get("category_id") == from_cat["id"]]
            by_text = [r for r in txs if _norm(r.get("kategori")) == _norm(dup_from)]
            todo = len({r["id"] for r in by_cid + by_text})
            pair_entry["users"].append(
                {
                    "user_id": user_id,
                    "duplicate_category_id": from_cat["id"],
                    "canonical_category_id": to_cat["id"],
                    "rows_to_repoint": todo,
                    "duplicate_row_will_be_kept": True,
                }
            )
            pair_entry["total_rows_to_repoint"] += todo
        pair_entry["users"] = [u for u in pair_entry["users"] if u["rows_to_repoint"]]
        report["duplicate_category_pairs"].append(pair_entry)

    report["mappings"] = [
        m for m in report["mappings"] if m["users"] or m.get("gap")
    ]
    return report


def print_report(report: dict) -> None:
    t = report["totals"]
    print("=" * 72)
    print(
        f"Scan: {t['transactions_scanned']} transactions, "
        f"{t['categories_scanned']} categories, {t['users_scanned']} users"
    )
    print("=" * 72)
    if not report["category_id_column_present"]:
        print(
            "NOTE: transactions.category_id is NOT present — the category-discipline\n"
            "migration has not been applied. Counts below are text-mapping only;\n"
            "--execute / --rollback require the migration first."
        )
        print("=" * 72)
    for m in report["mappings"]:
        gap = "  ⚠ GAP: canonical category missing for some users" if m.get("gap") else ""
        skip = (
            f"  ⛔ {m['skipped_type_mismatch_rows']} row(s) SKIPPED: type mismatch"
            if m.get("skipped_type_mismatch_rows")
            else ""
        )
        print(f"\n{m['legacy']}  →  {m['canonical']}{gap}{skip}")
        for u in m["users"]:
            print(f"  user {u['user_id']}: rows={u['rows_matching_legacy_text']} "
                  f"todo={u['rows_to_update']} already_done={u['rows_already_done']}")
            for tx_type, t in (u.get("targets_by_type") or {}).items():
                mark = "SKIPPED(type-mismatch)" if t.get("skipped") else (
                    t.get("target_category_name") or "no-fallback"
                )
                print(
                    f"    [{tx_type}] target={mark} "
                    f"kind={t.get('match_kind')} todo={t['rows_to_update']}"
                )
        print(f"  TOTAL rows to update: {m['total_rows']}")
    for p in report["duplicate_category_pairs"]:
        print(f"\nDuplicate consolidation: {p['duplicate_name']} → {p['canonical_name']}")
        for u in p["users"]:
            print(
                f"  user {u['user_id']}: rows_to_repoint={u['rows_to_repoint']} "
                f"(duplicate category row KEPT, only reported)"
            )
        print(f"  TOTAL rows to re-point: {p['total_rows_to_repoint']}")
    if report["unmapped_kategori_values"]:
        print("\nUnmapped `kategori` values (no matching user category, not in mapping):")
        for item in report["unmapped_kategori_values"]:
            print(f"  {item['kategori']}: {item['rows']} rows")
    else:
        print("\nUnmapped `kategori` values: none")


def require_category_id_column(client) -> None:
    cols = client.table("transactions").select("category_id").limit(1).execute()
    # A missing column raises from PostgREST; reaching here means it exists.
    _ = cols


def backup_rows(client, row_ids: list[str], backup_dir: Path) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = backup_dir / f"normalize-categories-{ts}.json"
    rows: list[dict] = []
    for i in range(0, len(row_ids), PAGE_SIZE):
        chunk = row_ids[i : i + PAGE_SIZE]
        res = (
            client.table("transactions")
            .select("*")
            .in_("id", chunk)
            .execute()
        )
        rows.extend(getattr(res, "data", None) or [])
    payload = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "table": "transactions",
        "row_count": len(rows),
        "rows": rows,
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    log.info("Backup written: %s (%d rows)", path, len(rows))
    return path


def patch_rows(client, row_ids: list[str], fields: dict) -> int:
    """PATCH in batches; returns number of rows the server reports updated."""
    updated = 0
    for i in range(0, len(row_ids), 200):
        chunk = row_ids[i : i + 200]
        res = (
            client.table("transactions")
            .update(fields)
            .in_("id", chunk)
            .select("id")
            .execute()
        )
        updated += len(getattr(res, "data", None) or [])
    return updated


def collect_update_plan(client, report: dict) -> tuple[dict[str, dict], dict[str, dict]]:
    """Return ({tx_id: fields}, {dup_category_id: canonical_category_id})."""
    plan: dict[str, dict] = {}
    repoint: dict[str, dict] = {}
    for m in report["mappings"]:
        for u in m["users"]:
            if u["rows_to_update"] <= 0:
                continue
            user_txs = fetch_all(
                client, "transactions", TRANSACTION_COLUMNS_FULL
            )
            user_txs = [r for r in user_txs if r["user_id"] == u["user_id"]]
            for r in user_txs:
                if _norm(r.get("kategori")) != _norm(m["legacy"]):
                    continue
                tx_type = (r.get("type") or "expense").strip().lower() or "expense"
                t = (u.get("targets_by_type") or {}).get(tx_type)
                if not t or t.get("skipped") or not t.get("target_category_id"):
                    continue  # guard tipe / tanpa fallback → biarkan, sudah dilaporkan
                if r.get("category_id") != t["target_category_id"]:
                    plan[r["id"]] = {
                        "kategori": t.get("target_category_name") or m["canonical"],
                        "category_id": t["target_category_id"],
                    }
    for p in report["duplicate_category_pairs"]:
        for u in p["users"]:
            repoint[u["duplicate_category_id"]] = {
                "canonical_category_id": u["canonical_category_id"],
                "canonical_name": p["canonical_name"],
                "duplicate_name": p["duplicate_name"],
                "user_id": u["user_id"],
            }
    return plan, repoint


def create_other_for_gap_users(client, report: dict) -> int:
    """Danu 28 Nov: user gap yang tidak punya kategori apa pun untuk fallback
    mendapatkan SATU kategori 'Other expenses' (minimal, tipe expense), lalu
    semua baris terdampaknya dipetakan ke situ. Dry-run tidak pernah memanggil."""
    created = 0
    for m in report["mappings"]:
        for u in m.get("users", []):
            if u.get("rows_to_update", 0) <= 0:
                continue
            cats = fetch_all(
                client, "categories", "id,user_id,name,type"
            )
            cats = [c for c in cats if c["user_id"] == u["user_id"]]
            for tx_type, t in (u.get("targets_by_type") or {}).items():
                if t.get("target_category_id") or t.get("skipped"):
                    continue
                # Danu 28 Nov: SATU kategori "Other expenses" untuk fallback
                # expense user gap. Income TIDAK pernah dibuat kategori —
                # tanpa income fallback, teks dibiarkan + dilaporkan.
                if tx_type != "expense":
                    log.info(
                        "No income fallback for user %s (legacy %s) — rows left as-is.",
                        u["user_id"], m["legacy"],
                    )
                    continue
                other, _ = resolve_user_other_category(cats)
                if other is None:
                    resp = (
                        client.from_("categories")
                        .insert(
                            {
                                "user_id": u["user_id"],
                                "name": "Other expenses",
                                "type": "expense",
                                "icon": "otherExpenses",
                                "is_default": False,
                            }
                        )
                        .select("id,name")
                        .single()
                        .execute()
                    )
                    other = resp.data
                    created += 1
                    log.info("Created Other expenses for gap user %s", u["user_id"])
                t["target_category_id"] = other["id"]
                t["target_category_name"] = other["name"]
                t["match_kind"] = "created-other"
                t["rows_to_update"] = t["rows_matching_legacy_text"]
                u["rows_to_update"] = sum(
                    x["rows_to_update"] for x in u["targets_by_type"].values()
                )
    return created


def execute(client, report: dict, backup_dir: Path) -> None:
    require_category_id_column(client)
    create_other_for_gap_users(client, report)
    plan, repoint = collect_update_plan(client, report)

    # Extend the plan with legacy-text rows that fall under duplicate
    # consolidation (e.g. kategori = 'Kartu Kredit' → 'Credit Card').
    tx_all = fetch_all(client, "transactions", TRANSACTION_COLUMNS_FULL)
    for p in report["duplicate_category_pairs"]:
        for u in p["users"]:
            for r in tx_all:
                if r["user_id"] != u["user_id"]:
                    continue
                if r.get("category_id") == u["duplicate_category_id"] or (
                    _norm(r.get("kategori")) == _norm(p["duplicate_name"])
                ):
                    if r.get("category_id") != u["canonical_category_id"]:
                        plan.setdefault(
                            r["id"],
                            {
                                "kategori": p["canonical_name"],
                                "category_id": u["canonical_category_id"],
                            },
                        )

    row_ids = list(plan)
    backup_path = backup_rows(client, row_ids, backup_dir) if row_ids else None
    print(f"\nBacking up {len(row_ids)} rows → {backup_path}")

    done = 0
    for tx_id, fields in plan.items():
        if patch_rows(client, [tx_id], fields) == 1:
            done += 1
        else:
            log.warning("Row %s was not updated (may have changed concurrently).", tx_id)
    print(f"Updated {done}/{len(row_ids)} rows (legacy text → canonical + category_id).")

    # Re-point by old category_id (rows whose text was already canonical but
    # whose category_id pointed at the duplicate category row).
    repointed = 0
    for dup_id, info in repoint.items():
        affected = [
            r["id"]
            for r in tx_all
            if r.get("category_id") == dup_id and r["id"] not in plan
        ]
        for tx_id in affected:
            if patch_rows(client, [tx_id], {"category_id": info["canonical_category_id"]}) == 1:
                repointed += 1
    print(f"Re-pointed {repointed} rows from duplicate category ids.")

    # Duplicate category rows are reported, NOT deleted.
    if repoint:
        print(
            "\nNOTE: duplicate category rows were intentionally KEPT "
            "(deletion is a user decision)."
        )

    # Idempotency verification: re-scan.
    report_after = build_report(client)
    remaining = sum(m["total_rows"] for m in report_after["mappings"])
    remaining += sum(
        p["total_rows_to_repoint"] for p in report_after["duplicate_category_pairs"]
    )
    print(f"\nPost-execute re-scan: {remaining} rows still pending (0 = fully clean).")
    print(f"Backup for rollback: {backup_path}")


def rollback(client, backup_path: Path) -> None:
    require_category_id_column(client)
    payload = json.loads(backup_path.read_text(encoding="utf-8"))
    rows = payload.get("rows") or []
    restored = 0
    for row in rows:
        fields = {
            "kategori": row.get("kategori"),
            "category_id": row.get("category_id"),
        }
        if patch_rows(client, [row["id"]], fields) == 1:
            restored += 1
        else:
            log.warning("Row %s could not be restored.", row["id"])
    print(f"Rollback: restored {restored}/{len(rows)} rows from {backup_path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize legacy Indonesian kategori text to canonical categories."
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Apply the normalization (writes! backs up first). Default is dry-run.",
    )
    parser.add_argument(
        "--rollback",
        metavar="BACKUP.json",
        help="Restore the rows in the given backup file.",
    )
    parser.add_argument("--env-file", type=Path, default=None, help="Env file to load.")
    parser.add_argument(
        "--backup-dir",
        type=Path,
        default=BACKEND_ROOT / "backups",
        help="Directory for JSON backups (default: backend/backups).",
    )
    args = parser.parse_args()

    load_env(args.env_file)
    client = get_client()

    if args.rollback:
        rollback(client, args.rollback)
        return

    report = build_report(client)
    print_report(report)

    if args.execute:
        print("\n--EXECUTE MODE--")
        execute(client, report, args.backup_dir)
    else:
        print(
            "\nDRY-RUN: nothing was written. Use --execute to apply "
            "(a JSON backup is created first)."
        )


if __name__ == "__main__":
    main()
