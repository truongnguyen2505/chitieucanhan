<script setup>
import { Copy, Pencil, Shapes } from 'lucide-vue-next';
import { money } from './domain.js';

defineProps({
 transaction:{type:Object,required:true},
 category:Object,
 tags:{type:Array,required:true},
 icons:{type:Object,required:true},
 dateLabel:String,
 disabled:Boolean
});
defineEmits(['edit','copy']);
</script>

<template>
 <div class="transaction-item">
  <button type="button" class="transaction-row" :disabled="disabled" :aria-label="'Sửa giao dịch: '+(transaction.note||category?.name)+', '+money(transaction.amount)" @click="$emit('edit',transaction)">
   <span class="category-icon" :style="{background:category?.color+'22',color:category?.color}"><component :is="icons[category?.icon]||Shapes" :size="20" aria-hidden="true"/></span>
   <span class="transaction-info"><strong>{{transaction.note||category?.name}}</strong><small>{{category?.name}} <span v-for="id in transaction.tagIds" :key="id" class="tag-chip">{{tags.find(t=>t.id===id)?.name}}</span></small></span>
   <span v-if="dateLabel" class="row-date">{{dateLabel}}</span>
   <strong :class="transaction.type==='income'?'income-text':'amount'">{{transaction.type==='income'?'+':'−'}}{{money(transaction.amount)}}</strong>
   <Pencil :size="15" class="row-arrow" aria-hidden="true"/>
  </button>
  <button type="button" class="icon-btn transaction-copy" :disabled="disabled" :aria-label="'Sao chép giao dịch: '+(transaction.note||category?.name)" title="Sao chép giao dịch" @click="$emit('copy',transaction)"><Copy :size="17" aria-hidden="true"/></button>
 </div>
</template>
