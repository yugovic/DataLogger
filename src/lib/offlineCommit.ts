/**
 * サーバーACKを待たずに保存を完了扱いにするための小さなユーティリティ
 *
 * Firestore Web SDK の setDoc/updateDoc が返す Promise は、
 * **オフラインの間ずっと解決しない**（サーバーACK待ちのため）。
 * 書き込み自体はローカルキャッシュへ即時反映され、IndexedDB の
 * mutation queue に積まれて電波復帰後に自動同期される。
 *
 * したがって `await setDoc(...)` をUIの完了条件にすると、圏外では
 * 「無言のまま保存中スピナーが回り続ける」ことになる。ピットは電波が悪く、
 * 次の走行枠まで時間がない。ここでは短い猶予だけ待って、解決しなければ
 * 「端末に保存済み・未同期」として先へ進める。
 *
 * 嘘はつかない: 同期済み(synced)と未同期(queued)を区別して呼び出し元へ返し、
 * UI はそのまま表示する。
 */

/** 書き込みの帰結。queued = 端末には入ったがサーバー未達 */
export type WriteOutcome = 'synced' | 'queued' | 'failed';

export interface CommitResult {
  outcome: WriteOutcome;
  /** outcome === 'failed' のときだけ入る */
  error?: unknown;
}

/**
 * 書き込み Promise を、最大 timeoutMs だけ待つ。
 *
 * - 期限内に解決 → 'synced'
 * - 期限内に失敗 → 'failed'（権限エラー等。これは本当の失敗なので握り潰さない）
 * - 期限を過ぎても未解決 → 'queued'（オフラインとみなす）
 *
 * 'queued' を返したあとも元の Promise は生き続けるので、
 * onLateResult で後から結果を受け取れる（同期完了バッジの解除に使う）。
 */
export async function commitWithoutBlocking(
  write: Promise<unknown>,
  options: {
    timeoutMs?: number;
    /** 猶予を過ぎたあとに決着したときの通知 */
    onLateResult?: (result: CommitResult) => void;
  } = {},
): Promise<CommitResult> {
  const timeoutMs = options.timeoutMs ?? 1200;

  let settled = false;
  const tracked = write.then(
    () => {
      settled = true;
      return { outcome: 'synced' as const };
    },
    (error: unknown) => {
      settled = true;
      return { outcome: 'failed' as const, error };
    },
  );

  const timeout = new Promise<CommitResult>((resolve) => {
    setTimeout(() => resolve({ outcome: 'queued' }), timeoutMs);
  });

  const first = await Promise.race([tracked, timeout]);

  if (first.outcome === 'queued' && !settled) {
    // 遅れて決着したら呼び出し元へ知らせる。ここで catch しておかないと
    // 未処理の rejection になる
    void tracked.then((late) => options.onLateResult?.(late));
  }

  return first;
}
