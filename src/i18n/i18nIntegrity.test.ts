import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resources } from './resources';

/**
 * 翻訳キーの整合性検査
 * ------------------------------------------------------------------
 * i18n.test.ts の「ja/en キー集合の一致」に加えて、以下を機械的に検査する。
 *   1. 補間変数（{{var}}）の ja/en 不一致検出   … 決定的なので失敗させる（gate）
 *   2. 未使用キー検出（コード中で t() 参照が無いキー） … 動的キー構築があり
 *      誤検知しやすいため「要目視確認リスト」を出力しつつ、既知分を超える
 *      新規の未使用キーが増えたら失敗させる（ベースライン方式）
 */

// i18n の namespace（src/i18n/index.ts の ns と一致）
const NAMESPACES = [
  'common', 'auth', 'header', 'setup', 'setupTabs', 'onboarding',
  'history', 'vehicle', 'compare', 'dashboard', 'share', 'errors', 'telemetry',
];

type Tree = Record<string, unknown>;

/** ツリーを走査し、葉（文字列値）のパスと値を返す。 */
const leafEntries = (value: unknown, prefix = ''): Array<[string, string]> => {
  if (typeof value === 'string') return [[prefix, value]];
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value as Tree).flatMap(([key, child]) =>
    leafEntries(child, prefix ? `${prefix}.${key}` : key),
  );
};

const placeholders = (text: string): string[] => {
  const found = new Set<string>();
  const re = /\{\{\s*([\w.-]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) found.add(m[1]);
  return [...found].sort();
};

// ---- ソース走査（t(...) 参照の収集）------------------------------------
const collectSourceKeys = () => {
  const exact = new Set<string>();
  const prefixes = new Set<string>();
  const root = join(process.cwd(), 'src');
  const files: string[] = [];
  (function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !full.includes(`${join('src', 'i18n')}`)) {
        files.push(full);
      }
    }
  })(root);

  // 未使用判定の取りこぼしを避けるため、t() 直後に限らず「あらゆる文字列リテラル」を収集する。
  // 三項演算子 t(cond ? 'a' : 'b')、ヘルパ関数が返すキー、配列・変数保持のキー等も拾える。
  // 定義キーは namespace 付きドット区切りなので、無関係な文字列が偶然一致する懸念は小さい。
  const re = /(['"`])((?:\\.|(?!\1).)*)\1/g;
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      const key = m[2];
      if (key.includes('${')) {
        // テンプレートリテラル（動的キー）: 静的部分をプレフィックスとして許容
        const head = key.slice(0, key.indexOf('${'));
        if (head.includes('.')) prefixes.add(head);
      } else if (key.includes('.')) {
        exact.add(key);
      }
    }
  }
  return { exact, prefixes };
};

/** 使用キー集合に対して定義キーが参照されているか判定。
 *  - 完全一致
 *  - namespace 未指定の呼び出し（useTranslation('ns') スコープ）に備え、
 *    先頭 namespace を除いた残りでも照合
 *  - 動的プレフィックス一致 */
const isReferenced = (
  definedKey: string,
  exact: Set<string>,
  prefixes: Set<string>,
): boolean => {
  if (exact.has(definedKey)) return true;
  const firstDot = definedKey.indexOf('.');
  if (firstDot > 0) {
    const ns = definedKey.slice(0, firstDot);
    const rest = definedKey.slice(firstDot + 1);
    if (NAMESPACES.includes(ns) && exact.has(rest)) return true;
  }
  for (const p of prefixes) {
    if (p && definedKey.startsWith(p)) return true;
  }
  return false;
};

describe('翻訳キーの補間変数', () => {
  it('ja-JP と en で {{変数}} の集合が一致する', () => {
    const ja = new Map(leafEntries(resources['ja-JP']));
    const en = new Map(leafEntries(resources.en));
    const mismatches: string[] = [];
    for (const [key, jaText] of ja) {
      const enText = en.get(key);
      if (enText === undefined) continue; // キー集合一致は i18n.test.ts が担保
      const jp = placeholders(jaText);
      const ep = placeholders(enText);
      if (jp.join(',') !== ep.join(',')) {
        mismatches.push(`${key}: ja={${jp.join(',')}} / en={${ep.join(',')}}`);
      }
    }
    expect(mismatches, `補間変数が不一致のキー:\n${mismatches.join('\n')}`).toEqual([]);
  });
});

describe('未使用の翻訳キー', () => {
  it('コード中で参照されない翻訳キーが増えていない', () => {
    const defined = leafEntries(resources['ja-JP']).map(([k]) => k);
    const { exact, prefixes } = collectSourceKeys();
    const unused = defined.filter((k) => !isReferenced(k, exact, prefixes)).sort();

    // 既知の未使用キーのベースライン（scripts/i18n-unused-baseline.json）。
    // 現状 setup.* 名前空間などが「resources には定義済みだが画面が未接続」で未参照。
    // これらは移行途中の既知残存として棚卸しし、新規に未使用キーが増えたら失敗させる。
    // 棚卸し（移行や削除でキーを使い切ったら）: I18N_DUMP_UNUSED=1 でベースライン再生成。
    const baselinePath = join(process.cwd(), 'scripts', 'i18n-unused-baseline.json');
    if (process.env.I18N_DUMP_UNUSED) {
      writeFileSync(baselinePath, `${JSON.stringify(unused, null, 2)}\n`, 'utf8');
    }
    const known: string[] = existsSync(baselinePath)
      ? JSON.parse(readFileSync(baselinePath, 'utf8'))
      : [];

    const fresh = unused.filter((k) => !known.includes(k));
    if (fresh.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] 新規の未参照翻訳キー ${fresh.length} 件:\n  ${fresh.join('\n  ')}`);
    }
    expect(
      fresh,
      '未使用（未参照）の翻訳キーを検出。動的参照なら isReferenced のプレフィックス対応、'
        + '移行/削除で解消したら I18N_DUMP_UNUSED=1 でベースラインを更新してください。',
    ).toEqual([]);
  });
});
