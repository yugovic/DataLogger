/**
 * 疑似ロケール（pseudo-locale）生成ロジック
 * ------------------------------------------------------------------
 * 実際の翻訳を用意せず、既存の英語文字列を機械的に「水増し・装飾」した
 * 文字列へ変換し、翻訳がどんな長さ・文字種になっても UI が崩れないかを
 * 検証するための擬似リソースツリーを生成する。
 *
 * 変換内容:
 *   (a) ラテン文字をアクセント付き文字へ置換（Ĥéĺĺó のように）
 *   (b) 文字数を約 1.4 倍へ水増し（母音の重複挿入）
 *   (c) 文字列全体を ⟦ … ⟧ マーカーで囲む（切り詰め・欠落を検出しやすくする）
 *
 * i18next の補間プレースホルダー（{{変数名}} や $t(...) ネスト）は
 * 変換せずそのまま保持する。これを壊すと補間が機能しなくなる。
 *
 * 本番の src/i18n/resources.ts は一切変更しない。テスト実行時のみ
 * この生成結果を addResourceBundle でブラウザ側 i18next へ注入する。
 */
import { resources } from '../src/i18n/resources';

// ラテン文字 -> アクセント付き文字のマッピング
const ACCENT_MAP: Record<string, string> = {
  a: 'ȧ', b: 'ḃ', c: 'ċ', d: 'ḋ', e: 'ḗ', f: 'ḟ', g: 'ġ', h: 'ĥ', i: 'ï',
  j: 'ĵ', k: 'ķ', l: 'ĺ', m: 'ḿ', n: 'ƞ', o: 'ọ', p: 'ṗ', q: '01', r: 'ṙ',
  s: 'ṡ', t: 'ŧ', u: 'ṻ', v: 'ṽ', w: 'ẇ', x: 'ẋ', y: 'ẏ', z: 'ż',
  A: 'Ȧ', B: 'Ḃ', C: 'Ċ', D: 'Ḋ', E: 'Ḗ', F: 'Ḟ', G: 'Ġ', H: 'Ĥ', I: 'Ï',
  J: 'Ĵ', K: 'Ķ', L: 'Ĺ', M: 'Ḿ', N: 'Ƞ', O: 'Ọ', P: 'Ṗ', Q: 'Q', R: 'Ṙ',
  S: 'Ṡ', T: 'Ŧ', U: 'Ṻ', V: 'Ṽ', W: 'Ẇ', X: 'Ẋ', Y: 'Ẏ', Z: 'Ż',
};

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U']);

// {{var}} / {{var, format}} / $t(ns.key) を保持するためのトークン抽出
const PLACEHOLDER_RE = /\{\{[^}]*\}\}|\$t\([^)]*\)/g;

/**
 * 補間プレースホルダー以外の 1 セグメントを装飾する。
 * - ラテン文字をアクセント文字へ
 * - 母音は複製して約 1.4 倍に水増し
 */
function decorateSegment(segment: string): string {
  let out = '';
  for (const ch of segment) {
    const accented = ACCENT_MAP[ch] ?? ch;
    out += accented;
    // 母音を複製して長さを水増し（元英語比 +30〜50% 相当を狙う）
    if (VOWELS.has(ch)) {
      out += accented;
    }
  }
  return out;
}

/**
 * 1 つの翻訳文字列を疑似ロケール文字列へ変換する。
 * 補間プレースホルダーはそのまま残す。
 */
export function pseudoString(value: string): string {
  if (value.length === 0) return value;

  let cursor = 0;
  let body = '';
  for (const match of value.matchAll(PLACEHOLDER_RE)) {
    const start = match.index ?? 0;
    body += decorateSegment(value.slice(cursor, start));
    body += match[0]; // プレースホルダーは無変換で保持
    cursor = start + match[0].length;
  }
  body += decorateSegment(value.slice(cursor));

  return `⟦${body}⟧`;
}

type ResourceTree = { [key: string]: string | number | ResourceTree };

/**
 * ネストされたリソースツリーのリーフ文字列を再帰的に変換する。
 * 数値・真偽値はそのまま保持する。
 */
export function pseudoTree(tree: ResourceTree): ResourceTree {
  const result: ResourceTree = {};
  for (const [key, val] of Object.entries(tree)) {
    if (typeof val === 'string') {
      result[key] = pseudoString(val);
    } else if (val && typeof val === 'object') {
      result[key] = pseudoTree(val as ResourceTree);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * en リソースをベースに、名前空間ごとの疑似ロケールバンドルを生成する。
 * 戻り値: { [namespace]: 疑似リソースツリー }
 * これを en の各名前空間へ overwrite で addResourceBundle することで、
 * 言語切替なしに全 UI を疑似ロケール表示にできる。
 */
export function buildPseudoBundles(): Record<string, ResourceTree> {
  const en = resources.en as Record<string, ResourceTree>;
  const bundles: Record<string, ResourceTree> = {};
  for (const [ns, tree] of Object.entries(en)) {
    bundles[ns] = pseudoTree(tree);
  }
  return bundles;
}
