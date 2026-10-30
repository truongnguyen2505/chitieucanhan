<script setup>
import { computed } from 'vue';
import { TriangleAlert, Check } from 'lucide-vue-next';
import { upcomingReminders, reminderDateLabel } from './reminders.js';
const props=defineProps({reminders:{type:Array,required:true},now:{type:Date,required:true},disabled:Boolean});
defineEmits(['complete','manage']);
const upcoming=computed(()=>upcomingReminders(props.reminders,props.now));
</script>

<template>
 <section v-if="upcoming.length" class="reminder-alerts" aria-labelledby="reminder-alert-title" aria-live="polite">
  <div class="reminder-alert-heading"><h3 id="reminder-alert-title"><TriangleAlert :size="20" aria-hidden="true"/>Nhắc nhở trong 24 giờ tới</h3><button type="button" class="text-btn" :disabled="disabled" aria-haspopup="dialog" @click="$emit('manage')">Quản lý nhắc nhở</button></div>
  <article v-for="item in upcoming" :key="item.id+item.occurrence" class="reminder-alert">
   <div><strong>{{item.title}}</strong><p>{{reminderDateLabel(item.dueAt)}}</p></div>
   <button type="button" class="btn" :disabled="disabled" :aria-label="'Đã xong lần này: '+item.title" @click="$emit('complete',{id:item.id,occurrence:item.occurrence})"><Check :size="16" aria-hidden="true"/>Đã xong lần này</button>
  </article>
 </section>
</template>
