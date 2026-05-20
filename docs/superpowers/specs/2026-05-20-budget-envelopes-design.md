# Kaswise Budget Envelopes Design

Date: 2026-05-20
Status: Approved for implementation planning

## Summary

Kaswise will add lightweight budget envelopes as a planning layer above transaction categories. Categories remain the main reporting structure. Envelopes are more personal budget containers such as Kopi, Bekal, Ojol, or Parkir, each attached to a parent category.

The MVP keeps the existing fast capture principle: AI suggests an envelope during transaction entry, the user can correct it, and transactions are never blocked by budget state. Reports becomes the primary place to manage envelopes. Home only shows actionable envelope alerts.

## Product Decisions

- Model: lightweight budget envelopes.
- Relationship to categories: an envelope belongs to one parent category and can be more specific than that category.
- Transaction matching: AI suggests the envelope from transaction text, merchant, category, and envelope notes.
- Budget period: each envelope has a custom start date and end date.
- End-of-period behavior: expired envelopes are archived automatically.
- Entry points: Home for alerts, Reports for list/detail/manage.
- Warning behavior: in-app alerts only.
- Over-budget behavior: transaction still saves, detail shows how much the envelope is over budget.
- Low-confidence matching: transaction saves with the guessed envelope and a `needs_review` badge, visible only in Reports/detail.
- Split transactions: not in MVP UI, but the data model must support future split allocations.

## UX Structure

### Home

Home shows only actionable envelope cards, limited to the most important active envelopes.

Examples:

- Kopi hampir habis.
- Rp42.000 tersisa sampai 25 Mei.
- Nongkrong sudah lewat Rp8.000.

Home must not become the envelope management surface. It should remain focused on quick financial awareness.

### Reports

Reports is the primary management surface for envelopes. It should include:

- Active envelopes.
- Transactions that need review.
- Archived envelopes.
- Detail view for one envelope.
- Create envelope entry point.

### Envelope Detail

Envelope detail may feel slightly like a small project page. It should include:

- Icon and color.
- Name.
- Parent category.
- Period.
- Limit, spent, remaining, and over-budget state.
- Notes.
- Related transactions.
- Transactions needing review.

This detail view may have more character than the list, but must still follow Kaswise product UI patterns.

## Create Envelope Flow

The create flow should use a progressive two-step form so the complete field set does not feel long.

### Step 1: Core Budget

Required fields:

- Envelope name.
- Limit amount.
- Start date.
- End date.

A user can understand and complete the core budget in this step.

### Step 2: Recognition Details

Additional fields:

- Parent category.
- Icon.
- Color.
- Notes.

The notes field serves both as a user memo and as AI matching context. Suggested helper copy:

> Catatan: tempat, kebiasaan, atau transaksi yang biasanya masuk amplop ini.

Example:

> Starbucks, Kopi Kenangan, Fore, kopi kampus.

AI may suggest category, icon, and color from the envelope name. The user can change all suggestions.

## Capture and Review Flow

When a transaction is created from text, OCR, or voice:

1. Kaswise determines or confirms the transaction category.
2. Kaswise suggests an envelope using transaction text, merchant, category, and envelope notes.
3. If confidence is high, the suggested envelope appears as a lightweight editable field.
4. If confidence is low, the transaction still saves with the guessed envelope and `needs_review = true`.
5. If AI cannot suggest an envelope, the transaction saves without an envelope.
6. If the transaction exceeds the envelope limit, the transaction still saves.

The low-confidence badge appears only in Reports and envelope detail, not on Home.

## Data Model

### `budget_envelopes`

Suggested fields:

- `id`
- `user_id`
- `name`
- `parent_category_id`
- `limit_amount`
- `start_date`
- `end_date`
- `icon`
- `color`
- `notes`
- `status`
- `created_at`
- `updated_at`

`status` should support at least `active` and `archived`. Expiration can be computed from `end_date`, but an explicit status gives future flexibility for manual archive or restore behavior.

### `transaction_envelope_allocations`

Suggested fields:

- `id`
- `transaction_id`
- `envelope_id`
- `amount`
- `confidence`
- `needs_review`
- `created_at`
- `updated_at`

MVP allows only one allocation per transaction in the UI. The table shape supports future split transactions by allowing multiple allocation rows for one transaction.

## Progress Calculation

Envelope progress is calculated from allocations attached to the envelope where the transaction date is within the envelope period.

Derived values:

- `spent_amount`
- `remaining_amount`
- `used_percentage`
- `is_near_limit`, default threshold 80 percent
- `is_over_budget`
- `over_budget_amount`

Archived envelopes should remain readable with historical progress and transactions.

## Error Handling

- AI matching fails: save the transaction without an envelope.
- Progress calculation fails: show a friendly fallback, for example “Belum bisa menghitung amplop”.
- Envelope is archived: historical allocations remain intact.
- Envelope is deleted in the future: preserve transaction history and avoid orphaned UI states.
- Transaction has low-confidence envelope: include it in Reports/detail review, not Home.

## Visual and Interaction Guidelines

Use the Kaswise Dark Luxury design system as source of truth:

- Matte Black `#141414`.
- Neon Emerald `#A3FF12`.
- Soft Navy `#4A80F0`.
- Light mode parity must remain soft and readable.

Product UI should stay familiar and task-focused. Avoid decorative complexity, gradient text, side-stripe borders, and unnecessary modals. Use inline and progressive flows before modal-first patterns.

Dark mode remains the default because Kaswise users often check personal finance in low-light evening contexts. Light mode remains important for outdoor or daytime use.

## Testing and Acceptance Criteria

Acceptance criteria:

- User can create an envelope with name, limit, custom period, category, icon, color, and notes.
- Active envelopes appear in Reports.
- Archived envelopes are separated from active envelopes.
- Home shows only active envelopes that need attention.
- Transactions can save without an envelope.
- AI failure does not block transaction save.
- Low-confidence envelope matches create review items visible in Reports/detail only.
- Over-budget transactions still save and update detail state.
- Expired envelopes are treated as archived.
- Progress is computed from allocations inside the envelope period.
- Light and dark UI follow the existing Kaswise design system.

Suggested tests:

- Helper tests for envelope status, progress, remaining, and over-budget calculations.
- Helper tests for archive detection by `end_date`.
- Screen tests for Reports envelope list, detail, review list, and archive grouping.
- Screen tests for Home alert visibility and absence of low-confidence review noise.
- Capture tests for high-confidence envelope suggestion, low-confidence review flag, AI failure fallback, and transaction without envelope.
- Regression tests for existing Reports and Capture behavior.
