"""Compact, privacy-conscious financial context builder for AI insight.

Aggregates transaction data from Supabase into a summary dict suitable
as LLM context — never exposes raw transactions or catatan/notes.
"""

from calendar import monthrange
from datetime import datetime, timezone

from app.core.auth import _get_supabase_service_client


def _now() -> datetime:
    """Current UTC time. Extracted for testability."""
    return datetime.now(timezone.utc)


def _period_boundaries(now: datetime, period: str) -> tuple[str, str]:
    """Return (period_start, period_end) as YYYY-MM-DD strings.

    For MVP only 'monthly' is implemented; unknown values fall back to monthly.
    """
    # MVP: only monthly; fall back for anything else
    year = now.year
    month = now.month

    period_start = f"{year:04d}-{month:02d}-01"
    _, last_day = monthrange(year, month)
    period_end = f"{year:04d}-{month:02d}-{last_day:02d}"

    return period_start, period_end


def _previous_period_boundaries(now: datetime) -> tuple[str, str]:
    """Return (prev_period_start, prev_period_end) for the month before now."""
    year = now.year
    month = now.month

    # Previous month
    if month == 1:
        prev_year = year - 1
        prev_month = 12
    else:
        prev_year = year
        prev_month = month - 1

    prev_start = f"{prev_year:04d}-{prev_month:02d}-01"
    _, prev_last_day = monthrange(prev_year, prev_month)
    prev_end = f"{prev_year:04d}-{prev_month:02d}-{prev_last_day:02d}"

    return prev_start, prev_end


def _fetch_transactions(client, user_id: str, period_start: str, period_end: str) -> list[dict]:
    """Query transactions table for user within date range.

    Returns list of transaction rows (dicts). Returns empty list on error.
    """
    try:
        result = (
            client.table("transactions")
            .select("nominal,type,kategori,merchant,tanggal")
            .eq("user_id", user_id)
            .gte("tanggal", period_start)
            .lte("tanggal", period_end)
            .execute()
        )
        data = getattr(result, "data", None)
        if isinstance(data, list):
            return data
        return []
    except Exception:
        return []


def _aggregate(rows: list[dict], expense_total: float) -> dict:
    """Compute top_categories and top_merchants from expense rows only.

    Returns dict with top_categories, top_merchants, other_category_percent.
    """
    # Aggregate categories (expense only)
    cat_totals: dict[str, float] = {}
    merch_totals: dict[str, float] = {}

    for row in rows:
        tipe = str(row.get("type", "")).lower()
        if tipe != "expense":
            continue

        nominal = float(row.get("nominal", 0) or 0)
        if nominal <= 0:
            continue

        # Category
        kategori = (row.get("kategori") or "").strip()
        if kategori:
            cat_totals[kategori] = cat_totals.get(kategori, 0.0) + nominal

        # Merchant (only non-empty)
        merchant = (row.get("merchant") or "").strip()
        if merchant:
            merch_totals[merchant] = merch_totals.get(merchant, 0.0) + nominal

    # Sort categories by amount desc, cap at 8
    sorted_cats = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
    top_cats = sorted_cats[:8]

    top_categories = []
    for cat, amt in top_cats:
        pct = round((amt / expense_total) * 100, 1) if expense_total > 0 else 0.0
        top_categories.append({"category": cat, "amount": amt, "percent": pct})

    # other_category_percent: sum of categories beyond top 8
    other_cat_total = sum(amt for _, amt in sorted_cats[8:])
    other_category_percent = (
        round((other_cat_total / expense_total) * 100, 1) if expense_total > 0 else 0.0
    )

    # Sort merchants by amount desc, cap at 8
    sorted_merch = sorted(merch_totals.items(), key=lambda x: x[1], reverse=True)
    top_merchants = [
        {"merchant": m, "amount": amt} for m, amt in sorted_merch[:8]
    ]

    return {
        "top_categories": top_categories,
        "top_merchants": top_merchants,
        "other_category_percent": other_category_percent,
    }


def _compute_totals(rows: list[dict]) -> tuple[int, float, float, float]:
    """Compute transaction_count, income_total, expense_total, net_total."""
    transaction_count = len(rows)
    income_total = 0.0
    expense_total = 0.0

    for row in rows:
        nominal = float(row.get("nominal", 0) or 0)
        tipe = str(row.get("type", "")).lower()

        if tipe == "income":
            income_total += nominal
        elif tipe == "expense":
            expense_total += nominal

    net_total = income_total - expense_total
    return transaction_count, income_total, expense_total, net_total


def build_ai_insight_context(user_id: str, period: str = "monthly") -> dict | None:
    """Return compact, privacy-conscious financial context for AI insight.

    Args:
        user_id: Supabase user UUID.
        period: Time window identifier. For MVP only 'monthly' is implemented;
                unknown values fall back to monthly.

    Returns:
        dict with aggregated data, or None if Supabase client is unavailable.

    The returned dict NEVER contains raw catatan/notes or full transaction lists
    — only aggregate statistics suitable as LLM context.
    """
    client = _get_supabase_service_client()
    if client is None:
        return None

    now = _now()
    period_start, period_end = _period_boundaries(now, period)

    # Query current period
    rows = _fetch_transactions(client, user_id, period_start, period_end)

    transaction_count, income_total, expense_total, net_total = _compute_totals(rows)

    # Aggregate categories and merchants (expense only)
    aggregated = _aggregate(rows, expense_total)

    # Query previous period
    prev_start, prev_end = _previous_period_boundaries(now)
    prev_rows = _fetch_transactions(client, user_id, prev_start, prev_end)

    previous_period = None
    if prev_rows:
        prev_count, prev_income, prev_expense, prev_net = _compute_totals(prev_rows)
        previous_period = {
            "income_total": prev_income,
            "expense_total": prev_expense,
            "net_total": prev_net,
            "transaction_count": prev_count,
        }

    return {
        "period_start": period_start,
        "period_end": period_end,
        "transaction_count": transaction_count,
        "income_total": income_total,
        "expense_total": expense_total,
        "net_total": net_total,
        "top_categories": aggregated["top_categories"],
        "top_merchants": aggregated["top_merchants"],
        "other_category_percent": aggregated["other_category_percent"],
        "previous_period": previous_period,
    }
