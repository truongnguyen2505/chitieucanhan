import { freshData, validateData } from './domain.js';
const KEY = 'la.personal-ledger.v1';
export class LocalRepository {
  async load() {
    const saved = localStorage.getItem(KEY);
    if (!saved) return freshData();
    try { return validateData(JSON.parse(saved)); }
    catch { throw new Error('Dữ liệu đã lưu không đọc được. Hãy xuất bản sao dữ liệu gốc để kiểm tra; ứng dụng chưa ghi đè dữ liệu này.'); }
  }
  async save(data) {
    const valid = validateData(data);
    try { localStorage.setItem(KEY, JSON.stringify(valid)); }
    catch { throw new Error('Không lưu được trên trình duyệt. Hãy kiểm tra dung lượng hoặc quyền lưu dữ liệu.'); }
  }
  async reset() {
    try { localStorage.removeItem(KEY); }
    catch { throw new Error('Không xóa được dữ liệu. Hãy kiểm tra quyền lưu trữ của trình duyệt và thử lại.'); }
  }
  raw() { return localStorage.getItem(KEY); }
}
// Same repository interface; the UI never needs to call fetch directly.
export class RestRepository {
  constructor(baseUrl) { this.url = `${baseUrl.replace(/\/$/,'')}/v1/ledger`; }
  async reset() { await this.save(freshData()); }
  async load() {
    const response = await fetch(this.url, {credentials:'include'});
    if (!response.ok) throw new Error(`Không tải được dữ liệu (${response.status}).`);
    this.etag = response.headers.get('ETag');
    return validateData(await response.json());
  }
  async save(data) {
    const response = await fetch(this.url, {method:'PUT',credentials:'include',headers:{'Content-Type':'application/json',...(this.etag?{'If-Match':this.etag}:{})},body:JSON.stringify(validateData(data))});
    if (!response.ok) throw new Error(response.status===412?'Dữ liệu đã thay đổi trên thiết bị khác. Hãy tải lại trang trước khi sửa.':`Không lưu được dữ liệu (${response.status}).`);
    this.etag = response.headers.get('ETag');
  }
}
export const repository = import.meta.env?.VITE_STORAGE_DRIVER === 'rest' ? new RestRepository(import.meta.env.VITE_API_BASE_URL || '/api') : new LocalRepository();
