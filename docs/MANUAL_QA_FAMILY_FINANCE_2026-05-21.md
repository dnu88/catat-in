# Manual QA Checklist - Family Finance

- [ ] Login on device A and device B with same account
- [ ] Confirm personal context is default after login
- [ ] Create a Keluarga from Family Center
- [ ] Confirm new Keluarga appears in FinanceContextSwitcher without app restart
- [ ] Join same Keluarga from another account using invite code
- [ ] Switch Pribadi ↔ Keluarga and confirm transactions/wallets/budgets/reports change scope
- [ ] Create household wallet and transaction; verify appears on second device after realtime/refetch
- [ ] Create budget/envelope/bill in Keluarga and verify household members can view
- [ ] Viewer role cannot create/update/delete household finance records
- [ ] Member cannot update/delete records created by another member where restricted
- [ ] Owner/admin can manage household-wide records
- [ ] Capture flow in Keluarga creates transaction with household context
- [ ] Reports include all household member transactions, not only current user
- [ ] Pribadi data remains hidden from Keluarga context and other accounts
