const API_URL = 'https://spla3.yuu26.com/api/schedule';
const COOP_API_URL = 'https://spla3.yuu26.com/api/coop-grouping/schedule';
const USER_AGENT = 'spla3gcal/1.0 (https://github.com/minodisk/spla3gcal)';
// Event tag key. Its value holds the slot key so reruns never create duplicates.
const SLOT_TAG = 'spla3gcal.slot';

// Called by the time-driven trigger. Writes unregistered slots to every calendar in CALENDARS,
// and rewrites the title and description of registered slots that differ from the current format.
// Each API is fetched at most once, and only if some row uses it. Rows with an empty calendarId
// (before createCalendars) are skipped.
function sync() {
  const responses = {};
  CALENDARS.filter((entry) => entry.calendarId).forEach((entry) => {
    const source = sourceOf(entry);
    responses[source.url] = responses[source.url] || fetchJson(source.url);
    const calendar = CalendarApp.getCalendarById(entry.calendarId);
    if (!calendar) {
      throw new Error(`カレンダーが見つからない: ${entry.name} (${entry.calendarId})`);
    }
    const slots = source.extract(responses[source.url], entry);
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

// Run once by hand. Recreates the trigger that runs sync every 4 hours.
function installTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'sync')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sync').timeBased().everyHours(4).create();
}

// Run once by hand. Creates and publishes a calendar for each row with an empty calendarId and logs its ID.
// Reuses an existing calendar with the same name, so rerunning before writing the IDs back creates no extras.
function createCalendars() {
  CALENDARS.filter((entry) => !entry.calendarId).forEach((entry) => {
    const calendar =
      CalendarApp.getOwnedCalendarsByName(entry.name)[0] ||
      CalendarApp.createCalendar(entry.name, { timeZone: 'Asia/Tokyo' });
    // CalendarApp cannot change sharing, so add the ACL via the Calendar API advanced service
    Calendar.Acl.insert({ role: 'reader', scope: { type: 'default' } }, calendar.getId());
    console.log(`${entry.name}: ${calendar.getId()}`);
  });
}

// Where each mode is fetched from and how its slots are extracted. Modes other than coop read result[mode] of /api/schedule.
function sourceOf(entry) {
  return entry.mode === 'coop'
    ? { url: COOP_API_URL, extract: extractCoopSlots }
    : { url: API_URL, extract: extractSlots };
}

function fetchJson(url) {
  const res = UrlFetchApp.fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error(`${url} が ${res.getResponseCode()} を返した: ${res.getContentText().slice(0, 200)}`);
  }
  return JSON.parse(res.getContentText());
}

// During a Splatfest rule is null, so those slots are excluded by the rule match.
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

// Big Run slots come from the same API with is_big_run set, so mark them in the title.
function extractCoopSlots(coop, entry) {
  return coop.results.map((s) => ({
    key: `${entry.mode}/${s.start_time}`,
    start: s.start_time,
    end: s.end_time,
    title: s.is_big_run ? `${entry.name} ビッグラン` : entry.name,
    description: [
      `ステージ: ${s.stage.name}`,
      `オカシラシャケ: ${s.boss.name}`,
      'ブキ:',
      ...s.weapons.map((w) => `・${w.name}`),
      '',
      'データ: Spla3 API (https://spla3.yuu26.com)',
    ].join('\n'),
  }));
}
