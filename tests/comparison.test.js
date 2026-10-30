import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePeriods } from '../src/comparison.js';
import { freshData } from '../src/domain.js';

function ledgerWith(rows,startDay=1) {
 const ledger=freshData();ledger.settings.startDay=startDay;
 ledger.transactions=rows.map(([date,amount,type='expense',categoryId=type==='income'?'salary':'food'],index)=>({id:'t'+index,date,amount,type,categoryId,note:'',tagIds:['personal','work']}));
 return ledger;
}
const october = (ledger,options={}) => comparePeriods(ledger,'2026-10-30',0,{today:'2026-10-30',...options});

test('full comparisons include both cycle boundaries, ignore outside entries and never count tags twice',()=>{
 const ledger=ledgerWith([
  ['2026-08-31',999],['2026-09-01',100],['2026-09-30',50],
  ['2026-10-01',200],['2026-10-30',100],['2026-10-31',50],['2026-11-01',999],
  ['2026-09-10',1000,'income'],['2026-10-10',1500,'income']
 ]);
 ledger.quickTemplates.push({id:'not-a-transaction',name:'Mẫu',amount:5000,type:'expense',categoryId:'food',tagIds:[],note:''});
 const before=structuredClone(ledger),report=october(ledger);
 assert.equal(report.current.count,4);assert.equal(report.previous.count,3);
 assert.equal(report.current.expense,350);assert.equal(report.previous.expense,150);
 assert.equal(report.metrics.income.delta,500);assert.equal(report.metrics.income.percent,50);
 assert.equal(report.metrics.balance.current,1150);assert.equal(report.metrics.balance.previous,850);
 assert.equal(report.categories.find(c=>c.id==='food').current,350);
 assert.deepEqual(ledger,before,'comparison must not mutate stored transactions, categories or templates');
});

test('matched comparisons use the same number of days and exclude later entries from both cycles',()=>{
 const ledger=ledgerWith([
  ['2026-09-25',100],['2026-09-30',50],['2026-10-01',300],['2026-10-24',400],
  ['2026-10-25',200],['2026-10-30',100],['2026-10-31',500],['2026-11-24',600]
 ],25);
 const matched=october(ledger,{mode:'matched'});
 assert.equal(matched.matchedDays,6);assert.equal(matched.mode,'matched');
 assert.equal(matched.current.start,'2026-10-25');assert.equal(matched.current.end,'2026-10-30');
 assert.equal(matched.previous.start,'2026-09-25');assert.equal(matched.previous.end,'2026-09-30');
 assert.equal(matched.current.expense,300);assert.equal(matched.previous.expense,150);
 assert.equal(matched.metrics.expense.percent,100);
 const full=october(ledger);
 assert.equal(full.current.expense,1400);assert.equal(full.previous.expense,850);
});

test('matched periods clamp both ranges to the shorter cycle, including leap years',()=>{
 for(const [year,days] of [[2026,28],[2028,29]]){
  const ledger=ledgerWith([[`${year}-03-${days}`,100],[`${year}-03-30`,999],[`${year}-02-${days}`,50]]);
  const report=comparePeriods(ledger,`${year}-03-31`,0,{mode:'matched',today:`${year}-03-31`});
  assert.equal(report.matchedDays,days);assert.equal(report.current.days,days);assert.equal(report.previous.days,days);
  assert.equal(report.current.end,`${year}-03-${days}`);assert.equal(report.current.expense,100);assert.equal(report.previous.expense,50);
 }
});

test('comparisons follow the selected offset and a custom cycle across the year boundary',()=>{
 const ledger=ledgerWith([['2026-11-25',10],['2026-12-24',20],['2026-12-25',30],['2027-01-24',40]],25);
 const report=comparePeriods(ledger,'2027-02-10',-1,{today:'2027-02-10'});
 assert.equal(report.current.start,'2026-12-25');assert.equal(report.current.end,'2027-01-24');
 assert.equal(report.previous.start,'2026-11-25');assert.equal(report.previous.end,'2026-12-24');
 assert.equal(report.current.expense,70);assert.equal(report.previous.expense,30);
 const partial=comparePeriods(ledger,'2027-01-10',0,{mode:'matched',today:'2027-01-10'});
 assert.equal(partial.matchedDays,17);assert.equal(partial.previous.end,'2026-12-11');
});

test('zero and negative baselines never produce infinite or misleading percentages',()=>{
 const first=october(ledgerWith([['2026-10-10',100]]));
 assert.equal(first.metrics.expense.delta,100);assert.equal(first.metrics.expense.percent,null);
 assert.equal(first.metrics.balance.delta,-100);assert.equal(first.metrics.balance.percent,null);
 const improved=october(ledgerWith([['2026-09-10',200],['2026-10-10',100]]));
 assert.equal(improved.metrics.balance.delta,100);assert.equal(improved.metrics.balance.percent,null);
 assert.equal(improved.metrics.expense.percent,-50);
 const missingCurrent=october(ledgerWith([['2026-09-10',100]]));
 assert.equal(missingCurrent.metrics.expense.delta,-100);assert.equal(missingCurrent.metrics.expense.percent,-100);
 const empty=october(freshData());
 assert.equal(empty.current.count,0);assert.equal(empty.previous.count,0);assert.deepEqual(empty.categories,[]);
 for(const metric of Object.values(empty.metrics)){assert.equal(metric.delta,0);assert.equal(metric.percent,null);}
});

test('category comparisons include increases, decreases, unchanged and newly used categories',()=>{
 const ledger=ledgerWith([
  ['2026-09-10',100],['2026-10-10',250],
  ['2026-09-10',300,'expense','home'],['2026-10-10',100,'expense','home'],
  ['2026-10-10',50,'expense','shopping'],
  ['2026-09-10',80,'expense','transport'],['2026-10-10',80,'expense','transport'],
  ['2026-09-10',1000,'income'],['2026-10-10',1200,'income']
 ]);
 const categories=october(ledger).categories;
 assert.equal(categories.length,5);
 const food=categories.find(c=>c.id==='food'),home=categories.find(c=>c.id==='home');
 assert.equal(food.delta,150);assert.equal(food.percent,150);
 assert.equal(home.delta,-200);
 assert.equal(categories.find(c=>c.id==='shopping').percent,null);
 assert.equal(categories.find(c=>c.id==='transport').delta,0);
 assert.equal(categories.find(c=>c.id==='salary').delta,200);
 assert.ok(Math.abs(categories[0].delta)>=Math.abs(categories.at(-1).delta));
});

test('the first day compares one day and future cycles fall back to full-period comparison',()=>{
 const ledger=freshData();
 const first=comparePeriods(ledger,'2026-10-01',0,{mode:'matched',today:'2026-10-01'});
 assert.equal(first.matchedDays,1);assert.equal(first.current.end,'2026-10-01');assert.equal(first.previous.end,'2026-09-01');
 const future=comparePeriods(ledger,'2026-10-30',1,{mode:'matched',today:'2026-10-30'});
 assert.equal(future.canMatch,false);assert.equal(future.mode,'full');assert.equal(future.current.end,'2026-11-30');
 const past=comparePeriods(ledger,'2026-10-30',-1,{mode:'matched',today:'2026-10-30'});
 assert.equal(past.isCurrent,false);assert.equal(past.matchedDays,30);
});
