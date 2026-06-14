# Kaswise Account Deletion & Privacy Support SOP

Status: Track A operational SOP
Last updated: 2026-06-14
Owner: Kaswise support + engineering

Purpose
- Ensure deletion and privacy requests described in the public/legal docs can really be fulfilled.
- Give support a repeatable workflow for Track A request handling.

Scope
- Authenticated mobile deletion requests submitted from Settings
- Public fallback requests submitted through `https://kaswise.com/account-deletion` and `kaswise.id@gmail.com`
- Related privacy/data requests that need the same verification discipline

Authoritative references
- `docs/legal/account-deletion.md`
- `docs/legal/privacy-policy.md`
- `docs/deployment/MOBILE_STORE_SUBMISSION_CHECKLIST.md`
- `docs/deployment/MOBILE_GOLIVE.md`

Track A policy
- Kaswise does not promise immediate irreversible self-service deletion from inside the app.
- Track A uses a verified request workflow.
- Signed-in users should prefer the in-app Settings request flow.
- Public email/web page remains the no-login fallback path.

Primary intake channels
1. In-app authenticated request
   - Mobile path: Settings → Request Penghapusan Akun
   - Backend endpoint: `POST /api/v1/me/account-deletion-request`
   - Database table: `public.account_deletion_requests`
2. Public fallback
   - `https://kaswise.com/account-deletion`
   - `https://kaswise.com/contact`
   - `mailto:kaswise.id@gmail.com`

Support SLA target
- First acknowledgement: within 3 business days
- Final processing target: within 30 calendar days, unless legal/security retention or identity clarification delays the request

Request statuses
- `pending` = request received, awaiting support review
- `in_review` = support is verifying scope and retention constraints
- `completed` = active account/data deletion workflow executed
- `rejected` = insufficient verification or invalid request
- `cancelled` = user withdrew the request or duplicate request superseded it

Verification rules
1. If the request came from the authenticated in-app flow:
   - treat the signed-in account email as the primary identity signal
   - verify there is no obvious abuse or mismatch before processing
2. If the request came from email/public channel:
   - require the requester to confirm the Kaswise account email
   - ask for lightweight clarification only if needed to verify control of the account
   - avoid requesting unnecessary personal identifiers
3. Never ask for sensitive documents unless there is a clear abuse/security reason and leadership approves it

Operational workflow
1. Intake
   - Check `public.account_deletion_requests` for a matching active request
   - If the request came by email only, create or update a support ticket and optionally insert a manual DB row for tracking consistency
2. Triage
   - Review account state, active entitlements, and any open support/security issue
   - If valid, move status from `pending` to `in_review`
3. Scope review
   - Identify data that should be deleted/anonymized from active systems
   - Identify any records that must be retained temporarily for fraud, security, tax, accounting, or legal reasons
4. Execute
   - Disable or remove active account access
   - Delete or anonymize active user finance data where appropriate
   - Revoke entitlements tied to the account where appropriate
5. Record outcome
   - Set status to `completed`, `rejected`, or `cancelled`
   - Fill `review_notes`, `reviewed_at`, and `reviewed_by`
6. Notify user
   - Send final outcome email with concise explanation

Minimum database handling
- Source of truth table: `public.account_deletion_requests`
- Migration: `supabase/migrations/202606140001_account_deletion_requests.sql`
- Important columns:
  - `user_id`
  - `email`
  - `status`
  - `reason`
  - `details`
  - `review_notes`
  - `requested_at`
  - `reviewed_at`
  - `reviewed_by`

Suggested support SQL snippets
```sql
-- Find newest requests first
select id, user_id, email, status, reason, requested_at, reviewed_at
from public.account_deletion_requests
order by requested_at desc;

-- Mark a request as under review
update public.account_deletion_requests
set status = 'in_review', reviewed_by = 'support:<name>', review_notes = 'Verification started', reviewed_at = now()
where id = '<request-id>';

-- Mark a request completed
update public.account_deletion_requests
set status = 'completed', reviewed_by = 'support:<name>', review_notes = 'Account access disabled and active data deletion workflow completed', reviewed_at = now()
where id = '<request-id>';
```

Deletion execution checklist
- [ ] Confirm target account email/user id
- [ ] Check whether the request is duplicate or already active
- [ ] Check whether premium/entitlements need revocation
- [ ] Check whether any open fraud/security case blocks immediate deletion
- [ ] Remove active app access
- [ ] Delete or anonymize active finance/profile data as applicable
- [ ] Record retained-data rationale if anything must be kept temporarily
- [ ] Update request status and review notes
- [ ] Send completion email

Privacy-request handling
- If the user asks for export, correction, or data-use clarification instead of deletion:
  - do not force the request into `completed`
  - respond using the same verification rules
  - track the case with a support ticket and, if useful, `review_notes`

Submission-readiness rule
- Do not submit public store builds unless at least one support owner understands and can execute this SOP.
- The checklist item “Support/ops team can fulfill deletion/privacy requests” is not complete without this SOP and a real owner.
