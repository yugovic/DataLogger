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

// ---- 走査対象ファイル ----------------------------------------------------
/**
 * src/ 配下と、**リポジトリ直下の .tsx**（CarSetup.tsx など）を対象にする。
 * 直下を見ていなかったため、CarSetup.tsx でしか使っていないキーが
 * 「未参照」に見え、逆に「参照しているが未定義」も検出できていなかった
 * （setup.humidity が生キー表示になっていたのを実機で指摘されて判明）。
 */
const sourceFiles = (): string[] => {
  const files: string[] = [];
  const isTarget = (name: string) =>
    /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name);

  (function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (isTarget(name) && !full.includes(`${join('src', 'i18n')}`)) files.push(full);
    }
  })(join(process.cwd(), 'src'));

  // リポジトリ直下（サブディレクトリは辿らない）
  for (const name of readdirSync(process.cwd())) {
    if (!isTarget(name)) continue;
    const full = join(process.cwd(), name);
    if (statSync(full).isFile()) files.push(full);
  }
  return files;
};

// ---- ソース走査（t(...) 参照の収集）------------------------------------
const collectSourceKeys = () => {
  const exact = new Set<string>();
  const prefixes = new Set<string>();
  const files = sourceFiles();

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


// ---- t(...) 呼び出しの収集（「参照しているのに未定義」の検出用）------------
/**
 * `t('key')` の第1引数だけを集める。
 *
 * collectSourceKeys は「あらゆる文字列リテラル」を拾っている。未使用キーの
 * 取りこぼしを防ぐには広い方が安全だが、逆方向（参照しているのに定義が無い）を
 * 見るときに同じ集合を使うと、ファイルパスや MIME 型まで「未定義キー」に
 * 化けてしまう。そこでこちらは t( の直後に限って拾う。
 */
const collectTranslationCalls = () => {
  const exact = new Set<string>();
  /** テンプレートリテラル（動的キー）の静的な前半部分 */
  const dynamic = new Set<string>();

  // t('x') / t("x") / t(`x`) / i18n.t('x')。改行や空白を挟む書き方も許す
  const re = /\bt\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;

  for (const file of sourceFiles()) {
    // コメント内の t('...') は実際の参照ではない。
    // 説明として書かれたキー名を「未定義」と誤検出しないよう先に落とす
    // （share.service.needSavedSetup をコメントから拾って誤検出した）。
    const content = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')          // ブロックコメント
      .replace(/(^|[^:\w])\/\/.*$/gm, '$1 ');       // 行コメント（http:// を残す）
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      const key = m[2];
      if (!key || !key.includes('.')) continue;      // 名前空間なしの1語は対象外
      if (key.includes('${')) dynamic.add(key.slice(0, key.indexOf('${')));
      else exact.add(key);
    }
  }
  return { exact, dynamic };
};

/** その参照キーが resources のどこかに解決できるか */
const resolvesToDefined = (key: string, defined: Set<string>): boolean => {
  if (defined.has(key)) return true;
  // useTranslation('setup') 配下など、名前空間を書かない参照
  for (const ns of NAMESPACES) if (defined.has(`${ns}.${key}`)) return true;
  return false;
};

/** 動的キーは静的な前半部分で当たりがあるかだけ見る */
const prefixHasDefined = (prefix: string, defined: Set<string>): boolean => {
  if (!prefix) return true;
  for (const k of defined) {
    if (k.startsWith(prefix)) return true;
    for (const ns of NAMESPACES) if (k.startsWith(`${ns}.${prefix}`)) return true;
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

describe('未定義の翻訳キー', () => {
  it('t() が参照しているキーは resources に定義されている', () => {
    // 定義漏れは画面に生キー（例: 「humidity 44%」）が出る。
    // 実機のスクリーンショットで指摘されるまで気づけなかったので機械検査にする。
    const defined = new Set(leafEntries(resources['ja-JP']).map(([k]) => k));
    const { exact, dynamic } = collectTranslationCalls();

    const missing = [...exact].filter((k) => !resolvesToDefined(k, defined)).sort();
    const missingPrefixes = [...dynamic].filter((p) => !prefixHasDefined(p, defined)).sort();

    expect(
      missing,
      '参照しているのに定義が無い翻訳キー。resources.ts に追加するか、参照側の綴りを直してください:\n  '
        + missing.join('\n  '),
    ).toEqual([]);

    expect(
      missingPrefixes,
      `動的キーの前半に一致する定義が無い:\n  ${missingPrefixes.join('\n  ')}`,
    ).toEqual([]);
  });

  it('ja に定義があるキーは en にもある（片方だけの定義を作らない）', () => {
    const ja = new Set(leafEntries(resources['ja-JP']).map(([k]) => k));
    const en = new Set(leafEntries(resources.en).map(([k]) => k));
    const onlyJa = [...ja].filter((k) => !en.has(k)).sort();
    const onlyEn = [...en].filter((k) => !ja.has(k)).sort();
    expect(onlyJa, `ja にしか無いキー:\n  ${onlyJa.join('\n  ')}`).toEqual([]);
    expect(onlyEn, `en にしか無いキー:\n  ${onlyEn.join('\n  ')}`).toEqual([]);
  });
});
