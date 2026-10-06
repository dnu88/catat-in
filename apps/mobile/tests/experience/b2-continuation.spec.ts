import { expect, test, type Page } from '@playwright/test';
import { bootExperience, trackPageErrors } from './harness';
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({page}) => { pageErrors.set(page, trackPageErrors(page)); });
test.afterEach(({page}) => { expect(pageErrors.get(page)).toEqual([]); });

async function screenshot(page:Page, path:string) {
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-testid="reports-page-entrance"], [data-testid^="reports-entrance-"]')).every(el=>Number(getComputedStyle(el).opacity)>=0.95));
 await page.screenshot({path});
}
const now = new Date();
const day = now.toISOString().slice(0,10);
const previous = new Date(now.getFullYear(), now.getMonth()-1, 10).toISOString().slice(0,10);
const old = new Date(now.getFullYear(), now.getMonth()-4, 10).toISOString().slice(0,10);
function tx(id:string, type:string, date=day) {
 return {id,user_id:'preview-user',wallet_id:'w-preview',transaction_type:type,type,amount:100000,nominal:100000,date,tanggal:date,category:type==='expense'?'Food & Beverage':'Salary',kategori:type==='expense'?'Food & Beverage':'Salary',description:'Preview',household_id:null};
}
async function open(page:Page, rows:unknown[]=[], premium=true) {
 await bootExperience(page,{simplePremiumExperience:premium},{transactions:rows});
 await page.goto('/reports');
 await page.waitForLoadState('networkidle');
 await expect(page.getByTestId('reports-summary-card')).toBeVisible();
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-testid="reports-page-entrance"], [data-testid^="reports-entrance-"]')).every(el=>Number(getComputedStyle(el).opacity)>=0.95));
}
async function tab(page:Page, name:'category'|'compare') {
 const button=page.getByRole('button',{name:name==='category'?'Tampilkan kategori laporan':'Tampilkan perbandingan laporan',exact:true});
 await button.click();
 await expect(button.getByText(name==='category'?'Kategori':'Perbandingan',{exact:true})).toHaveCSS('color','rgb(255, 255, 255)');
 await page.waitForLoadState('networkidle');
 await page.getByTestId('reports-summary-card').scrollIntoViewIfNeeded();
}
async function state(page:Page, copy:string) {
 const card=page.getByTestId('reports-state-card');
 await expect(card).toContainText(copy);
 await expect(card).toBeInViewport();
 await expect(page.getByTestId('reports-state-action')).toBeInViewport();
 await expect(page.getByTestId('reports-donut-svg')).toHaveCount(0);
 await expect(page.getByTestId('reports-comparison-panel')).toHaveCount(0);
}
test('premium ready report prioritizes period/chart before AI and wallet',async({page})=>{
 const errors=trackPageErrors(page);
 await open(page,[tx('in','income'),tx('out','expense')]);
 await expect(page.getByTestId('reports-pulse-chart')).toBeVisible();
 const order=await page.evaluate(()=>{
  const ids=['reports-summary-card','reports-period-status','reports-pulse-chart','reports-entrance-ai-insight','reports-envelope-entry'];
  return ids.map(id=>document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect().top);
 });
 console.log("B2_HIERARCHY",JSON.stringify({width:page.viewportSize().width,order}));
 expect(order.every(v=>typeof v==='number')).toBe(true);
 expect(order[0]!).toBeLessThan(order[1]!);expect(order[1]!).toBeLessThan(order[2]!);expect(order[2]!).toBeLessThan(order[3]!);expect(order[2]!).toBeLessThan(order[4]!);
 await screenshot(page, `test-results/experience/b2-cont-ready-on-${page.viewportSize()!.width}.png`);
 expect(errors).toEqual([]);
});
for(const name of ['category','compare'] as const){
 test(`${name}: first use has working Capture action`,async({page})=>{
  await open(page);await tab(page,name);await state(page,'Belum ada transaksi');
  await page.getByTestId('reports-state-action').click();await expect(page).toHaveURL(/\/capture/);
 });
 test(`${name}: empty period has usable period action`,async({page})=>{
  await open(page,[tx('old','expense',old)]);await tab(page,name);await state(page,'Periode ini belum ada transaksi');
  await page.getByTestId('reports-state-action').click();
  await expect(page.getByTestId('reports-period-chips')).toBeVisible();
  await page.getByRole('button',{name:'Pilih periode 6 Bulan',exact:true}).click();
  await expect(page.getByTestId('reports-state-card')).toHaveCount(0);
  await expect(page.getByTestId(name==='category'?'reports-donut-svg':'reports-comparison-panel')).toBeVisible();
  await screenshot(page, `test-results/experience/b2-cont-${name}-empty-${page.viewportSize()!.width}.png`);
 });
 test(`${name}: errors retry and recover real content`,async({page})=>{
  let fail=true;
  await bootExperience(page,{simplePremiumExperience:true},{transactions:[tx('out','expense')]});
  await page.route('**/preview-stub.supabase.co/rest/v1/transactions**',async route=>{
   if(fail)await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'forced failure'})});else await route.fallback();
  });
  await page.goto('/reports');await page.waitForLoadState('networkidle');await tab(page,name);await state(page,'Laporan gagal dimuat');
  fail=false;await page.getByTestId('reports-state-action').click();
  await expect(page.getByTestId('reports-state-card')).toHaveCount(0);
  await expect(page.getByTestId(name==='category'?'reports-donut-svg':'reports-comparison-panel')).toBeVisible();
 });
 test(`${name}: loading hides stale content`,async({page})=>{
  await open(page,[tx('out','expense')]);
  let release!:()=>void;const hold=new Promise<void>(resolve=>release=resolve);
  await page.route('**/preview-stub.supabase.co/rest/v1/transactions**',async route=>{await hold;await route.fallback();});
  await page.getByRole('button',{name:name==='category'?'Tampilkan kategori laporan':'Tampilkan perbandingan laporan',exact:true}).click();
  await expect(page.getByTestId('reports-state-card')).toContainText('Memuat laporan');
  await expect(page.getByTestId('reports-donut-svg')).toHaveCount(0);await expect(page.getByTestId('reports-comparison-panel')).toHaveCount(0);
  release();await expect(page.getByTestId('reports-state-card')).toHaveCount(0);
 });
 test(`${name}: flag OFF retains legacy empty content`,async({page})=>{
  await open(page,[],false);await tab(page,name);await expect(page.getByTestId('reports-state-card')).toHaveCount(0);
  await expect(page.getByTestId(name==='category'?'reports-donut-svg':'reports-comparison-panel')).toBeVisible();
 });
}
for(const type of ['income','transfer']) test(`category: ${type}-only is not a new account or empty chart`,async({page})=>{
 await open(page,[tx(type,type)]);
 if(type==='transfer') {
  await expect(page.getByTestId('reports-summary-expense-value')).toHaveText('Rp 0');
  await expect(page.getByTestId('reports-pulse-empty')).toBeVisible();
 }
 await tab(page,'category');await state(page,'Belum ada pengeluaran di periode ini');
 await screenshot(page, `test-results/experience/b2-cont-category-${type}-${page.viewportSize()!.width}.png`);
});
test('late category response cannot erase a newer comparison',async({page})=>{
 await open(page,[tx('prior','expense',previous)]);
 let release!:()=>void;const hold=new Promise<void>(resolve=>release=resolve);
 let seen!:()=>void;const requested=new Promise<void>(resolve=>seen=resolve);let count=0;
 await page.route('**/preview-stub.supabase.co/rest/v1/transactions**',async route=>{
  count++;if(count===1){seen();await hold;}await route.fallback();
 });
 await page.getByRole('button',{name:'Tampilkan kategori laporan',exact:true}).click();await requested;
 await page.getByRole('button',{name:'Tampilkan perbandingan laporan',exact:true}).click();
 await expect(page.getByTestId('reports-comparison-panel')).toContainText('Rp');
 release();await page.waitForLoadState('networkidle');
 await expect(page.getByTestId('reports-comparison-panel')).toContainText('Rp');
 await expect(page.getByTestId('reports-state-card')).toHaveCount(0);
});

test('persisted six-month period survives reload and tab switch',async({page})=>{
 await open(page,[tx('old','expense',old)]);
 await page.getByTestId('reports-period-toggle').click();
 await page.getByRole('button',{name:'Pilih periode 6 Bulan',exact:true}).click();
 await expect(page.getByTestId('reports-period-status')).toContainText('6 Bulan');
 await expect(page.getByTestId('reports-state-card')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('kaswise:report-period')).map(k=>localStorage.getItem(k)).join(''))).toContain('6month');
 await page.reload();await page.waitForLoadState('networkidle');
 await expect(page.getByTestId('reports-period-status')).toContainText('6 Bulan');
 await tab(page,'category');await expect(page.getByTestId('reports-donut-svg')).toBeVisible();
 await expect(page.getByTestId('reports-period-status')).toContainText('6 Bulan');
});

for(const which of ['current','previous']) test(`compare: ${which}-only data remains visible`,async({page})=>{
 await open(page,[tx(which,'expense',which==='previous'?previous:day)]);await tab(page,'compare');
 await expect(page.getByTestId('reports-state-card')).toHaveCount(0);await expect(page.getByTestId('reports-comparison-panel')).toContainText('Rp');
 await screenshot(page, `test-results/experience/b2-cont-compare-${which}-${page.viewportSize()!.width}.png`);
});
