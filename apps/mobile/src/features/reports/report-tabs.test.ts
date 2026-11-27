import { resolveReportTabState, reportStateCopy, type ReportStateInput, type ReportViewState } from './report-state';

const ready = { loading: false, error: null, scopeTransactionCount: 3, periodTransactionCount: 1 };
for(const tab of ['overview','category','compare'] as const) {
 test.each<[Partial<ReportStateInput>, ReportViewState]>([
  [{loading:true,error:'failed'},'loading'],
  [{loading:false,error:'failed'},'error'],
  [{scopeTransactionCount:0,periodTransactionCount:0},'first-use'],
  [{periodTransactionCount:0},'period-empty'],
 ])(`${tab} respects %j before rendering figures`,(overrides,state)=>{
  expect(resolveReportTabState({...ready, tab, expenseCategoryCount:1, ...overrides})).toBe(state);
 });
}

describe('report tab presentation', () => {
 test('comparison preserves real previous-only figures', () => {
  expect(resolveReportTabState({...ready, periodTransactionCount:0, tab:'compare', previousTransactionCount:2})).toBe('ready');
 });
 test('income-only category view explains absent expenses without calling the account empty', () => {
  const state = resolveReportTabState({...ready, tab:'category', expenseCategoryCount:0});
  expect(state).toBe('no-expenses');
  expect(reportStateCopy(state, false)?.title).toBe('Belum ada pengeluaran di periode ini');
  expect(reportStateCopy(state, true)?.title).toBe('No expenses in this period');
 });
});
