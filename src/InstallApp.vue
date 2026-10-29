<script setup>
import { ref, computed } from 'vue';
import { Check, Download, Share, Smartphone } from 'lucide-vue-next';
import { DEFAULT_APP_NAME, MAX_APP_NAME_LENGTH, normalizeAppName, readAppName, appUrlForName } from './app-name.js';
defineProps({ state: { type: Object, required: true } });
defineEmits(['install', 'close']);
const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
 || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const platform = ref(isAppleMobile ? 'ios' : 'android');
const appIcon = import.meta.env.BASE_URL + 'icons/app-192.png';
const appliedName = readAppName(new URL(window.location.href)) || DEFAULT_APP_NAME;
const appName = ref(appliedName);
const nameError = ref('');
const normalizedName = computed(() => { try { return normalizeAppName(appName.value); } catch { return ''; } });
const nameChanged = computed(() => normalizedName.value !== appliedName);
function applyName() {
 try {
  const name = normalizeAppName(appName.value);
  nameError.value = '';
  if (name !== appliedName) window.location.assign(appUrlForName(name, window.location.href));
 } catch (error) { nameError.value = error.message; }
}
</script>

<template>
 <div class="install-dialog">
  <div class="install-preview">
   <img :src="appIcon" width="64" height="64" alt="Biểu tượng lá màu trắng trên nền xanh" class="install-app-icon">
   <div><strong>{{normalizedName || appliedName}}</strong><p>Chạm vào icon để mở sổ ngay từ màn hình chính.</p></div>
  </div>
  <template v-if="state.isInstalled">
   <p class="install-status" role="status"><Check :size="20" aria-hidden="true"/>Ứng dụng đã được cài đặt hoặc đang mở từ màn hình chính.</p>
   <p class="install-feedback">Tên icon đã cài do điện thoại quản lý. Bạn có thể chọn tên khi thêm icon mới từ trình duyệt.</p>
  </template>
  <template v-else>
   <form class="install-name-form" @submit.prevent="applyName">
    <label for="home-screen-name">Tên dưới icon</label>
    <input id="home-screen-name" v-model="appName" type="text" :maxlength="MAX_APP_NAME_LENGTH * 2" autocomplete="off" enterkeyhint="done" :disabled="state.isInstalling" aria-describedby="home-screen-name-hint" :aria-invalid="!!nameError" @input="nameError=''">
    <small id="home-screen-name-hint">Chọn tên riêng của bạn, tối đa {{MAX_APP_NAME_LENGTH}} ký tự. Tên ngắn sẽ dễ đọc hơn.</small>
    <p v-if="nameError" class="form-error" role="alert">{{nameError}}</p>
    <button type="submit" class="btn" :disabled="state.isInstalling || !nameChanged">Lưu tên trước khi cài</button>
    <p v-if="nameChanged" class="install-name-note">Lưu tên để áp dụng. Trang sẽ tải lại và mở tiếp hướng dẫn này.</p>
    <p v-else class="install-name-note" role="status">Tên khi cài: <strong>{{appliedName}}</strong></p>
   </form>
   <button v-if="state.canInstall || state.isInstalling" type="button" class="btn primary install-native" :disabled="state.isInstalling || nameChanged || !normalizedName" @click="$emit('install')"><Download :size="18" aria-hidden="true"/>{{state.isInstalling ? 'Đang chờ trình duyệt…' : 'Cài đặt ' + appliedName}}</button>
   <p v-if="state.message" class="install-feedback" role="status">{{state.message}}</p>
   <p class="dialog-copy">{{state.canInstall ? 'Bạn cũng có thể thêm thủ công theo hướng dẫn:' : 'Chọn thiết bị để xem cách thêm icon:'}}</p>
   <div class="install-platforms" role="group" aria-label="Chọn loại điện thoại">
    <button type="button" :aria-pressed="platform==='ios'" :class="{selected:platform==='ios'}" @click="platform='ios'">iPhone / iPad</button>
    <button type="button" :aria-pressed="platform==='android'" :class="{selected:platform==='android'}" @click="platform='android'">Android</button>
   </div>
   <ol v-if="platform==='ios'" class="install-steps">
    <li>Mở trang web này bằng <strong>Safari</strong>.</li>
    <li>Chạm nút <strong>Chia sẻ <Share :size="16" aria-hidden="true"/></strong> trên thanh công cụ (hoặc trong menu <strong>…</strong>).</li>
    <li>Chọn <strong>Thêm vào Màn hình chính</strong> (Add to Home Screen). Nếu chưa thấy, hãy kéo xuống hoặc chọn <strong>Sửa tác vụ</strong>.</li>
    <li>Kiểm tra tên <strong>{{appliedName}}</strong>; bạn có thể sửa tên tại đây. Bật <strong>Mở dưới dạng ứng dụng web</strong> nếu có, rồi chạm <strong>Thêm</strong>.</li>
   </ol>
   <ol v-else class="install-steps">
    <li>Mở trang web này bằng <strong>Chrome</strong> trên điện thoại Android.</li>
    <li>Chạm menu <strong>⋮</strong> ở góc trên bên phải.</li>
    <li>Chọn <strong>Thêm vào màn hình chính</strong> hoặc <strong>Cài đặt ứng dụng</strong>.</li>
    <li>Kiểm tra tên <strong>{{appliedName}}</strong>, rồi chạm <strong>Thêm</strong> hoặc <strong>Cài đặt</strong>.</li>
   </ol>
   <p class="install-tip"><Smartphone :size="17" aria-hidden="true"/><span>Nếu đang mở trong Zalo, Facebook hoặc ứng dụng khác, hãy mở trang bằng Safari hoặc Chrome trước.</span></p>
  </template>
  <div class="modal-actions"><button type="button" class="btn" @click="$emit('close')">Đã hiểu</button></div>
 </div>
</template>
