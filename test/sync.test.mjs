import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { loadGas } from '../scripts/gas.mjs';

// Real response of https://spla3.yuu26.com/api/schedule at 2026-10-29 15:00 JST (stage image URLs removed)
const schedule = JSON.parse(readFileSync(new URL('./fixtures/schedule.json', import.meta.url), 'utf8'));
// Real response of https://spla3.yuu26.com/api/coop-grouping/schedule on 2026-10-29 (stage and weapon image URLs removed)
const coop = JSON.parse(readFileSync(new URL('./fixtures/coop.json', import.meta.url), 'utf8'));
const YAGURA = { mode: 'bankara_open', rule: 'LOFT', name: 'オープン ヤグラ', calendarId: 'test' };
const SALMON = { mode: 'coop', name: 'サーモンラン', calendarId: 'test-coop' };

function fakeCalendar() {
  const events = [];
  return {
    events,
    getEvents: (from, to) => events.filter((e) => e.start < to && e.end > from),
    createEvent(title, start, end, options) {
      const tags = {};
      const event = {
        title, start, end, description: options.description,
        setTag: (k, v) => { tags[k] = v; return event; },
        getTag: (k) => tags[k] ?? null,
        getTitle: () => event.title,
        setTitle: (v) => { event.title = v; },
        getDescription: () => event.description,
        setDescription: (v) => { event.description = v; },
      };
      events.push(event);
      return event;
    },
  };
}

// responses: an array, or per-URL arrays, of bodies returned in order on each fetch
function setup(responses, entries = [YAGURA]) {
  const calendars = Object.fromEntries(entries.map((e) => [e.calendarId, fakeCalendar()]));
  const requests = [];
  const gas = loadGas({
    CalendarApp: { getCalendarById: (id) => calendars[id] },
    UrlFetchApp: {
      fetch(url, options) {
        requests.push({ url, options });
        const body = Array.isArray(responses) ? responses.shift() : responses[url].shift();
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify(body) };
      },
    },
  });
  gas(`CALENDARS.splice(0, CALENDARS.length, ...${JSON.stringify(entries)})`);
  return { gas, calendar: calendars[entries[0].calendarId], calendars, requests };
}

test('extracts only Anarchy Battle (Open) Tower Control slots', () => {
  const { gas } = setup([]);
  const slots = structuredClone(gas(`extractSlots(${JSON.stringify(schedule)}, ${JSON.stringify(YAGURA)})`));
  assert.deepEqual(
    slots.map((s) => [s.start, s.end, s.title, s.description.split('\n\n')[0]]),
    [
      ['2026-10-29T15:00:00+09:00', '2026-10-29T17:00:00+09:00', 'オープン ヤグラ', '・ユノハナ大渓谷\n・ナンプラー遺跡'],
      ['2026-10-29T23:00:00+09:00', '2026-10-30T01:00:00+09:00', 'オープン ヤグラ', '・マテガイ放水路\n・オヒョウ海運'],
      ['2026-10-30T07:00:00+09:00', '2026-10-30T09:00:00+09:00', 'オープン ヤグラ', '・マヒマヒリゾート＆スパ\n・リュウグウターミナル'],
    ],
  );
  assert.equal(slots[0].key, 'bankara_open/LOFT/2026-10-29T15:00:00+09:00');
});

test('skips slots during a Splatfest (rule is null)', () => {
  const { gas } = setup([]);
  const fest = structuredClone(schedule);
  fest.result.bankara_open = fest.result.bankara_open.map((s) => ({ ...s, rule: null, stages: null, is_fest: true }));
  assert.equal(gas(`extractSlots(${JSON.stringify(fest)}, ${JSON.stringify(YAGURA)})`).length, 0);
});

test('reruns add only new slots without duplicates', () => {
  // The third run simulates a later fetch: the first slot is gone and a new Tower Control slot is appended
  const later = structuredClone(schedule);
  const open = later.result.bankara_open.slice(1);
  open.push({
    ...open.findLast((s) => s.rule.key === 'LOFT'),
    start_time: '2026-10-30T13:00:00+09:00',
    end_time: '2026-10-30T15:00:00+09:00',
  });
  later.result.bankara_open = open;
  const { gas, calendar, requests } = setup([schedule, schedule, later]);

  gas('sync()');
  assert.equal(calendar.events.length, 3);
  gas('sync()');
  assert.equal(calendar.events.length, 3);
  gas('sync()');
  assert.deepEqual(
    calendar.events.map((e) => e.getTag('spla3gcal.slot')),
    [
      'bankara_open/LOFT/2026-10-29T15:00:00+09:00',
      'bankara_open/LOFT/2026-10-29T23:00:00+09:00',
      'bankara_open/LOFT/2026-10-30T07:00:00+09:00',
      'bankara_open/LOFT/2026-10-30T13:00:00+09:00',
    ],
  );
  assert.equal(requests.length, 3);
  assert.match(requests[0].options.headers['User-Agent'], /github\.com\/minodisk\/spla3gcal/);
});

test('createCalendars creates and publishes only rows without an ID, reusing calendars with the same name', () => {
  const owned = { 'バンカラマッチ(オープン) ガチエリア': [{ getId: () => 'area@group' }] };
  const created = [];
  const acl = [];
  const gas = loadGas({
    CalendarApp: {
      getOwnedCalendarsByName: (name) => owned[name] ?? [],
      createCalendar(name, options) {
        created.push({ name, options });
        return { getId: () => 'new@group' };
      },
    },
    Calendar: { Acl: { insert: (resource, id) => acl.push({ resource, id }) } },
    console: { log() {} },
  });
  gas(`CALENDARS.splice(0, CALENDARS.length,
    { mode: 'bankara_open', rule: 'LOFT', name: 'バンカラマッチ(オープン) ガチヤグラ', calendarId: '' },
    { mode: 'bankara_open', rule: 'AREA', name: 'バンカラマッチ(オープン) ガチエリア', calendarId: '' },
    { mode: 'bankara_open', rule: 'GOAL', name: 'バンカラマッチ(オープン) ガチホコバトル', calendarId: 'goal@group' })`);
  gas('createCalendars()');
  assert.deepEqual(structuredClone(created), [
    { name: 'バンカラマッチ(オープン) ガチヤグラ', options: { timeZone: 'Asia/Tokyo' } },
  ]);
  assert.deepEqual(structuredClone(acl), [
    { resource: { role: 'reader', scope: { type: 'default' } }, id: 'new@group' },
    { resource: { role: 'reader', scope: { type: 'default' } }, id: 'area@group' },
  ]);
});

test('rewrites title and description of registered slots without adding events', () => {
  const { gas, calendar } = setup([schedule, schedule]);
  gas('sync()');
  calendar.events[0].title = '古いタイトル';
  calendar.events[1].description = '古い説明';
  gas('sync()');
  assert.equal(calendar.events.length, 3);
  assert.equal(calendar.events[0].title, 'オープン ヤグラ');
  assert.equal(calendar.events[1].description, '・マテガイ放水路\n・オヒョウ海運\n\nデータ: Spla3 API (https://spla3.yuu26.com)');
});

test('extracts Salmon Run slots with stage, King Salmonid, and weapons', () => {
  const { gas } = setup([]);
  const slots = structuredClone(gas(`extractCoopSlots(${JSON.stringify(coop)}, ${JSON.stringify(SALMON)})`));
  assert.deepEqual(
    slots.map((s) => [s.key, s.start, s.end, s.title]),
    [
      ['coop/2026-10-29T09:00:00+09:00', '2026-10-29T09:00:00+09:00', '2026-10-31T01:00:00+09:00', 'サーモンラン'],
      ['coop/2026-10-31T01:00:00+09:00', '2026-10-31T01:00:00+09:00', '2026-11-01T17:00:00+09:00', 'サーモンラン'],
      ['coop/2026-11-01T17:00:00+09:00', '2026-11-01T17:00:00+09:00', '2026-11-03T09:00:00+09:00', 'サーモンラン'],
      ['coop/2026-11-03T09:00:00+09:00', '2026-11-03T09:00:00+09:00', '2026-11-05T01:00:00+09:00', 'サーモンラン'],
      ['coop/2026-11-05T01:00:00+09:00', '2026-11-05T01:00:00+09:00', '2026-11-06T17:00:00+09:00', 'サーモンラン'],
    ],
  );
  assert.equal(
    slots[0].description,
    'ステージ: どんぴこ闘技場\nオカシラシャケ: ヨコヅナ\nブキ:\n・ヴァリアブルローラー\n・ガエンFF\n・.52ガロン\n・ハイドラント\n\nデータ: Spla3 API (https://spla3.yuu26.com)',
  );
});

test('marks Big Run slots in the title', () => {
  const { gas } = setup([]);
  const bigRun = structuredClone(coop);
  bigRun.results[1].is_big_run = true;
  const slots = gas(`extractCoopSlots(${JSON.stringify(bigRun)}, ${JSON.stringify(SALMON)})`);
  assert.deepEqual([...slots].map((s) => s.title).slice(0, 3), ['サーモンラン', 'サーモンラン ビッグラン', 'サーモンラン']);
});

test('fetches battle and Salmon Run APIs once each and never duplicates on rerun', () => {
  // The second run is two days later: the first slot is gone and a new one is appended
  const later = structuredClone(coop);
  later.results.shift();
  later.results.push({ ...later.results.at(-1), start_time: '2026-11-06T17:00:00+09:00', end_time: '2026-11-08T09:00:00+09:00' });
  const { gas, calendars, requests } = setup(
    {
      'https://spla3.yuu26.com/api/schedule': [schedule, schedule],
      'https://spla3.yuu26.com/api/coop-grouping/schedule': [coop, later],
    },
    [YAGURA, SALMON],
  );

  gas('sync()');
  assert.equal(calendars.test.events.length, 3);
  assert.equal(calendars['test-coop'].events.length, 5);
  gas('sync()');
  assert.equal(calendars.test.events.length, 3);
  assert.deepEqual(
    calendars['test-coop'].events.map((e) => e.getTag('spla3gcal.slot')),
    [...coop.results.map((s) => `coop/${s.start_time}`), 'coop/2026-11-06T17:00:00+09:00'],
  );
  assert.deepEqual(
    requests.map((r) => r.url),
    [
      'https://spla3.yuu26.com/api/schedule',
      'https://spla3.yuu26.com/api/coop-grouping/schedule',
      'https://spla3.yuu26.com/api/schedule',
      'https://spla3.yuu26.com/api/coop-grouping/schedule',
    ],
  );
  assert.match(requests[1].options.headers['User-Agent'], /github\.com\/minodisk\/spla3gcal/);
});

test('skips rows with an empty calendarId and does not fetch APIs only they use', () => {
  const { gas, calendar, requests } = setup([schedule], [YAGURA, { ...SALMON, calendarId: '' }]);
  gas('sync()');
  assert.equal(calendar.events.length, 3);
  assert.deepEqual(requests.map((r) => r.url), ['https://spla3.yuu26.com/api/schedule']);
});
