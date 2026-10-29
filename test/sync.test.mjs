import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { loadGas } from '../scripts/gas.mjs';

// 2026-10-29 15:00 時点の https://spla3.yuu26.com/api/schedule の実レスポンス (ステージ画像 URL のみ削除)
const schedule = JSON.parse(readFileSync(new URL('./fixtures/schedule.json', import.meta.url), 'utf8'));
const YAGURA = { mode: 'bankara_open', rule: 'LOFT', name: 'オープン ヤグラ', calendarId: 'test' };

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

function setup(responses) {
  const calendar = fakeCalendar();
  const requests = [];
  const gas = loadGas({
    CalendarApp: { getCalendarById: () => calendar },
    UrlFetchApp: {
      fetch(url, options) {
        requests.push({ url, options });
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify(responses.shift()) };
      },
    },
  });
  gas(`CALENDARS.splice(0, CALENDARS.length, ${JSON.stringify(YAGURA)})`);
  return { gas, calendar, requests };
}

test('バンカラマッチ(オープン)のヤグラ枠だけを抽出する', () => {
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

test('フェス開催中 (rule が null) の枠は抽出しない', () => {
  const { gas } = setup([]);
  const fest = structuredClone(schedule);
  fest.result.bankara_open = fest.result.bankara_open.map((s) => ({ ...s, rule: null, stages: null, is_fest: true }));
  assert.equal(gas(`extractSlots(${JSON.stringify(fest)}, ${JSON.stringify(YAGURA)})`).length, 0);
});

test('再実行しても重複登録せず、新しく出た枠だけを足す', () => {
  // 2 回目は 2 時間後を想定: 先頭の枠が消え、末尾に新しいヤグラ枠が増える
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

test('createCalendars は ID が空の行だけ作って公開し、同じ名前があれば作らない', () => {
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

test('登録済みの枠はタイトルと説明欄を今の形式に書き換え、予定は増やさない', () => {
  const { gas, calendar } = setup([schedule, schedule]);
  gas('sync()');
  calendar.events[0].title = '古いタイトル';
  calendar.events[1].description = '古い説明';
  gas('sync()');
  assert.equal(calendar.events.length, 3);
  assert.equal(calendar.events[0].title, 'オープン ヤグラ');
  assert.equal(calendar.events[1].description, '・マテガイ放水路\n・オヒョウ海運\n\nデータ: Spla3 API (https://spla3.yuu26.com)');
});
