<script setup>
import { Plus, Pencil, Zap, Shapes } from 'lucide-vue-next';
import { money } from './domain.js';

defineProps({
 templates:{type:Array,required:true},
 categories:{type:Array,required:true},
 icons:{type:Object,required:true},
 disabled:Boolean
});
defineEmits(['use','create','edit']);
</script>

<template>
 <section class="panel quick-entry" aria-labelledby="quick-entry-title">
  <div class="panel-heading">
   <div><h3 id="quick-entry-title"><Zap :size="17" aria-hidden="true"/>Ghi nhanh <span v-if="templates.length" class="count-pill">{{templates.length}}</span></h3><p>{{templates.length?'Chọn mẫu, kiểm tra rồi lưu giao dịch.':'Lưu khoản thường dùng thành mẫu để nhập nhanh lần sau.'}}</p></div>
   <button type="button" class="btn" :disabled="disabled" @click="$emit('create')"><Plus :size="17"/>Tạo mẫu</button>
  </div>
  <ul v-if="templates.length" class="quick-template-list" aria-label="Mẫu ghi nhanh">
   <li v-for="t in templates" :key="t.id" class="quick-template">
    <button type="button" class="quick-template-use" :disabled="disabled" :aria-label="'Ghi nhanh: '+t.name+', '+money(t.amount)" @click="$emit('use',t)">
     <span class="category-icon" :style="{background:categories.find(c=>c.id===t.categoryId)?.color+'22',color:categories.find(c=>c.id===t.categoryId)?.color}"><component :is="icons[categories.find(c=>c.id===t.categoryId)?.icon]||Shapes" :size="18" aria-hidden="true"/></span>
     <span class="quick-template-copy"><strong>{{t.name}}</strong><small>{{categories.find(c=>c.id===t.categoryId)?.name}}</small><span :class="t.type==='income'?'income-text':'expense-text'">{{t.type==='income'?'+':'−'}}{{money(t.amount)}}</span></span>
    </button>
    <button type="button" class="icon-btn quick-template-edit" :disabled="disabled" :aria-label="'Sửa mẫu '+t.name" @click="$emit('edit',t)"><Pencil :size="15" aria-hidden="true"/></button>
   </li>
  </ul>
 </section>
</template>
