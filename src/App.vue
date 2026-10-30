<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Leaf, LayoutDashboard, ArrowLeftRight, Shapes, Settings2, Plus, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, X, Search, Pencil, Trash2, Download, Upload, Tag, Check, Wallet, Utensils, ShoppingBag, Car, House, BriefcaseBusiness, CircleDollarSign, TrendingUp, CalendarDays, LoaderCircle, UserRound, Smartphone, Copy, Zap, RefreshCw, Bell } from 'lucide-vue-next';
import { repository } from './repository';
import InstallApp from './InstallApp.vue';
import QuickEntries from './QuickEntries.vue';
import TransactionRow from './TransactionRow.vue';
import PeriodComparison from './PeriodComparison.vue';
import ReminderAlerts from './ReminderAlerts.vue';
import ReminderManager from './ReminderManager.vue';
import { formatAmountInput, amountInputState, amountToWords } from './amount-input.js';
import { createInstallManager } from './install.js';
import { freshData, dateKey, cycleFor, money, uid, totals, validateData, transactionDraft, quickTemplateDraft } from './domain';
const clone = value => JSON.parse(JSON.stringify(value));
const retry = () => window.location.reload();
const icons = { Utensils, ShoppingBag, Car, House, Wallet, Shapes, BriefcaseBusiness, CircleDollarSign };
const iconLabels = { Utensils:'Ăn uống', ShoppingBag:'Mua sắm', Car:'Di chuyển', House:'Nhà cửa', Wallet:'Ví tiền', Shapes:'Tổng hợp', BriefcaseBusiness:'Công việc', CircleDollarSign:'Tiền' };
const data = ref(freshData()), ready = ref(false), busy = ref(false), fatal = ref(''), notice = ref('');
const page = ref('dashboard'), offset = ref(0), anchor = ref(dateKey()), modal = ref(null), query = ref(''), filter = ref('all'), filterTag = ref(''), filterCategory = ref('');
const analysisBy = ref('categories'), analysisType = ref('expense'), form = ref({}), formError = ref(''), fileInput = ref(null), cycleDay = ref(1);
const profileName = ref(''), profileError = ref('');
const expandedGroups = ref({ expense:false, income:false, tags:false });
const transactionMode = ref('new'), templateSourceName = ref('');
const formattedAmount = computed(()=>formatAmountInput(form.value.amount));
const amountWords = computed(()=>amountToWords(form.value.amount));
const editingTransaction = computed(()=>modal.value==='transaction'&&data.value.transactions.some(t=>t.id===form.value.id));
const editingTemplate = computed(()=>modal.value==='template'&&data.value.quickTemplates.some(t=>t.id===form.value.id));
const categoryInUse = id => [...data.value.transactions,...data.value.quickTemplates].some(t=>t.categoryId===id);
const installState = ref({});
const installManager = createInstallManager(window, state => { installState.value = state; });
installState.value = installManager.getState();
onUnmounted(() => installManager.dispose());
const requestInstall = () => installManager.install();
const reminderNow = ref(new Date());
let reminderClock;
function refreshReminderTime(){reminderNow.value=new Date();}
onUnmounted(()=>{
 window.clearInterval(reminderClock);
 window.removeEventListener('focus',refreshReminderTime);
 document.removeEventListener('visibilitychange',refreshReminderTime);
});
const displayName = computed(()=>data.value.settings.displayName || 'Sổ của tôi');
const avatarInitial = computed(()=>Array.from(data.value.settings.displayName || 'T')[0].toLocaleUpperCase('vi-VN'));
const nav = [{id:'dashboard',label:'Tổng quan',icon:LayoutDashboard},{id:'transactions',label:'Giao dịch',icon:ArrowLeftRight},{id:'categories',label:'Danh mục & tag',icon:Shapes},{id:'settings',label:'Cài đặt',icon:Settings2}];
const settingsActions = [
 {id:'install',label:'Thêm vào màn hình chính',icon:Smartphone},
 {id:'profile',label:'Tên của bạn',icon:UserRound},
 {id:'cycle',label:'Chu kỳ tính thu chi',icon:CalendarDays},
 {id:'reminders',label:'Nhắc nhở',icon:Bell},
 {id:'reload',label:'Tải lại ứng dụng',icon:RefreshCw},
 {id:'backup',label:'Sao lưu dữ liệu',icon:Download},
 {id:'restore',label:'Khôi phục dữ liệu',icon:Upload},
 {id:'reset',label:'Reset dữ liệu',icon:Trash2}
];
const modalTitle = computed(()=>{
 if(modal.value==='transaction')return editingTransaction.value?'Sửa giao dịch':transactionMode.value==='copy'?'Sao chép giao dịch':transactionMode.value==='quick'?'Ghi nhanh từ mẫu':'Thêm giao dịch';
 if(modal.value==='template')return editingTemplate.value?'Sửa mẫu ghi nhanh':'Tạo mẫu ghi nhanh';
 if(modal.value==='reminders')return 'Nhắc nhở';
 if(modal.value==='delete')return 'Xóa '+form.value.name;
 return {install:'Thêm vào màn hình chính',profile:'Tên của bạn',cycle:'Chu kỳ tính thu chi',backup:'Sao lưu dữ liệu',restore:'Khôi phục dữ liệu',category:'Danh mục thu chi',tag:'Tag chi tiêu',import:'Xác nhận khôi phục dữ liệu',reset:'Xóa toàn bộ dữ liệu?',demo:'Khám phá sổ mẫu'}[modal.value]||'';
});
const period = computed(()=>cycleFor(anchor.value, data.value.settings.startDay, offset.value));
const inPeriod = computed(()=>data.value.transactions.filter(t=>t.date>=period.value.start&&t.date<=period.value.end));
const summary = computed(()=>totals(inPeriod.value));
const category = id => data.value.categories.find(c=>c.id===id);
const tagName = id => data.value.tags.find(t=>t.id===id)?.name;
const shortDate = s => new Date(s+'T12:00:00').toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'});
const periodLabel = computed(()=>`${shortDate(period.value.start)} – ${shortDate(period.value.end)} / ${period.value.end.slice(0,4)}`);
const rows = computed(()=>inPeriod.value.filter(t=>(filter.value==='all'||t.type===filter.value)&&(!filterCategory.value||t.categoryId===filterCategory.value)&&(!filterTag.value||t.tagIds.includes(filterTag.value))&&`${t.note} ${category(t.categoryId)?.name} ${t.tagIds.map(tagName).join(' ')}`.toLocaleLowerCase('vi').includes(query.value.toLocaleLowerCase('vi'))).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)));
const groups = computed(()=>{
 const result=[];
 for(const t of rows.value){
  let group=result.find(g=>g.date===t.date);
  if(!group){group={date:t.date,items:[]};result.push(group);}
  group.items.push(t);
 }
 return result.map(group=>({...group,...totals(group.items)}));
});
const chart = computed(()=>{
 const source = analysisBy.value==='categories'?data.value.categories.filter(c=>c.type===analysisType.value):[...data.value.tags,{id:'untagged',name:'Chưa gắn tag'}];
 return source.map((c,i)=>({...c,color:c.color||['#176b51','#f1a65a','#a897cf','#82b5ce','#d58b8b'][i%5],value:inPeriod.value.filter(t=>t.type===analysisType.value&&(analysisBy.value==='categories'?t.categoryId===c.id:c.id==='untagged'?t.tagIds.length===0:t.tagIds.includes(c.id))).reduce((s,t)=>s+t.amount,0)})).filter(c=>c.value>0).sort((a,b)=>b.value-a.value);
});
const chartTotal = computed(()=>chart.value.reduce((s,c)=>s+c.value,0));
const donutStyle = computed(()=>{let n=0;return {background:chartTotal.value?`conic-gradient(${chart.value.map(c=>{const a=n;n+=c.value/chartTotal.value*100;return `${c.color} ${a}% ${n}%`;}).join(',')})`:'#e8eeea'};});
const daily = computed(()=>{const start=new Date(period.value.start+'T12:00:00'), end=new Date(period.value.end+'T12:00:00'), days=[];for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){const key=dateKey(d);days.push({date:key,...totals(inPeriod.value.filter(t=>t.date===key))});}return days;});
const maxDaily = computed(()=>Math.max(1,...daily.value.flatMap(d=>[d.income,d.expense])));
let timer;
let lastFocus;
watch(modal, async (value, old) => {
 if(value && !old) lastFocus=document.activeElement;
 document.body.style.overflow=value?'hidden':'';
 await nextTick();
 if(value) (document.querySelector('.modal input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not(:disabled)')||document.querySelector('.modal button:not(:disabled)'))?.focus();
 else lastFocus?.focus();
});
document.addEventListener('keydown', event => {
 if(!modal.value)return;
 if(event.key==='Escape'&&!busy.value){modal.value=null;return;}
 if(event.key!=='Tab')return;
 const items=[...document.querySelectorAll('.modal button:not(:disabled), .modal input:not(:disabled), .modal select:not(:disabled), .modal textarea:not(:disabled)')];
 const first=items[0],last=items.at(-1);
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
});
function toast(message){notice.value=message;clearTimeout(timer);timer=setTimeout(()=>notice.value='',4500);}
async function commit(next){ if(busy.value||!ready.value)return false;busy.value=true;try{await repository.save(next);data.value=next;return true;}catch(e){formError.value=e.message;toast(e.message);return false;}finally{busy.value=false;} }
function open(type,item){
 if(busy.value||!ready.value)return;
 formError.value='';profileError.value='';transactionMode.value='new';templateSourceName.value='';
 if(type==='profile'||type==='cycle')syncSettings();
 const emptyEntry={type:'expense',amount:'',categoryId:data.value.categories.find(c=>c.type==='expense')?.id||'',tagIds:[],note:''};
 form.value=type==='transaction'?item?clone(item):transactionDraft(emptyEntry):type==='template'?item?clone(item):quickTemplateDraft(emptyEntry,''):type==='category'?item?clone(item):{id:uid(),name:'',type:'expense',color:'#176b51',icon:'Shapes'}:type==='tag'?item?clone(item):{id:uid(),name:''}:{...item};
 modal.value=type;
}
function copyTransaction(source){
 if(busy.value||!ready.value)return;
 open('transaction',transactionDraft(source));transactionMode.value='copy';
 nextTick(()=>document.querySelector('#amount')?.focus());
}
function useQuickTemplate(source){
 if(busy.value||!ready.value)return;
 open('transaction',transactionDraft(source));transactionMode.value='quick';templateSourceName.value=source.name;
}
function templateFromTransaction(){
 if(busy.value||!ready.value)return;
 const source=clone(form.value),name=source.note.trim().slice(0,80)||category(source.categoryId)?.name||'Mẫu mới';
 open('template',quickTemplateDraft(source,name));
}
function updateAmount(event){
 const input=event.target;
 const {digits,formatted,caret}=amountInputState(input.value,input.selectionStart,form.value.amount,event.inputType);
 form.value.amount=digits;
 input.value=formatted;
 input.setSelectionRange(caret,caret);
}
function setType(type){form.value.type=type;form.value.categoryId=data.value.categories.find(c=>c.type===type)?.id||'';}
async function saveForm(){
 if(busy.value||!ready.value)return;
 const kind=modal.value,f=clone(form.value),next=clone(data.value),isNewTransaction=kind==='transaction'&&!editingTransaction.value;formError.value='';
 if(kind==='transaction'||kind==='template'){
   f.amount=Number(f.amount);
   if(!Number.isSafeInteger(f.amount)||f.amount<=0){formError.value='Nhập số tiền nguyên lớn hơn 0 và trong giới hạn an toàn.';return;}
   f.note=f.note.trim();
   if(!f.categoryId||(kind==='transaction'&&!f.date)){formError.value='Vui lòng chọn '+(kind==='transaction'?'ngày và ':'')+'danh mục.';return;}
 }
 if(kind!=='transaction'){
   f.name=f.name.trim();if(!f.name){formError.value='Vui lòng nhập tên.';return;}
   const source=kind==='category'?next.categories:kind==='template'?next.quickTemplates:next.tags;
   if(f.name.length>80){formError.value='Tên không được dài quá 80 ký tự.';return;}
   if(source.some(x=>x.id!==f.id&&x.name.toLocaleLowerCase('vi')===f.name.toLocaleLowerCase('vi')&&(kind!=='category'||x.type===f.type))){formError.value='Tên này đã tồn tại.';return;}
 }
 const key=kind==='transaction'?'transactions':kind==='template'?'quickTemplates':kind==='category'?'categories':'tags';
 const index=next[key].findIndex(x=>x.id===f.id);if(index<0)next[key].push(f);else next[key][index]=f;
 if(await commit(next)){
   if(kind==='category') expandedGroups.value[f.type]=true;
   if(kind==='tag') expandedGroups.value.tags=true;
   if(isNewTransaction){
     const target=cycleFor(f.date,next.settings.startDay),current=cycleFor(anchor.value,next.settings.startDay);
     offset.value=(Number(target.start.slice(0,4))-Number(current.start.slice(0,4)))*12+Number(target.start.slice(5,7))-Number(current.start.slice(5,7));
     query.value='';filter.value='all';filterTag.value='';filterCategory.value='';
   }
   modal.value=null;toast(kind==='template'?'Đã lưu mẫu ghi nhanh':'Đã lưu thành công');
 }
}
async function deleteItem(){const next=clone(data.value),{kind,id}=form.value;
 if(busy.value||!ready.value)return;
 if(kind==='categories'&&categoryInUse(id)){formError.value='Danh mục đang có giao dịch hoặc mẫu ghi nhanh. Hãy đổi danh mục trong các mục đó trước khi xóa.';return;}
 next[kind]=next[kind].filter(x=>x.id!==id);
 if(kind==='tags')[...next.transactions,...next.quickTemplates].forEach(t=>t.tagIds=t.tagIds.filter(x=>x!==id));
 if(await commit(next)){modal.value=null;toast('Đã xóa');}}
function syncSettings(){cycleDay.value=data.value.settings.startDay;profileName.value=data.value.settings.displayName;profileError.value='';}
async function saveReminders(reminders,message='Đã cập nhật nhắc nhở'){
 if(busy.value||!ready.value)return false;
 formError.value='';
 const next=clone(data.value);next.reminders=clone(reminders);
 if(await commit(next)){refreshReminderTime();toast(message);return true;}
 return false;
}
async function completeReminder({id,occurrence}){
 if(busy.value||!ready.value)return;
 await saveReminders(data.value.reminders.map(item=>item.id===id?{...item,completedOccurrence:occurrence}:item),'Đã hoàn thành nhắc nhở lần này');
}
async function saveProfile(){
 const name=profileName.value.trim();profileError.value='';
 if(name.length>80){profileError.value='Tên của bạn không được dài quá 80 ký tự.';return;}
 const next=clone(data.value);next.settings.displayName=name;
 if(await commit(next)){profileName.value=name;modal.value=null;toast('Đã lưu tên của bạn');}
 else profileError.value=formError.value;
}
async function saveCycle(){const next=clone(data.value);next.settings.startDay=Number(cycleDay.value);if(await commit(next)){offset.value=0;modal.value=null;toast('Đã cập nhật chu kỳ tính thu chi');}}
function download(content,name){const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportData(){download(JSON.stringify(data.value,null,2),`la-sao-luu-${dateKey()}.json`);toast('Đã xuất bản sao lưu');}
async function importData(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;formError.value='';try{if(file.size>10*1024*1024)throw new Error('Chỉ nhận file JSON tối đa 10 MB.');const parsed=validateData(JSON.parse(await file.text()));open('import',{parsed,name:file.name});}catch(e){formError.value=e.message;toast(e.message);}}
async function confirmImport(){if(await commit(clone(form.value.parsed))){syncSettings();offset.value=0;modal.value=null;toast('Đã khôi phục dữ liệu');}}
async function resetData(){
 if(busy.value)return;
 busy.value=true;formError.value='';
 try{
  await repository.reset();
  data.value=freshData();syncSettings();anchor.value=dateKey();offset.value=0;
  query.value='';filter.value='all';filterTag.value='';filterCategory.value='';
  analysisBy.value='categories';analysisType.value='expense';fatal.value='';ready.value=true;
  modal.value=null;form.value={};toast('Đã reset dữ liệu. Sổ đã trở về trạng thái ban đầu.');
 }catch(e){formError.value=e.message;}
 finally{busy.value=false;}
}
async function demo(){const next=clone(data.value);const p=period.value;const entries=[['salary',28000000,'Lương tháng','income',0,['work']],['food',85000,'Bữa trưa cùng đồng nghiệp','expense',1,['work']],['shopping',690000,'Một chiếc áo mới','expense',2,['personal']],['transport',65000,'Di chuyển đến văn phòng','expense',3,['work']],['home',4500000,'Tiền thuê nhà','expense',4,['personal']],['food',320000,'Bữa tối cùng gia đình','expense',5,['family']],['extra',2000000,'Dự án ngoài giờ','income',6,['work']],['other',180000,'Sách cho cuối tuần','expense',7,['personal']]];
 for(const [categoryId,amount,note,type,day,tagIds] of entries){let d=new Date(p.start+'T12:00:00');d.setDate(d.getDate()+day);next.transactions.push({id:uid(),date:dateKey(d),categoryId,amount,note,type,tagIds});}
 if(await commit(next)){modal.value=null;toast('Đã thêm 8 giao dịch mẫu vào chu kỳ đang xem');}}
function go(id){page.value=id;query.value='';filter.value='all';filterTag.value='';filterCategory.value='';}
onMounted(async()=>{
 refreshReminderTime();
 reminderClock=window.setInterval(refreshReminderTime,30000);
 window.addEventListener('focus',refreshReminderTime);
 document.addEventListener('visibilitychange',refreshReminderTime);
 try {
  data.value=await repository.load();syncSettings();ready.value=true;
  if(window.location.hash==='#install') {
   open('install');
   window.history.replaceState(null,'',window.location.pathname+window.location.search);
  }
 } catch(e) { fatal.value=e.message; }
});
</script>

<template>
 <div class="app-shell">
  <aside class="sidebar">
   <a class="brand" href="#" @click.prevent="go('dashboard')"><span class="brand-mark"><Leaf :size="24"/></span><span>lá<span class="brand-dot">.</span></span></a>
   <div class="brand-caption">SỔ THU CHI CÁ NHÂN</div>
   <nav aria-label="Điều hướng chính"><button v-for="n in nav" :key="n.id" :class="['nav-item',{active:page===n.id}]" @click="go(n.id)"><component :is="n.icon" :size="20"/>{{n.label}}<span v-if="page===n.id" class="nav-dot"></span></button></nav>
   <div class="sidebar-note"><span class="mini-leaf"><Leaf :size="20"/></span><strong>Từng chút một,<br>vững vàng hơn.</strong><p>Hiểu dòng tiền hôm nay.<br>An tâm cho ngày mai.</p></div>
   <div class="local-status"><span></span>{{ repository.raw ? 'Dữ liệu lưu trên thiết bị' : 'Dữ liệu qua REST API' }}</div>
   <button type="button" class="profile" :disabled="!ready||busy" aria-label="Cài đặt tên cá nhân" @click="open('profile')"><span class="avatar">{{avatarInitial}}</span><span class="profile-copy"><strong :title="displayName">{{displayName}}</strong><small>Không gian tài chính cá nhân</small></span><Pencil :size="14" class="muted"/></button>
  </aside>
  <main>
   <header class="topbar"><span class="breadcrumb">Không gian cá nhân <span>/</span> {{nav.find(n=>n.id===page)?.label}}</span><span class="today"><CalendarDays :size="15"/>{{new Date().toLocaleDateString('vi-VN',{day:'numeric',month:'long',year:'numeric'})}}</span><span class="mobile-brand"><Leaf :size="21"/> lá.</span><button type="button" class="header-profile" :disabled="!ready||busy" :aria-label="'Cài đặt tên cá nhân: '+displayName" @click="open('profile')"><span class="profile-label" :title="displayName">{{displayName}}</span><span class="avatar small">{{avatarInitial}}</span></button></header>
   <div class="content">
    <div v-if="fatal" class="fatal" role="alert"><h2>Chưa thể mở sổ</h2><p>{{fatal}}</p><button v-if="repository.raw" class="btn" @click="download(repository.raw()||'null','la-du-lieu-goc.json')">Xuất dữ liệu gốc</button><button class="btn" @click="retry">Thử lại</button></div>
    <template v-else-if="ready">
     <div class="page-heading"><div><div class="eyebrow">{{page==='dashboard'&&data.settings.displayName?'Xin chào, '+data.settings.displayName+'!':'MỖI NGÀY MỘT CHÚT, TÀI CHÍNH TỐT HƠN'}}</div><h1>{{page==='dashboard'?'Bức tranh tài chính':page==='transactions'?'Nhật ký thu chi':page==='categories'?'Sắp xếp theo cách của bạn':'Thiết lập sổ của bạn'}}<span v-if="page==='dashboard'" class="heading-spark">✳</span></h1><p>{{page==='dashboard'?'Biết tiền đi đâu, để chủ động hơn mỗi ngày.':page==='transactions'?'Từng khoản nhỏ, một bức tranh rõ ràng.':page==='categories'?'Danh mục rõ ràng, theo dõi nhẹ nhàng.':'Chọn chức năng bạn muốn thực hiện.'}}</p></div><button v-if="page!=='settings'" type="button" class="btn primary add-main" aria-label="Thêm giao dịch" @click="open('transaction')"><Plus :size="19"/><span class="add-main-label">Thêm giao dịch</span></button></div>
     <ReminderAlerts v-if="page==='dashboard'" :reminders="data.reminders" :now="reminderNow" :disabled="busy" @complete="completeReminder" @manage="open('reminders')"/>
     <button v-if="page==='dashboard'&&!installState.isInstalled" type="button" class="home-screen-entry" aria-haspopup="dialog" @click="open('install')"><Smartphone :size="22" aria-hidden="true"/><span><strong>Thêm vào màn hình chính</strong><small>Mở sổ nhanh bằng icon trên điện thoại</small></span><ChevronRight :size="18" aria-hidden="true"/></button>
     <div v-if="page==='dashboard'||page==='transactions'" class="period-toolbar"><div class="period-control"><button aria-label="Chu kỳ trước" @click="offset--"><ChevronLeft :size="17"/></button><CalendarDays :size="17"/><strong>{{periodLabel}}</strong><button aria-label="Chu kỳ sau" @click="offset++"><ChevronRight :size="17"/></button></div><button v-if="offset!==0" class="text-btn" @click="offset=0">Về kỳ hiện tại</button><span class="period-hint">Chu kỳ bắt đầu ngày {{data.settings.startDay}} hằng tháng <button aria-label="Đổi chu kỳ" @click="open('cycle')"><Settings2 :size="14"/></button></span></div>

     <QuickEntries v-if="page==='dashboard'||page==='transactions'" :templates="data.quickTemplates" :categories="data.categories" :icons="icons" :disabled="busy" @create="open('template')" @edit="open('template',$event)" @use="useQuickTemplate"/>
     <template v-if="page==='dashboard'">
      <section class="summary-grid" aria-label="Tóm tắt thu chi"><article class="balance-card"><div class="card-top"><span>Số dư trong kỳ</span><Wallet :size="21"/></div><h2>{{money(summary.balance)}}</h2><div class="balance-footer"><span class="light-dot"></span>Thu nhập − Chi tiêu<span class="card-decoration">↗</span></div></article><article class="summary-card"><div class="card-top"><span>Tổng thu nhập</span><span class="round-icon income"><ArrowDownLeft :size="20"/></span></div><h2>{{money(summary.income)}}</h2><p><span class="income-text">{{inPeriod.filter(t=>t.type==='income').length}} khoản thu</span><span> trong chu kỳ này</span></p></article><article class="summary-card"><div class="card-top"><span>Tổng chi tiêu</span><span class="round-icon expense"><ArrowUpRight :size="20"/></span></div><h2>{{money(summary.expense)}}</h2><p><span class="expense-text">{{inPeriod.filter(t=>t.type==='expense').length}} khoản chi</span><span> trong chu kỳ này</span></p></article></section>
      <PeriodComparison :ledger="data" :anchor="anchor" :offset="offset"/>
      <section class="charts-grid"><article class="panel breakdown"><div class="panel-heading"><div><h3>Tiền của bạn đi đâu?</h3><p>Nhìn rõ từng khoản {{analysisType==='expense'?'chi tiêu':'thu nhập'}}</p></div><select v-model="analysisType" aria-label="Loại phân tích"><option value="expense">Chi tiêu</option><option value="income">Thu nhập</option></select></div><div class="segmented"><button :class="{selected:analysisBy==='categories'}" @click="analysisBy='categories'">Theo danh mục</button><button :class="{selected:analysisBy==='tags'}" @click="analysisBy='tags'">Theo tag</button></div><div v-if="chart.length" class="breakdown-body"><div class="donut" :style="donutStyle" role="img" :aria-label="'Phân bổ '+(analysisType==='expense'?'chi tiêu':'thu nhập')"><div><small>{{analysisBy==='tags'?'Tổng theo tag':'Tổng cộng'}}</small><strong>{{money(chartTotal)}}</strong><span>{{chart.length}} {{analysisBy==='tags'?'nhóm tag':'danh mục'}}</span></div></div><div class="legend"><div v-for="c in chart" :key="c.id" class="legend-row"><span class="color-dot" :style="{background:c.color}"></span><span>{{c.name}}</span><div><strong>{{money(c.value)}}</strong><small>{{Math.round(c.value/chartTotal*100)}}%</small></div></div></div></div><div v-else class="chart-empty"><Shapes :size="32"/><p>Chưa có khoản {{analysisType==='expense'?'chi':'thu'}} trong kỳ</p><small>Ghi lại giao dịch đầu tiên để xem phân bổ.</small></div><p v-if="analysisBy==='tags'" class="chart-footnote">Một giao dịch có nhiều tag được tính ở mỗi tag; tổng theo tag có thể lớn hơn tổng thu/chi.</p></article>
      <article class="panel trend-panel"><div class="panel-heading"><div><h3>Nhịp thu chi</h3><p>Dòng tiền mỗi ngày trong chu kỳ</p></div><TrendingUp :size="20" class="muted"/></div><div class="chart-key"><span><i class="key-income"></i>Thu nhập</span><span><i class="key-expense"></i>Chi tiêu</span></div><div class="bar-chart" role="img" aria-label="Biểu đồ thu chi theo ngày"><div class="chart-gridlines"><span>{{money(maxDaily)}}</span><span>{{money(Math.round(maxDaily/2))}}</span><span>0 ₫</span></div><div class="bars"><div v-for="d in daily" :key="d.date" class="bar-pair" :title="`${shortDate(d.date)}: Thu ${money(d.income)}, chi ${money(d.expense)}`"><div :style="{height:(d.income/maxDaily*100)+'%'}" class="bar income-bar"></div><div :style="{height:(d.expense/maxDaily*100)+'%'}" class="bar expense-bar"></div></div></div></div><div class="chart-axis"><span>{{shortDate(period.start)}}</span><span>{{shortDate(daily[Math.floor(daily.length/2)]?.date||period.start)}}</span><span>{{shortDate(period.end)}}</span></div><div class="trend-caption"><span class="round-icon income"><Leaf :size="17"/></span><p>{{summary.income||summary.expense ? summary.balance>=0?'Bạn đang giữ dòng tiền tích cực. Cứ tiếp tục nhé!':'Chi tiêu đang lớn hơn thu nhập trong kỳ này.':'Bắt đầu từ một ghi chép nhỏ hôm nay.'}}</p></div></article></section>
      <section class="panel recent"><div class="panel-heading"><div><h3>Giao dịch gần đây <span class="count-pill">{{inPeriod.length}}</span></h3><p>Những khoản thu chi trong chu kỳ của bạn</p></div><button class="text-btn" @click="go('transactions')">Xem tất cả <ArrowUpRight :size="15"/></button></div><div v-if="!inPeriod.length" class="empty"><span class="empty-icon"><ArrowLeftRight :size="25"/></span><h3>Một khởi đầu mới cho chiếc ví</h3><p>Ghi lại khoản thu hoặc chi đầu tiên của bạn.</p><button class="btn primary" @click="open('transaction')"><Plus :size="17"/>Thêm giao dịch đầu tiên</button><button v-if="!data.transactions.length" class="text-btn demo-btn" @click="open('demo')">Khám phá với dữ liệu mẫu</button></div><TransactionRow v-for="t in [...inPeriod].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)" :key="t.id" :transaction="t" :category="category(t.categoryId)" :tags="data.tags" :icons="icons" :disabled="busy" :date-label="shortDate(t.date)" @edit="open('transaction',$event)" @copy="copyTransaction"/></section>
     </template>

     <template v-if="page==='transactions'"><section class="panel transaction-panel"><div class="filters"><label class="search"><Search :size="18"/><input v-model="query" placeholder="Tìm ghi chú, danh mục, tag…" aria-label="Tìm giao dịch"></label><select v-model="filter" aria-label="Lọc thu chi"><option value="all">Tất cả thu chi</option><option value="expense">Khoản chi</option><option value="income">Khoản thu</option></select><select v-model="filterCategory" aria-label="Lọc danh mục"><option value="">Mọi danh mục</option><option v-for="c in data.categories" :key="c.id" :value="c.id">{{c.name}} ({{c.type==='income'?'thu':'chi'}})</option></select><select v-model="filterTag" aria-label="Lọc tag"><option value="">Mọi tag</option><option v-for="t in data.tags" :key="t.id" :value="t.id">{{t.name}}</option></select></div><div class="list-summary">{{rows.length}} giao dịch <strong>Thu {{money(totals(rows).income)}} <span>·</span> Chi {{money(totals(rows).expense)}}</strong></div><div v-if="!rows.length" class="empty"><Search :size="32"/><h3>Chưa có giao dịch phù hợp</h3><p>Thử đổi bộ lọc, chu kỳ hoặc thêm giao dịch mới.</p></div>
      <details v-for="g in groups" :key="g.date" class="transaction-day">
       <summary class="group-date">
        <span class="transaction-day-label">
         <ChevronRight :size="18" class="transaction-day-chevron" aria-hidden="true"/>
         <span>
          <span class="transaction-day-date">{{new Date(g.date+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}}</span>
          <span class="transaction-day-count">{{g.items.length}} giao dịch</span>
         </span>
        </span>
        <span class="transaction-day-totals">
         <span class="income-text">Thu {{money(g.income)}}</span>
         <span class="expense-text">Chi {{money(g.expense)}}</span>
        </span>
       </summary>
       <TransactionRow v-for="t in g.items" :key="t.id" :transaction="t" :category="category(t.categoryId)" :tags="data.tags" :icons="icons" :disabled="busy" @edit="open('transaction',$event)" @copy="copyTransaction"/>
      </details>
     </section></template>

     <template v-if="page==='categories'">
      <div class="management-grid">
       <section v-for="type in ['expense','income']" :key="type" class="panel">
        <div class="panel-heading management-heading">
         <h3><button type="button" class="group-toggle" :aria-expanded="expandedGroups[type]" :aria-controls="'category-group-'+type" @click="expandedGroups[type]=!expandedGroups[type]">
          <ChevronRight :size="18" class="group-chevron" :class="{expanded:expandedGroups[type]}" aria-hidden="true"/>
          <span>{{type==='expense'?'Danh mục chi tiêu':'Danh mục thu nhập'}}</span>
          <span class="count-pill">{{data.categories.filter(x=>x.type===type).length}}</span>
         </button></h3>
         <button type="button" class="icon-btn" :aria-label="'Thêm danh mục '+(type==='expense'?'chi tiêu':'thu nhập')" @click="open('category');form.type=type"><Plus :size="20"/></button>
        </div>
        <div :id="'category-group-'+type" v-show="expandedGroups[type]">
         <div v-for="c in data.categories.filter(x=>x.type===type)" :key="c.id" class="manage-row"><span class="category-icon" :style="{background:c.color+'22',color:c.color}"><component :is="icons[c.icon]||Shapes" :size="20"/></span><strong>{{c.name}}</strong><button class="icon-btn" :aria-label="'Sửa '+c.name" @click="open('category',c)"><Pencil :size="16"/></button><button class="icon-btn" :aria-label="'Xóa '+c.name" @click="open('delete',{kind:'categories',id:c.id,name:c.name})"><Trash2 :size="16"/></button></div>
         <p v-if="!data.categories.some(x=>x.type===type)" class="management-empty muted">Chưa có danh mục. Nhấn + để thêm danh mục đầu tiên.</p>
        </div>
       </section>
       <section class="panel tag-panel">
        <div class="panel-heading management-heading">
         <h3><button type="button" class="group-toggle" :aria-expanded="expandedGroups.tags" aria-controls="tag-group" @click="expandedGroups.tags=!expandedGroups.tags">
          <ChevronRight :size="18" class="group-chevron" :class="{expanded:expandedGroups.tags}" aria-hidden="true"/>
          <span>Tag của bạn</span><span class="count-pill">{{data.tags.length}}</span>
         </button></h3>
         <button type="button" class="btn" @click="open('tag')"><Plus :size="17"/>Thêm tag</button>
        </div>
        <div id="tag-group" v-show="expandedGroups.tags">
         <p class="management-description muted">Gắn nhiều tag cho một giao dịch để theo dõi linh hoạt.</p>
         <div class="tag-manager"><div v-for="t in data.tags" :key="t.id"><Tag :size="15"/><strong>{{t.name}}</strong><button class="icon-btn" :aria-label="'Sửa tag '+t.name" @click="open('tag',t)"><Pencil :size="14"/></button><button class="icon-btn" :aria-label="'Xóa tag '+t.name" @click="open('delete',{kind:'tags',id:t.id,name:t.name})"><X :size="15"/></button></div></div>
         <p v-if="!data.tags.length" class="management-empty muted">Chưa có tag. Tạo tag đầu tiên của bạn.</p>
        </div>
       </section>
      </div>
     </template>

     <template v-if="page==='settings'">
      <section class="panel settings-menu" aria-label="Các chức năng cài đặt">
       <button v-for="action in settingsActions" :key="action.id" type="button" :class="['settings-action',{danger:action.id==='reset'}]" :disabled="busy" :aria-haspopup="action.id==='reload'?undefined:'dialog'" @click="action.id==='reload'?retry():open(action.id)">
        <span class="settings-action-icon"><component :is="action.icon" :size="21" aria-hidden="true"/></span>
        <span class="settings-action-label">{{action.label}}</span>
        <ChevronRight :size="18" class="settings-action-chevron" aria-hidden="true"/>
       </button>
      </section>
     </template>
     <footer class="page-footer"><span><span class="status-dot"></span>{{repository.raw?'Chỉ mình bạn, trên thiết bị này':'Kết nối kho dữ liệu REST'}}</span><span>Một thói quen nhỏ. Một thay đổi lớn.</span></footer>
    </template><div v-else class="loading"><LoaderCircle :size="26"/>Đang mở sổ của bạn…</div>
   </div>
  </main>
  <nav class="bottom-nav" aria-label="Điều hướng di động"><button v-for="n in nav" :key="n.id" :class="{active:page===n.id}" @click="go(n.id)"><component :is="n.icon" :size="21"/><span>{{n.id==='categories'?'Danh mục':n.label}}</span></button></nav>
  <div v-if="notice" class="toast" role="status"><Check :size="18"/>{{notice}}</div>
  <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="importData">
  <div v-if="modal" class="modal-overlay" @click.self="!busy&&(modal=null)" @keydown.esc="!busy&&(modal=null)"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><div class="modal-header"><h2 id="modal-title">{{modalTitle}}</h2><button class="icon-btn" :disabled="busy" aria-label="Đóng" @click="modal=null"><X :size="22"/></button></div>
   <InstallApp v-if="modal==='install'" :state="installState" @install="requestInstall" @close="modal=null"/>
   <ReminderManager v-else-if="modal==='reminders'" :reminders="data.reminders" :now="reminderNow" :save="saveReminders" :disabled="busy" :error="formError"/>
   <form v-else-if="modal==='profile'" class="settings-dialog" @submit.prevent="saveProfile">
    <p class="dialog-copy">Đặt tên để cá nhân hóa không gian thu chi của bạn.</p>
    <label for="display-name">Tên hiển thị</label>
    <input id="display-name" v-model="profileName" type="text" autocomplete="name" maxlength="80" placeholder="Ví dụ: Minh Anh" :aria-describedby="profileError?'display-name-hint display-name-error':'display-name-hint'" :aria-invalid="!!profileError" :disabled="busy" @input="profileError=''">
    <small id="display-name-hint" class="profile-hint">Tối đa 80 ký tự. Để trống để dùng tên mặc định.</small>
    <p v-if="profileError" id="display-name-error" class="form-error" role="alert">{{profileError}}</p>
    <div class="modal-actions"><button type="button" class="btn" :disabled="busy" @click="modal=null">Hủy</button><button type="submit" class="btn primary" :disabled="busy"><Check :size="17"/>{{busy?'Đang lưu…':'Lưu tên'}}</button></div>
   </form>
   <form v-else-if="modal==='cycle'" class="settings-dialog" @submit.prevent="saveCycle">
    <p class="dialog-copy">Bắt đầu tháng tài chính vào ngày nhận lương, hoặc bất kỳ ngày nào phù hợp với bạn.</p>
    <label for="cycle">Ngày bắt đầu hằng tháng</label>
    <select id="cycle" v-model.number="cycleDay" :disabled="busy"><option v-for="n in 31" :key="n" :value="n">Ngày {{n}}</option></select>
    <div class="preview-cycle">Ví dụ: {{shortDate(cycleFor(anchor,cycleDay).start)}} – {{shortDate(cycleFor(anchor,cycleDay).end)}}<small>Tháng thiếu ngày 29–31 sẽ lấy ngày cuối tháng.</small></div>
    <p v-if="formError" class="form-error" role="alert">{{formError}}</p>
    <div class="modal-actions"><button type="button" class="btn" :disabled="busy" @click="modal=null">Hủy</button><button type="submit" class="btn primary" :disabled="busy"><Check :size="17"/>{{busy?'Đang lưu…':'Lưu chu kỳ'}}</button></div>
   </form>
   <div v-else-if="modal==='backup'" class="settings-dialog">
    <p class="dialog-copy">Tải bản sao lưu JSON gồm giao dịch, mẫu ghi nhanh, nhắc nhở, danh mục, tag, tên cá nhân và chu kỳ. Bạn có thể dùng file này để khôi phục sổ sau.</p>
    <div class="data-stats"><span><strong>{{data.transactions.length}}</strong> giao dịch</span><span><strong>{{data.quickTemplates.length}}</strong> mẫu ghi nhanh</span><span><strong>{{data.reminders.length}}</strong> nhắc nhở</span><span><strong>{{data.categories.length}}</strong> danh mục</span><span><strong>{{data.tags.length}}</strong> tag</span></div>
    <div class="modal-actions"><button type="button" class="btn" :disabled="busy" @click="modal=null">Đóng</button><button type="button" class="btn primary" :disabled="busy" @click="exportData"><Download :size="17"/>Tải bản sao lưu</button></div>
   </div>
   <div v-else-if="modal==='restore'" class="settings-dialog">
    <p class="dialog-copy">Chọn bản sao lưu JSON để khôi phục sổ. Bạn sẽ được xem thông tin file và xác nhận trước khi thay thế dữ liệu hiện tại.</p>
    <small class="muted">Chấp nhận file JSON, tối đa 10 MB.</small>
    <p v-if="formError" class="form-error" role="alert">{{formError}}</p>
    <div class="modal-actions"><button type="button" class="btn" :disabled="busy" @click="modal=null">Hủy</button><button type="button" class="btn primary" :disabled="busy" @click="fileInput.click()"><Upload :size="17"/>Chọn file JSON</button></div>
   </div>
   <form v-else-if="['transaction','template','category','tag'].includes(modal)" @submit.prevent="saveForm">
    <fieldset class="entry-fields" :disabled="busy">
    <template v-if="modal==='transaction'||modal==='template'">
     <template v-if="modal==='template'"><p class="dialog-copy">Lưu sẵn thông tin cho khoản thường dùng. Tạo mẫu chưa ghi thêm giao dịch vào sổ.</p><label for="template-name">Tên mẫu</label><input id="template-name" v-model="form.name" maxlength="80" required placeholder="Ví dụ: Cà phê buổi sáng"></template>
     <p v-if="modal==='transaction'&&transactionMode==='copy'" class="entry-context"><Copy :size="16" aria-hidden="true"/>Bản sao dùng ngày hôm nay. Kiểm tra thông tin rồi lưu để thêm giao dịch mới.</p>
     <p v-if="modal==='transaction'&&transactionMode==='quick'" class="entry-context"><Zap :size="16" aria-hidden="true"/>Từ mẫu “{{templateSourceName}}”, ngày hôm nay. Bạn có thể chỉnh sửa trước khi lưu.</p>
     <div class="type-switch"><button type="button" :class="{selected:form.type==='expense'}" @click="setType('expense')"><ArrowUpRight :size="18"/>Khoản chi</button><button type="button" :class="{selected:form.type==='income'}" @click="setType('income')"><ArrowDownLeft :size="18"/>Khoản thu</button></div>
     <label for="amount">Số tiền <span>(VND)</span></label><input id="amount" :value="formattedAmount" class="amount-input" type="text" inputmode="numeric" autocomplete="off" @input="updateAmount" :aria-describedby="amountWords?'amount-words':undefined" placeholder="0" required autofocus>
     <p v-if="amountWords" id="amount-words" class="amount-words" aria-live="polite">{{amountWords}}</p>
     <div class="form-columns transaction-fields" :class="{'template-fields':modal==='template'}"><div v-if="modal==='transaction'"><label for="date">Ngày giao dịch</label><input id="date" v-model="form.date" type="date" min="1900-01-01" max="9999-12-31" required></div><div><label for="category">Danh mục</label><select id="category" v-model="form.categoryId" required><option v-for="c in data.categories.filter(x=>x.type===form.type)" :key="c.id" :value="c.id">{{c.name}}</option></select></div></div>
     <label for="note">Ghi chú <span>· không bắt buộc</span></label><textarea id="note" v-model="form.note" maxlength="500" rows="2" placeholder="Khoản này dành cho điều gì?"></textarea><label>Gắn tag <span>· có thể chọn nhiều</span></label><div class="tag-picker"><label v-for="t in data.tags" :key="t.id" :class="{checked:form.tagIds.includes(t.id)}"><input v-model="form.tagIds" type="checkbox" :value="t.id"><Tag :size="13"/>{{t.name}}</label><small v-if="!data.tags.length" class="muted">Tạo tag trong mục Danh mục & tag.</small></div>
    </template>
    <template v-else><label for="name">Tên {{modal==='tag'?'tag':'danh mục'}}</label><input id="name" v-model="form.name" maxlength="80" required autofocus placeholder="Ví dụ: Sức khỏe"><template v-if="modal==='category'"><label for="categoryType">Loại</label><select id="categoryType" v-model="form.type" :disabled="categoryInUse(form.id)"><option value="expense">Chi tiêu</option><option value="income">Thu nhập</option></select><small v-if="categoryInUse(form.id)" class="muted">Danh mục đang được dùng trong giao dịch hoặc mẫu ghi nhanh nên không thể đổi loại.</small><div class="category-color-control"><label for="color">Màu sắc</label><input id="color" v-model="form.color" type="color"></div>
     <fieldset class="icon-fieldset" :disabled="busy" :style="{'--category-color':form.color}">
      <legend>Biểu tượng</legend>
      <div class="icon-picker">
       <label v-for="(icon,name) in icons" :key="name" :class="['icon-choice',{selected:form.icon===name}]">
        <input v-model="form.icon" type="radio" name="category-icon" :value="name">
        <component :is="icon" :size="24" class="icon-glyph" aria-hidden="true"/>
        <span class="icon-choice-name">{{iconLabels[name]}}</span>
        <Check v-if="form.icon===name" :size="13" class="icon-choice-check" aria-hidden="true"/>
       </label>
      </div>
     </fieldset></template></template>
    </fieldset>
    <div v-if="modal==='transaction'" class="entry-tools"><button v-if="editingTransaction" type="button" class="text-btn" :disabled="busy" @click="copyTransaction(form)"><Copy :size="16"/>Sao chép giao dịch</button><button type="button" class="text-btn" :disabled="busy" @click="templateFromTransaction"><Zap :size="16"/>Tạo mẫu từ nội dung này</button></div>
    <p v-if="formError" class="form-error" role="alert">{{formError}}</p><div class="modal-actions"><button v-if="editingTransaction||editingTemplate" type="button" class="btn danger" :disabled="busy" @click="open('delete',{kind:editingTemplate?'quickTemplates':'transactions',id:form.id,name:editingTemplate?'mẫu '+form.name:'giao dịch này'})"><Trash2 :size="17"/>Xóa</button><button type="button" class="btn" :disabled="busy" @click="modal=null">Hủy</button><button type="submit" class="btn primary" :disabled="busy">{{busy?'Đang lưu…':'Lưu '+(modal==='transaction'?'giao dịch':modal==='template'?'mẫu':modal==='tag'?'tag':'danh mục')}}</button></div>
   </form>
   <template v-else-if="modal==='reset'"><p class="dialog-copy">Bạn sắp xóa <strong>toàn bộ {{data.transactions.length}} giao dịch, {{data.quickTemplates.length}} mẫu ghi nhanh, {{data.reminders.length}} nhắc nhở, danh mục, tag, tên cá nhân và chu kỳ đã lưu</strong>{{repository.raw?' của sổ thu chi trên trình duyệt này':' của sổ thu chi trên máy chủ'}}. Hành động này không thể hoàn tác nếu bạn chưa có bản sao lưu.</p><p class="dialog-copy">Sổ sẽ trở về trạng thái ban đầu với danh mục và tag mặc định, không có giao dịch hay nhắc nhở. {{repository.raw?'Dữ liệu đã lưu của sổ sẽ được xóa khỏi bộ nhớ trình duyệt.':'Dữ liệu máy chủ sẽ được thay thế bằng sổ mặc định.'}}</p><button class="btn" :disabled="busy" @click="exportData"><Download :size="17"/>Sao lưu trước khi xóa</button><p v-if="formError" class="form-error" role="alert">{{formError}}</p><div class="modal-actions"><button class="btn" :disabled="busy" @click="modal=null">Hủy</button><button class="btn danger" :disabled="busy" @click="resetData">{{busy?'Đang xóa…':'Xóa toàn bộ dữ liệu'}}</button></div></template><template v-else-if="modal==='delete'"><p class="dialog-copy">{{form.kind==='tags'?'Tag sẽ được gỡ khỏi các giao dịch và mẫu ghi nhanh có gắn tag này.':'Bạn muốn xóa mục này khỏi sổ thu chi?'}}</p><p v-if="formError" class="form-error" role="alert">{{formError}}</p><div class="modal-actions"><button class="btn" :disabled="busy" @click="modal=null">Hủy</button><button class="btn danger" :disabled="busy" @click="deleteItem">Xác nhận xóa</button></div></template>
   <template v-else-if="modal==='import'"><p class="dialog-copy">File <strong>{{form.name}}</strong> có {{form.parsed.transactions.length}} giao dịch và {{form.parsed.quickTemplates.length}} mẫu ghi nhanh và {{form.parsed.reminders.length}} nhắc nhở. Khôi phục sẽ thay thế toàn bộ dữ liệu hiện tại. Bạn nên xuất bản sao lưu trước.</p><button class="btn" @click="exportData"><Download :size="17"/>Sao lưu dữ liệu hiện tại</button><p v-if="formError" class="form-error" role="alert">{{formError}}</p><div class="modal-actions"><button class="btn" :disabled="busy" @click="modal=null">Hủy</button><button class="btn primary" :disabled="busy" @click="confirmImport">Thay thế và khôi phục</button></div></template>
   <template v-else><p class="dialog-copy">Thêm 8 giao dịch minh họa vào chu kỳ đang xem để trải nghiệm dashboard. Bạn có thể sửa hoặc xóa từng giao dịch sau đó.</p><div class="modal-actions"><button class="btn" @click="modal=null">Hủy</button><button class="btn primary" :disabled="busy" @click="demo">Thêm dữ liệu mẫu</button></div></template>
  </section></div>
 </div>
</template>



