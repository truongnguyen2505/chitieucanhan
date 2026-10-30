const pad = value => String(value).padStart(2, '0');
const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
export const reminderTypes = [
  { value:'once', label:'Một lần' },
  { value:'daily', label:'Hằng ngày' },
  { value:'weekly', label:'Hằng tuần' },
  { value:'monthly-date', label:'Hằng tháng — ngày cố định' },
  { value:'monthly-weekday', label:'Hằng tháng — theo thứ' }
];
export const weekdays = [
  { value:1, label:'Thứ Hai' }, { value:2, label:'Thứ Ba' },
  { value:3, label:'Thứ Tư' }, { value:4, label:'Thứ Năm' },
  { value:5, label:'Thứ Sáu' }, { value:6, label:'Thứ Bảy' }, { value:0, label:'Chủ nhật' }
];
export const ordinals = [
  { value:1, label:'Đầu tiên' }, { value:2, label:'Thứ hai' },
  { value:3, label:'Thứ ba' }, { value:4, label:'Thứ tư' },
  { value:5, label:'Thứ năm' }, { value:-1, label:'Cuối cùng' }
];

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00');
  return !Number.isNaN(date.getTime()) && date.getFullYear() >= 1900 && dateKey(date) === value;
}
function validOccurrence(value) {
  return typeof value === 'string' && value.length === 16 &&
    validDate(value.slice(0,10)) && value[10] === 'T' && timePattern.test(value.slice(11));
}
export function isValidReminder(reminder) {
  if (!reminder || !text(reminder.id,100) || !text(reminder.title,160) ||
      !reminderTypes.some(type => type.value === reminder.type) ||
      typeof reminder.enabled !== 'boolean' || typeof reminder.time !== 'string' ||
      !timePattern.test(reminder.time) ||
      (reminder.completedOccurrence != null && !validOccurrence(reminder.completedOccurrence))) return false;
  if (reminder.type === 'once') return validDate(reminder.date);
  if (reminder.type === 'weekly') return integer(reminder.weekday,0,6);
  if (reminder.type === 'monthly-date') return integer(reminder.monthDay,1,31);
  if (reminder.type === 'monthly-weekday') return integer(reminder.weekday,0,6) &&
    (reminder.ordinal === -1 || integer(reminder.ordinal,1,5));
  return true;
}

function atTime(year, month, day, time) {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month, day, hours, minutes, 0, 0);
}
export function occurrenceKey(date) {
  return dateKey(date) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}
export function nextReminderOccurrence(reminder, from = new Date()) {
  if (!isValidReminder(reminder) || !reminder.enabled || Number.isNaN(from.getTime())) return null;
  const usable = date => date.getFullYear() <= 9999 && date >= from &&
    occurrenceKey(date) !== reminder.completedOccurrence;
  if (reminder.type === 'once') {
    const date = new Date(reminder.date + 'T' + reminder.time + ':00');
    return usable(date) ? date : null;
  }
  if (reminder.type === 'daily' || reminder.type === 'weekly') {
    const weekly = reminder.type === 'weekly';
    const start = weekly ? (reminder.weekday - from.getDay() + 7) % 7 : 0;
    for (let index=0; index<3; index++) {
      const date = atTime(from.getFullYear(),from.getMonth(),from.getDate()+start+index*(weekly?7:1),reminder.time);
      if (usable(date)) return date;
    }
    return null;
  }
  for (let offset=0; offset<25; offset++) {
    const first = new Date(from.getFullYear(),from.getMonth()+offset,1,12);
    const year = first.getFullYear(), month = first.getMonth();
    if (year > 9999) return null;
    const last = new Date(year,month+1,0,12);
    let day;
    if (reminder.type === 'monthly-date') day = Math.min(reminder.monthDay,last.getDate());
    else if (reminder.ordinal === -1) day = last.getDate()-(last.getDay()-reminder.weekday+7)%7;
    else {
      day = 1+(reminder.weekday-first.getDay()+7)%7+(reminder.ordinal-1)*7;
      if (day > last.getDate()) continue;
    }
    const date = atTime(year,month,day,reminder.time);
    if (usable(date)) return date;
  }
  return null;
}
export function upcomingReminders(reminders, now = new Date()) {
  const end = now.getTime()+24*60*60*1000;
  return reminders.flatMap(reminder => {
    const dueAt = nextReminderOccurrence(reminder,now);
    return dueAt && dueAt.getTime() <= end
      ? [{ ...reminder, dueAt, occurrence:occurrenceKey(dueAt) }] : [];
  }).sort((a,b) => a.dueAt-b.dueAt || a.title.localeCompare(b.title,'vi'));
}
export function describeReminder(reminder) {
  const weekday = weekdays.find(day => day.value === reminder.weekday)?.label || '';
  let schedule;
  if (reminder.type === 'once') schedule = (reminder.date || '').split('-').reverse().join('/');
  else if (reminder.type === 'daily') schedule = 'Hằng ngày';
  else if (reminder.type === 'weekly') schedule = weekday + ' hằng tuần';
  else if (reminder.type === 'monthly-date') schedule = 'Ngày ' + reminder.monthDay + ' hằng tháng';
  else schedule = weekday + ' ' + (ordinals.find(item => item.value === reminder.ordinal)?.label.toLocaleLowerCase('vi') || '') + ' hằng tháng';
  return schedule + ', lúc ' + reminder.time;
}
export function reminderDateLabel(date) {
  return new Intl.DateTimeFormat('vi-VN',{
    weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false
  }).format(date);
}
