const API_URL = 'https://spla3.yuu26.com/api/schedule';
const USER_AGENT = 'spla3gcal/1.0 (https://github.com/minodisk/spla3gcal)';
// Event tag key. Its value holds the slot key so reruns never create duplicates.
const SLOT_TAG = 'spla3gcal.slot';

// Called by the time-driven trigger. Writes unregistered slots to every calendar in CALENDARS,
// and rewrites the title and description of registered slots that differ from the current format.
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
