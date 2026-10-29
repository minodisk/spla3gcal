const API_URL = 'https://spla3.yuu26.com/api/schedule';
const USER_AGENT = 'spla3gcal/1.0 (https://github.com/minodisk/spla3gcal)';
// 予定に付けるタグのキー。値に枠の識別子を入れて、再実行時の重複登録を防ぐ。
const SLOT_TAG = 'spla3gcal.slot';

// 時間主導トリガーから呼ばれる。CALENDARS の全カレンダーに未登録の枠を書き込み、
// 登録済みの枠はタイトルと説明欄が今の形式と違えば書き換える。
function sync() {
  const schedule = fetchSchedule();
  CALENDARS.forEach((entry) => {
    const calendar = CalendarApp.getCalendarById(entry.calendarId);
    if (!calendar) {
      throw new Error(`カレンダーが見つからない: ${entry.name} (${entry.calendarId})`);
    }
    const slots = extractSlots(schedule, entry);
    if (slots.length === 0) {
      return;
    }
    const from = new Date(Math.min(...slots.map((s) => Date.parse(s.start))));
    const to = new Date(Math.max(...slots.map((s) => Date.parse(s.end))));
    const existing = new Map(calendar.getEvents(from, to).map((e) => [e.getTag(SLOT_TAG), e]));
    slots.forEach((slot) => {
      const event = existing.get(slot.key);
      if (!event) {
        calendar
          .createEvent(slot.title, new Date(slot.start), new Date(slot.end), { description: slot.description })
          .setTag(SLOT_TAG, slot.key);
        return;
      }
      if (event.getTitle() !== slot.title) {
        event.setTitle(slot.title);
      }
      if (event.getDescription() !== slot.description) {
        event.setDescription(slot.description);
      }
    });
  });
}

// 一度だけ手動で実行する。sync を 4 時間おきに動かすトリガーを張り直す。
function installTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'sync')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sync').timeBased().everyHours(4).create();
}

// 一度だけ手動で実行する。calendarId が空の行のカレンダーを作って一般公開し、ID をログに出す。
// 同じ名前のカレンダーがあればそれを使うので、ID を書き戻す前に再実行しても増えない。
function createCalendars() {
  CALENDARS.filter((entry) => !entry.calendarId).forEach((entry) => {
    const calendar =
      CalendarApp.getOwnedCalendarsByName(entry.name)[0] ||
      CalendarApp.createCalendar(entry.name, { timeZone: 'Asia/Tokyo' });
    // CalendarApp では公開設定を変えられないので、高度なサービスの Calendar API で ACL を足す
    Calendar.Acl.insert({ role: 'reader', scope: { type: 'default' } }, calendar.getId());
    console.log(`${entry.mode} ${entry.rule}: ${calendar.getId()}`);
  });
}

function fetchSchedule() {
  const res = UrlFetchApp.fetch(API_URL, {
    headers: { 'User-Agent': USER_AGENT },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error(`${API_URL} が ${res.getResponseCode()} を返した: ${res.getContentText().slice(0, 200)}`);
  }
  return JSON.parse(res.getContentText());
}

// フェス開催中は rule が null になるので、ルールの一致で自然に除外される。
function extractSlots(schedule, entry) {
  return (schedule.result[entry.mode] || [])
    .filter((s) => s.rule && s.rule.key === entry.rule)
    .map((s) => {
      const stages = s.stages.map((st) => st.name);
      return {
        key: `${entry.mode}/${entry.rule}/${s.start_time}`,
        start: s.start_time,
        end: s.end_time,
        title: entry.name,
        description: `${stages.map((name) => `・${name}`).join('\n')}\n\nデータ: Spla3 API (https://spla3.yuu26.com)`,
      };
    });
}
