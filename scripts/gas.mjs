// src/ の GAS ファイルを Node で読み込む。GAS と同じく全ファイルが 1 つのグローバルスコープを共有する。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FILES = ['calendars.js', 'sync.js'];

export function loadGas(globals = {}) {
  const context = vm.createContext({ ...globals });
  for (const file of FILES) {
    const src = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    vm.runInContext(src, context, { filename: file });
  }
  return (expr) => vm.runInContext(expr, context);
}
