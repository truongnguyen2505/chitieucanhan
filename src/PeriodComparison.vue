<script setup>
import { computed, ref } from 'vue';
import { ArrowDown, ArrowUp, ChevronRight, Minus, GitCompareArrows } from 'lucide-vue-next';
import { comparePeriods } from './comparison.js';
import { dateKey, money } from './domain.js';

const props=defineProps({ledger:{type:Object,required:true},anchor:{type:String,required:true},offset:{type:Number,default:0}});
const mode=ref('full'),categoryType=ref('expense');
const comparison=computed(()=>comparePeriods(props.ledger,props.anchor,props.offset,{mode:mode.value,today:dateKey()}));
const metrics=[{id:'income',label:'Thu nhập'},{id:'expense',label:'Chi tiêu'},{id:'balance',label:'Số dư trong kỳ'}];
const empty=computed(()=>!comparison.value.current.count&&!comparison.value.previous.count);
const categories=computed(()=>comparison.value.categories.filter(c=>c.type===categoryType.value));
const maxCategory=computed(()=>Math.max(1,...categories.value.flatMap(c=>[c.current,c.previous])));
const expenseChanges=computed(()=>comparison.value.categories.filter(c=>c.type==='expense'));
const largestIncrease=computed(()=>expenseChanges.value.filter(c=>c.delta>0).sort((a,b)=>b.delta-a.delta)[0]);
const largestDecrease=computed(()=>expenseChanges.value.filter(c=>c.delta<0).sort((a,b)=>a.delta-b.delta)[0]);
const dateLabel = date => date.split('-').reverse().join('/');
const rangeLabel = period => dateLabel(period.start)+' – '+dateLabel(period.end);
const direction = delta => delta>0?ArrowUp:delta<0?ArrowDown:Minus;
const tone = (delta,type) => !delta?'unchanged':(type==='expense'?delta<0:delta>0)?'favorable':'unfavorable';
function changeLabel(value) {
 if(!value.delta)return 'Không đổi';
 const prefix=value.delta>0?'Tăng ':'Giảm ';
 const amount=money(Math.abs(value.delta));
 if(value.percent===null)return prefix+amount;
 const percent=Math.abs(value.percent);
 const formatted=percent<0.1?'<0,1':new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(percent);
 return prefix+amount+' ('+formatted+'%)';
}
</script>

<template>
 <section class="panel period-comparison" aria-labelledby="comparison-title">
  <div class="panel-heading comparison-heading">
   <div><h3 id="comparison-title"><GitCompareArrows :size="18" aria-hidden="true"/>So sánh giữa các kỳ</h3><p>Đối chiếu kỳ đang xem với kỳ liền trước.</p></div>
   <div class="comparison-modes" role="group" aria-label="Cách so sánh kỳ">
    <button type="button" :aria-pressed="comparison.mode==='full'" @click="mode='full'">Cả kỳ</button>
    <button type="button" :aria-pressed="comparison.mode==='matched'" :disabled="!comparison.canMatch" :title="comparison.canMatch?'So cùng số ngày đầu của hai kỳ':'Chưa thể so cùng số ngày cho kỳ chưa bắt đầu'" @click="mode='matched'">Cùng số ngày</button>
   </div>
  </div>
  <div class="comparison-ranges"><p><span class="comparison-key previous-key"></span><strong>Kỳ trước</strong><span>{{rangeLabel(comparison.previous)}}</span></p><p><span class="comparison-key current-key"></span><strong>Kỳ đang xem</strong><span>{{rangeLabel(comparison.current)}}</span></p></div>
  <p v-if="comparison.mode==='matched'" class="comparison-note">So sánh {{comparison.matchedDays}} ngày đầu mỗi kỳ{{comparison.isCurrent?' tính đến tối đa hôm nay':''}}. Khoảng ngày thực tế được hiển thị ở trên.</p>
  <p v-else-if="comparison.isCurrent" class="comparison-note">Kỳ đang xem chưa kết thúc. Chọn “Cùng số ngày” để đối chiếu cùng số ngày đầu mỗi kỳ.</p>
  <p v-else-if="comparison.current.days!==comparison.previous.days" class="comparison-note">Hai kỳ có {{comparison.current.days}} và {{comparison.previous.days}} ngày. Có thể chọn “Cùng số ngày” để đối chiếu.</p>
  <div v-if="empty" class="comparison-empty"><GitCompareArrows :size="28" aria-hidden="true"/><strong>Chưa có dữ liệu để so sánh</strong><p>Chưa có giao dịch trong hai khoảng ngày đang xem.</p></div>
  <template v-else>
   <p v-if="!comparison.previous.count" class="comparison-note">Kỳ trước chưa có giao dịch. Hiển thị chênh lệch tiền; chưa tính tỷ lệ phần trăm.</p>
   <p v-else-if="!comparison.current.count" class="comparison-note">Kỳ đang xem chưa có giao dịch trong khoảng ngày này.</p>
   <div class="comparison-metrics">
    <article v-for="metric in metrics" :key="metric.id" class="comparison-metric" :aria-label="metric.label">
     <h4>{{metric.label}}</h4><strong>{{money(comparison.metrics[metric.id].current)}}</strong><small>Kỳ trước: {{money(comparison.metrics[metric.id].previous)}}</small>
     <p class="comparison-change" :class="tone(comparison.metrics[metric.id].delta,metric.id)"><component :is="direction(comparison.metrics[metric.id].delta)" :size="14" aria-hidden="true"/>{{changeLabel(comparison.metrics[metric.id])}}</p>
    </article>
   </div>
   <div v-if="largestIncrease||largestDecrease" class="comparison-insights">
    <p v-if="largestIncrease"><ArrowUp :size="15" aria-hidden="true"/><span>Chi tăng nhiều nhất: <strong>{{largestIncrease.name}}</strong> · {{money(largestIncrease.delta)}}</span></p>
    <p v-if="largestDecrease"><ArrowDown :size="15" aria-hidden="true"/><span>Chi giảm nhiều nhất: <strong>{{largestDecrease.name}}</strong> · {{money(-largestDecrease.delta)}}</span></p>
   </div>
   <details class="comparison-details">
    <summary><ChevronRight :size="17" aria-hidden="true"/>So sánh theo danh mục</summary>
    <div class="comparison-detail-toolbar"><label for="comparison-category-type">Loại danh mục</label><select id="comparison-category-type" v-model="categoryType"><option value="expense">Chi tiêu</option><option value="income">Thu nhập</option></select></div>
    <ul v-if="categories.length" class="comparison-category-list">
     <li v-for="c in categories" :key="c.id" class="comparison-category">
      <div class="comparison-category-heading"><strong><span class="color-dot" :style="{background:c.color}"></span>{{c.name}}</strong><span class="comparison-change" :class="tone(c.delta,c.type)">{{changeLabel(c)}}</span></div>
      <div class="comparison-category-values"><span>Kỳ trước <strong>{{money(c.previous)}}</strong></span><span>Kỳ đang xem <strong>{{money(c.current)}}</strong></span></div>
      <div class="comparison-category-bars" aria-hidden="true"><span class="previous-bar" :style="{width:(c.previous/maxCategory*100)+'%'}"></span><span class="current-bar" :style="{width:(c.current/maxCategory*100)+'%'}"></span></div>
     </li>
    </ul>
    <p v-else class="comparison-category-empty">Chưa có khoản {{categoryType==='expense'?'chi':'thu'}} trong hai khoảng ngày này.</p>
   </details>
  </template>
 </section>
</template>
