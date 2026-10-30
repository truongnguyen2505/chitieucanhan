import test from 'node:test';
import assert from 'node:assert/strict';
import { nextReminderOccurrence, occurrenceKey, upcomingReminders, isValidReminder, describeReminder } from '../src/reminders.js';
import { freshData, validateData } from '../src/domain.js';
import { LocalRepository } from '../src/repository.js';
const reminder = (patch={}) => ({id:'uniform',title:'Mặc đồng phục công ty',type:'monthly-weekday',time:'08:00',weekday:1,ordinal:1,enabled:true,completedOccurrence:null,...patch});
const local = (year,month,day,hour=0,minute=0) => new Date(year,month-1,day,hour,minute);
const nextKey = (item,from) => {
 const next=nextReminderOccurrence(item,from);
 return next?occurrenceKey(next):null;
};

test('first Monday follows calendar months including Monday starts and year boundaries',()=>{
 assert.equal(nextKey(reminder(),local(2026,5,31)),'2026-06-01T08:00');
 assert.equal(nextKey(reminder(),local(2026,10,30)),'2026-11-02T08:00');
 assert.equal(nextKey(reminder(),local(2026,11,2,9)),'2026-12-07T08:00');
 assert.equal(nextKey(reminder(),local(2026,12,7,9)),'2027-01-04T08:00');
 assert.equal(describeReminder(reminder()),'Thứ Hai đầu tiên hằng tháng, lúc 08:00');
});

test('last and fifth weekdays handle leap February and absent fifth occurrences',()=>{
 assert.equal(nextKey(reminder({ordinal:-1}),local(2028,2,1)),'2028-02-28T08:00');
 assert.equal(nextKey(reminder({ordinal:5}),local(2026,2,1)),'2026-03-30T08:00');
 assert.equal(nextKey(reminder({weekday:0}),local(2026,11,1)),'2026-11-01T08:00');
});

test('monthly dates clamp to month end and weekly/daily schedules preserve local time',()=>{
 assert.equal(nextKey(reminder({type:'monthly-date',monthDay:31}),local(2028,2,1)),'2028-02-29T08:00');
 assert.equal(nextKey(reminder({type:'monthly-date',monthDay:31}),local(2027,2,1)),'2027-02-28T08:00');
 assert.equal(nextKey(reminder({type:'weekly'}),local(2026,11,2,9)),'2026-11-09T08:00');
 assert.equal(nextKey(reminder({type:'daily'}),local(2026,12,31,9)),'2027-01-01T08:00');
 assert.equal(nextReminderOccurrence(reminder(),local(2026,11,1)).getHours(),8);
});

test('red alerts include exactly the upcoming 24 hours and exclude expired or paused reminders',()=>{
 const item=reminder({type:'once',date:'2026-11-02'});
 const due=local(2026,11,2,8),start=new Date(due.getTime()-24*60*60*1000);
 assert.equal(upcomingReminders([item],new Date(start.getTime()-1)).length,0);
 assert.equal(upcomingReminders([item],start).length,1);
 assert.equal(upcomingReminders([item],due).length,1);
 assert.equal(upcomingReminders([item],new Date(due.getTime()+1)).length,0);
 assert.equal(upcomingReminders([{...item,enabled:false}],start).length,0);
 assert.equal(nextReminderOccurrence(item,local(2026,11,3)),null);
});

test('completion hides only its occurrence and does not consume the next month',()=>{
 const now=local(2026,11,1,9),item=reminder();
 const before=structuredClone(item),due=upcomingReminders([item],now)[0];
 assert.equal(due.occurrence,'2026-11-02T08:00');
 const done={...item,completedOccurrence:due.occurrence};
 assert.equal(upcomingReminders([done],now).length,0);
 assert.equal(nextKey(done,now),'2026-12-07T08:00');
 assert.equal(upcomingReminders([done],local(2026,12,6,9)).length,1);
 assert.deepEqual(item,before);
 assert.equal(nextKey(reminder({type:'daily',completedOccurrence:'2026-11-02T08:00'}),now),'2026-11-03T08:00');
 assert.equal(nextKey(reminder({type:'weekly',completedOccurrence:'2026-11-02T08:00'}),now),'2026-11-09T08:00');
 assert.equal(nextKey(reminder({type:'once',date:'2026-11-02',completedOccurrence:'2026-11-02T08:00'}),now),null);
});

test('alerts are ordered by occurrence and update when an app is resumed across the boundary',()=>{
 const items=[reminder({id:'later',type:'once',date:'2026-11-02',time:'09:00'}),reminder({id:'earlier',type:'once',date:'2026-11-02',time:'07:00'})];
 assert.equal(upcomingReminders(items,local(2026,10,31)).length,0);
 assert.deepEqual(upcomingReminders(items,local(2026,11,1,10)).map(item=>item.id),['earlier','later']);
});

test('legacy ledgers and backups migrate to an empty reminder list without modifying the original',()=>{
 const old=freshData();delete old.reminders;
 const before=structuredClone(old);
 assert.deepEqual(validateData(old),{...old,reminders:[]});
 assert.deepEqual(old,before);
});

test('reminder validation rejects malformed dates, times, rules and duplicate IDs',()=>{
 for(const patch of [
  {id:''},{title:''},{title:' '.repeat(5)},{title:'a'.repeat(161)},{title:4},
  {type:'yearly'},{enabled:'true'},{time:'24:00'},{time:'08:60'},{time:'8:00'},
  {weekday:7},{weekday:'1'},{ordinal:0},{ordinal:6},{ordinal:'1'},
  {type:'monthly-date',monthDay:0},{type:'monthly-date',monthDay:32},
  {type:'once',date:'2026-02-30'},{type:'once',date:'2026-13-01'},
  {type:'once',date:'2026-1-01'},{completedOccurrence:'bad'},
  {completedOccurrence:'2026-02-30T08:00'}
 ]){
  const item=reminder(patch),ledger=freshData();ledger.reminders=[item];
  assert.equal(isValidReminder(item),false,JSON.stringify(patch));
  assert.throws(()=>validateData(ledger),JSON.stringify(patch));
 }
 for(const value of [null,{},'invalid',[null]]){
  const ledger=freshData();ledger.reminders=value;assert.throws(()=>validateData(ledger));
 }
 const ledger=freshData();ledger.reminders=[reminder(),reminder()];
 assert.throws(()=>validateData(ledger));
});

test('reminders persist across reloads/backups, preserve completed occurrences and clear on reset',async()=>{
 const values=new Map();
 globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const ledger=freshData();
 ledger.reminders=[reminder({title:'  Mặc đồng phục  ',completedOccurrence:'2026-11-02T08:00'})];
 await new LocalRepository().save(ledger);
 const loaded=await new LocalRepository().load();
 assert.equal(loaded.reminders[0].title,'Mặc đồng phục');
 assert.equal(loaded.reminders[0].completedOccurrence,'2026-11-02T08:00');
 assert.deepEqual(validateData(JSON.parse(JSON.stringify(loaded))),loaded);
 assert.equal(loaded.transactions.length,0);
 await new LocalRepository().reset();
 assert.deepEqual((await new LocalRepository().load()).reminders,[]);
});

test('failed reminder saves retain the previous stored ledger',async()=>{
 const saved=JSON.stringify(freshData());
 globalThis.localStorage={getItem:()=>saved,setItem:()=>{throw new Error('quota exceeded');}};
 const ledger=freshData();ledger.reminders=[reminder()];
 await assert.rejects(new LocalRepository().save(ledger));
 assert.equal(new LocalRepository().raw(),saved);
});
