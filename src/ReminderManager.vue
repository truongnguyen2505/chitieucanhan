<script setup>
import { computed, nextTick, ref } from 'vue';
import { Bell, BellOff, Pencil, Plus, Trash2, Check } from 'lucide-vue-next';
import { dateKey, uid } from './domain.js';
import { reminderTypes, weekdays, ordinals, isValidReminder, nextReminderOccurrence, describeReminder, reminderDateLabel } from './reminders.js';
const props=defineProps({reminders:{type:Array,required:true},now:{type:Date,required:true},save:{type:Function,required:true},disabled:Boolean,error:String});
const draft=ref(null),titleInput=ref(null),localError=ref(''),saving=ref(false),pendingDelete=ref(null);
const locked=computed(()=>props.disabled||saving.value);
const editing=computed(()=>draft.value&&props.reminders.some(item=>item.id===draft.value.id));
const preview=computed(()=>draft.value?nextReminderOccurrence(draft.value,props.now):null);
async function edit(item) {
 if(locked.value)return;
 localError.value='';pendingDelete.value=null;
 draft.value=item?{...item}:{id:uid(),title:'',type:'monthly-weekday',time:'08:00',date:dateKey(props.now),weekday:1,ordinal:1,monthDay:1,enabled:true,completedOccurrence:null};
 await nextTick();titleInput.value?.focus();
}
async function persist(reminders) {
 if(locked.value)return false;
 localError.value='';saving.value=true;
 try{return await props.save(reminders);}
 catch(error){localError.value=error.message||'Chưa lưu được nhắc nhở.';return false;}
 finally{saving.value=false;}
}
async function saveDraft() {
 const item={...draft.value,title:draft.value.title.trim()};
 localError.value='';
 if(!isValidReminder(item)){localError.value='Nhập nội dung và chọn lịch, giờ nhắc hợp lệ.';return;}
 if(item.type==='once'&&item.enabled&&new Date(item.date+'T'+item.time+':00')<props.now){localError.value='Chọn thời điểm nhắc trong tương lai.';return;}
 const next=props.reminders.some(value=>value.id===item.id)?props.reminders.map(value=>value.id===item.id?item:{...value}):[...props.reminders,item];
 if(await persist(next))draft.value=null;
}
async function toggle(item) {
 await persist(props.reminders.map(value=>value.id===item.id?{...value,enabled:!value.enabled}:{...value}));
}
async function remove(item) {
 if(await persist(props.reminders.filter(value=>value.id!==item.id))){
  pendingDelete.value=null;
  if(draft.value?.id===item.id)draft.value=null;
 }
}
function nextLabel(item) {
 if(!item.enabled)return 'Đã tạm dừng';
 const next=nextReminderOccurrence(item,props.now);
 return next?'Lần tới: '+reminderDateLabel(next):'Đã hoàn thành hoặc đã qua thời điểm nhắc';
}
</script>

<template>
 <div class="reminder-manager">
  <p class="dialog-copy">Trang chính hiển thị cảnh báo đỏ trong 24 giờ trước giờ nhắc. Lịch và giờ nhắc dùng giờ trên thiết bị của bạn.</p>
  <ul v-if="reminders.length" class="reminder-list">
   <li v-for="item in reminders" :key="item.id" class="reminder-row" :class="{paused:!item.enabled}">
    <div class="reminder-row-copy"><strong>{{item.title}}</strong><p>{{describeReminder(item)}}</p><small>{{nextLabel(item)}}</small></div>
    <div class="reminder-row-actions">
     <button type="button" class="icon-btn" :disabled="locked" :aria-pressed="item.enabled" :aria-label="(item.enabled?'Tạm dừng: ':'Bật lại: ')+item.title" :title="item.enabled?'Tạm dừng':'Bật lại'" @click="toggle(item)"><component :is="item.enabled?Bell:BellOff" :size="18" aria-hidden="true"/></button>
     <button type="button" class="icon-btn" :disabled="locked" :aria-label="'Sửa nhắc nhở: '+item.title" @click="edit(item)"><Pencil :size="17" aria-hidden="true"/></button>
     <button type="button" class="icon-btn" :disabled="locked" :aria-label="'Xóa nhắc nhở: '+item.title" @click="pendingDelete=item.id"><Trash2 :size="17" aria-hidden="true"/></button>
    </div>
    <div v-if="pendingDelete===item.id" class="reminder-delete"><span>Xóa nhắc nhở này?</span><button type="button" class="btn" :disabled="locked" @click="pendingDelete=null">Hủy</button><button type="button" class="btn danger" :disabled="locked" @click="remove(item)">Xóa</button></div>
   </li>
  </ul>
  <p v-else-if="!draft" class="reminder-empty">Chưa có nhắc nhở. Bạn có thể đặt lịch mặc đồng phục, đóng tiền hoặc công việc cần nhớ.</p>
  <button v-if="!draft" type="button" class="btn primary wide" :disabled="locked" @click="edit()"><Plus :size="17" aria-hidden="true"/>Thêm nhắc nhở</button>
  <form v-if="draft" class="reminder-form" @submit.prevent="saveDraft">
   <h3>{{editing?'Sửa nhắc nhở':'Nhắc nhở mới'}}</h3>
   <fieldset class="entry-fields" :disabled="locked">
    <label for="reminder-title">Nội dung nhắc nhở</label><input id="reminder-title" ref="titleInput" v-model="draft.title" maxlength="160" required placeholder="Ví dụ: Mặc đồng phục công ty">
    <label for="reminder-type">Lặp lại</label><select id="reminder-type" v-model="draft.type"><option v-for="type in reminderTypes" :key="type.value" :value="type.value">{{type.label}}</option></select>
    <template v-if="draft.type==='once'"><label for="reminder-date">Ngày nhắc</label><input id="reminder-date" v-model="draft.date" type="date" :min="dateKey(now)" max="9999-12-31" required></template>
    <div v-if="draft.type==='monthly-weekday'" class="form-columns">
     <div><label for="reminder-ordinal">Lần trong tháng</label><select id="reminder-ordinal" v-model.number="draft.ordinal"><option v-for="item in ordinals" :key="item.value" :value="item.value">{{item.label}}</option></select></div>
     <div><label for="reminder-weekday">Thứ</label><select id="reminder-weekday" v-model.number="draft.weekday"><option v-for="day in weekdays" :key="day.value" :value="day.value">{{day.label}}</option></select></div>
    </div>
    <template v-if="draft.type==='weekly'"><label for="reminder-weekly-day">Thứ trong tuần</label><select id="reminder-weekly-day" v-model.number="draft.weekday"><option v-for="day in weekdays" :key="day.value" :value="day.value">{{day.label}}</option></select></template>
    <template v-if="draft.type==='monthly-date'"><label for="reminder-month-day">Ngày trong tháng</label><select id="reminder-month-day" v-model.number="draft.monthDay"><option v-for="day in 31" :key="day" :value="day">Ngày {{day}}</option></select><p class="reminder-hint">Tháng thiếu ngày đã chọn sẽ nhắc vào ngày cuối tháng.</p></template>
    <p v-if="draft.type==='monthly-weekday'&&draft.ordinal===5" class="reminder-hint">Tháng không có lần thứ năm của thứ đã chọn sẽ được bỏ qua.</p>
    <label for="reminder-time">Giờ nhắc</label><input id="reminder-time" v-model="draft.time" type="time" step="60" required>
    <label class="reminder-enabled" for="reminder-enabled"><input id="reminder-enabled" v-model="draft.enabled" type="checkbox">Bật nhắc nhở</label>
    <div class="reminder-preview"><strong>{{describeReminder(draft)}}</strong><p>{{preview?'Lần tới: '+reminderDateLabel(preview):draft.enabled?'Chọn lịch nhắc hợp lệ trong tương lai.':'Nhắc nhở đang tạm dừng.'}}</p></div>
    <div class="modal-actions"><button type="button" class="btn" @click="draft=null;localError=''">Hủy</button><button type="submit" class="btn primary"><Check :size="17" aria-hidden="true"/>{{locked?'Đang lưu…':'Lưu nhắc nhở'}}</button></div>
   </fieldset>
  </form>
  <p v-if="localError||error" class="form-error" role="alert">{{localError||error}}</p>
 </div>
</template>
