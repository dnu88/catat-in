import { reportTransactionType } from './report-transaction-type';

describe('report transaction type compatibility', () => {
 test('premium preserves transfers rather than categorizing them as expenses', () => {
  expect(reportTransactionType('transfer', true)).toBe('transfer');
 });
 test('legacy normalization remains unchanged while income/expense keep their semantics', () => {
  expect(reportTransactionType('transfer', false)).toBe('expense');
  for (const premium of [false, true]) {
   expect(reportTransactionType('income', premium)).toBe('income');
   expect(reportTransactionType('expense', premium)).toBe('expense');
   expect(reportTransactionType(null, premium)).toBe('expense');
  }
 });
});
