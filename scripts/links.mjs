// Generates the subscribe-link table from CALENDARS in src/calendars.js and rewrites it between the markers in README.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { loadGas } from './gas.mjs';

const README = new URL('../README.md', import.meta.url);
const START = '<!-- calendars:start -->';
const END = '<!-- calendars:end -->';

function subscribeUrl(calendarId) {
  return `https://calendar.google.com/calendar/u/0?cid=${encodeURIComponent(calendarId)}`;
}

function linksMarkdown(calendars) {
  const rows = calendars.map((c) =>
    c.calendarId ? `| ${c.name} | [購読する](${subscribeUrl(c.calendarId)}) |` : `| ${c.name} | 準備中 |`,
  );
  return ['| カレンダー | 購読リンク |', '| --- | --- |', ...rows].join('\n');
}

const calendars = loadGas()('CALENDARS');
const readme = readFileSync(README, 'utf8');
const start = readme.indexOf(START);
const end = readme.indexOf(END);
if (start < 0 || end < start) {
  throw new Error(`README.md に ${START} と ${END} がない`);
}
writeFileSync(README, `${readme.slice(0, start + START.length)}\n${linksMarkdown(calendars)}\n${readme.slice(end)}`);
