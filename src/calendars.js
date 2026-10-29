// Calendars to publish. Add one row here to add a calendar.
// mode: key of `result` in https://spla3.yuu26.com/api/schedule
//   (regular / bankara_open / bankara_challenge / x / event / fest / fest_challenge)
// rule: rule key (TURF_WAR / AREA / LOFT / GOAL / CLAM)
// name: calendar name, also used as the event title
// calendarId: calendar ID shown under "Integrate calendar" in Google Calendar settings
const CALENDARS = [
  { mode: 'bankara_open', rule: 'AREA', name: 'オープン エリア', calendarId: 'c519a262aa2c7bc17ff44ba7257a3e811c5dd3cac12fa45ce7c693f1908bb925@group.calendar.google.com' },
  { mode: 'bankara_open', rule: 'LOFT', name: 'オープン ヤグラ', calendarId: '4e3d3bd8466304740bb1236bae539715df3c922de7c0b855033b8d489f867d29@group.calendar.google.com' },
  { mode: 'bankara_open', rule: 'GOAL', name: 'オープン ホコ', calendarId: '773bab902425283611d272049a911a28088ad3c410c287166bbb3c3c684b4870@group.calendar.google.com' },
  { mode: 'bankara_open', rule: 'CLAM', name: 'オープン アサリ', calendarId: '49803d93f9e702f0ace4a2a031c9b1f9ae264988fb163ebc3e43bdd4c8556c9a@group.calendar.google.com' },
  { mode: 'bankara_challenge', rule: 'AREA', name: 'チャレンジ エリア', calendarId: '693c94281ab1edfefbad6d37baf770731e355e879ff7c685ac41ae8fa35b6aca@group.calendar.google.com' },
  { mode: 'bankara_challenge', rule: 'LOFT', name: 'チャレンジ ヤグラ', calendarId: 'ee0c2d479d2637583847b51dbc7e4dcc3f0cba809eabe193019db7a554b09cfa@group.calendar.google.com' },
  { mode: 'bankara_challenge', rule: 'GOAL', name: 'チャレンジ ホコ', calendarId: '5d7ac8a29ddeedeb30ffc9f031413dfabd9627c580ec6fe28645c4c3316858e1@group.calendar.google.com' },
  { mode: 'bankara_challenge', rule: 'CLAM', name: 'チャレンジ アサリ', calendarId: '41243b83567209db15426df1ac3e8a1fab8d1707f860693168280cd2a2ed8936@group.calendar.google.com' },
  { mode: 'x', rule: 'AREA', name: 'X エリア', calendarId: 'c61774a28fe3d10e7c450873bf55ae44a9399539ed720f5cf8b7fe794615129b@group.calendar.google.com' },
  { mode: 'x', rule: 'LOFT', name: 'X ヤグラ', calendarId: '3f8c85d2b3cbbae1a266e14bff7cfa9b19bc2c5cdd451cce864f2bce27f055ce@group.calendar.google.com' },
  { mode: 'x', rule: 'GOAL', name: 'X ホコ', calendarId: '6e535673d2a3308aef20fe97832bc9a4992c6825d2234f6b954a321337b809cf@group.calendar.google.com' },
  { mode: 'x', rule: 'CLAM', name: 'X アサリ', calendarId: 'ba9afe031a54ae1cc6e0ba04a5b31acdb448a70fa273cac27957086fcd10e8d6@group.calendar.google.com' },
];
