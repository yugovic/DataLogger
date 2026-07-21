#!/usr/bin/env node
/**
 * ハードコード日本語文言の静的検査
 * ------------------------------------------------------------------
 * src/ 配下の .tsx / .ts を走査し、コメント・開発用ログ以外の場所に
 * 残っている日本語（ひらがな・カタカナ・漢字）を検出する。
 *
 * 過去に CarSetup.tsx / lib / services 層の日本語ハードコードが
 * 「移行完了」と誤報告される事故が繰り返し起きたため、機械的に検出する。
 *
 * 抑制の仕組み:
 *   - コメント行・ブロックコメントは無視
 *   - console.* / logger.* の開発用ログ行は無視
 *   - *.test.ts / *.test.tsx は対象外
 *   - src/i18n/ 配下（翻訳リソース本体）は対象外
 *   - 行末または直前行に `// i18n-ignore` があれば無視
 *   - ファイル先頭付近に `i18n-ignore-file` コメントがあればファイル全体を無視
 *   - ALLOWLIST に載せたパス（サーキット名初期値など意図的な日本語）は対象外
 *
 * ベースライン方式:
 *   i18n 移行は全画面ではまだ完了しておらず、現時点でも多数のハードコードが残る。
 *   そのため「現状の残存」を scripts/i18n-hardcoded-baseline.json に記録し、
 *   検査では *ベースラインに無い新規のハードコード* だけを失敗として扱う。
 *   これにより「移行済みファイルへの再混入」や「新規ファイルの取りこぼし」を防ぎつつ、
 *   既知の残存を一括修正しなくても CI を通せる。ファイルを i18n 化したら
 *   --update-baseline で棚卸しし、残存件数を減らしていく。
 *
 * 使い方:
 *   node scripts/check-hardcoded-japanese.mjs                   ベースライン差分検査（新規があれば exit 1）
 *   node scripts/check-hardcoded-japanese.mjs --report          全検出を一覧表示（常に exit 0）
 *   node scripts/check-hardcoded-japanese.mjs --update-baseline 現状をベースラインとして保存
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

// 日本語（ひらがな U+3040-309F / カタカナ U+30A0-30FF / CJK U+3400-9FFF）
const JAPANESE = /[぀-ヿ㐀-鿿]/;

/**
 * 意図的に日本語のまま残しているファイル、および他サブエージェントが並行対応中で
 * 今回のタスクでは修正しない領域。相対パス（src/ からの）のプレフィックス一致。
 * ここに載せた分は「既知の残存」として --report では表示されるが検査は失敗させない。
 */
const ALLOWLIST = [
  // 走行ログ（テレメトリ）の解析ロジック層: 生成される注釈文字列等は未対応。別途対応予定。
  // src/components/telemetry/ 配下は Phase 2 で i18n 移行済みのため除外しない。
  'src/lib/telemetry/',
  // サーキット名の初期値候補（日本語の固有名詞を意図的に保持）
  'src/lib/tracks.ts',
];

const args = new Set(process.argv.slice(2));
const REPORT_ONLY = args.has('--report');
const UPDATE_BASELINE = args.has('--update-baseline');
const BASELINE_PATH = join(ROOT, 'scripts', 'i18n-hardcoded-baseline.json');

/** ベースライン照合キー: 行番号は変動するため rel + テキストで安定化する。 */
const keyOf = (f) => `${f.rel}::${f.text}`;

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else if (/\.(tsx?|)$/.test(name) && /\.(ts|tsx)$/.test(name)) {
      files.push(full);
    }
  }
})(SRC);

/** ソース1行分をコメント/文字列状態を追跡しつつ処理するためのファイル単位スキャナ。
 *  各文字に「コメント内か否か」のフラグを付けて返す。文字列内の日本語は検出対象、
 *  コメント内の日本語は非対象。*/
function classify(content) {
  const lines = content.split('\n');
  const result = [];
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let masked = ''; // コメント文字をスペースに置換した行（＝コード＋文字列だけ残る）
    let inLineComment = false;
    let str = null; // ' " ` のいずれか、文字列内なら格納

    for (let c = 0; c < line.length; c += 1) {
      const ch = line[c];
      const next = line[c + 1];

      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          c += 1;
        }
        masked += ' ';
        continue;
      }
      if (inLineComment) {
        masked += ' ';
        continue;
      }
      if (str) {
        masked += ch;
        if (ch === '\\') {
          // エスケープ: 次の文字も文字列の一部として素通し
          if (c + 1 < line.length) {
            masked += line[c + 1];
            c += 1;
          }
          continue;
        }
        if (ch === str) str = null;
        continue;
      }
      // 通常コード
      if (ch === '/' && next === '/') {
        inLineComment = true;
        masked += ' ';
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        masked += ' ';
        c += 1;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        str = ch;
        masked += ch;
        continue;
      }
      masked += ch;
    }

    result.push({ raw: line, masked, index: i });
  }
  return result;
}

const findings = [];

for (const file of files) {
  const rel = relative(ROOT, file).split('\\').join('/');
  if (/\.test\.(ts|tsx)$/.test(rel)) continue;
  if (rel.startsWith('src/i18n/')) continue;

  const content = readFileSync(file, 'utf8');

  // ファイル全体抑制
  if (/i18n-ignore-file/.test(content.slice(0, 500))) continue;

  const allowlisted = ALLOWLIST.some((p) => rel.startsWith(p));

  const scanned = classify(content);
  const rawLines = content.split('\n');

  for (const { masked, index } of scanned) {
    if (!JAPANESE.test(masked)) continue;

    const raw = rawLines[index];
    const trimmed = raw.trim();

    // 開発用ログ出力（console.* / logger.*）は許可
    if (/\b(console\.[a-z]+|logger\.[a-zA-Z]+)\s*\(/.test(masked)) continue;

    // 行末抑制 or 直前行の抑制コメント
    if (/i18n-ignore/.test(raw)) continue;
    const prev = index > 0 ? rawLines[index - 1] : '';
    if (/i18n-ignore\s*$/.test(prev.trim())) continue;

    findings.push({ rel, line: index + 1, text: trimmed, allowlisted });
  }
}

const active = findings.filter((f) => !f.allowlisted);
const known = findings.filter((f) => f.allowlisted);

const fmt = (list) => {
  const byFile = new Map();
  for (const f of list) {
    if (!byFile.has(f.rel)) byFile.set(f.rel, []);
    byFile.get(f.rel).push(f);
  }
  const out = [];
  for (const [rel, items] of byFile) {
    out.push(`  ${rel}`);
    for (const it of items) {
      const t = it.text.length > 100 ? `${it.text.slice(0, 100)}…` : it.text;
      out.push(`    L${it.line}: ${t}`);
    }
  }
  return out.join('\n');
};

if (UPDATE_BASELINE) {
  const baseline = active.map(keyOf).sort();
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  console.log(`[i18n:hardcoded] ベースラインを更新しました: ${baseline.length} 件`);
  console.log(`  ${relative(ROOT, BASELINE_PATH)}`);
  process.exit(0);
}

if (REPORT_ONLY) {
  console.log(`[i18n:hardcoded] レポートモード（検査は失敗させません）`);
  console.log(`検出（要対応候補）: ${active.length} 件 / allowlist 除外: ${known.length} 件\n`);
  if (active.length) {
    console.log('■ 検出（allowlist 外）:');
    console.log(fmt(active));
  }
  if (known.length) {
    console.log('\n■ allowlist 除外（別途対応予定）:');
    console.log(fmt(known));
  }
  process.exit(0);
}

// ベースライン差分検査
const baseline = existsSync(BASELINE_PATH)
  ? new Set(JSON.parse(readFileSync(BASELINE_PATH, 'utf8')))
  : new Set();
const seen = new Set();
const fresh = active.filter((f) => {
  const k = keyOf(f);
  if (baseline.has(k) || seen.has(k)) return false;
  seen.add(k);
  return true;
});

if (fresh.length === 0) {
  console.log(
    `[i18n:hardcoded] OK — 新規のハードコード日本語はありません（既知の残存 ${baseline.size} 件・allowlist ${known.length} 件は除外）。`,
  );
  process.exit(0);
}

console.error(`[i18n:hardcoded] NG — ベースラインに無い新規のハードコード日本語を ${fresh.length} 件検出しました。`);
console.error('翻訳キー経由 (t(...)) に置換、意図的なら // i18n-ignore 付与、既知残存の棚卸しなら --update-baseline を実行してください。\n');
console.error(fmt(fresh));
process.exit(1);
