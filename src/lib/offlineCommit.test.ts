import { describe, it, expect, vi } from 'vitest';
import { commitWithoutBlocking } from './offlineCommit';

/** 決して解決しない Promise（オフラインの setDoc を模す） */
const neverResolves = () => new Promise<void>(() => {});

describe('commitWithoutBlocking', () => {
  it('期限内に解決すれば synced', async () => {
    const r = await commitWithoutBlocking(Promise.resolve(), { timeoutMs: 100 });
    expect(r.outcome).toBe('synced');
  });

  it('期限内に失敗すれば failed（握り潰さない）', async () => {
    const err = new Error('permission-denied');
    const r = await commitWithoutBlocking(Promise.reject(err), { timeoutMs: 100 });
    expect(r.outcome).toBe('failed');
    expect(r.error).toBe(err);
  });

  it('オフラインで解決しなければ queued を返して先へ進める', async () => {
    const started = Date.now();
    const r = await commitWithoutBlocking(neverResolves(), { timeoutMs: 50 });
    expect(r.outcome).toBe('queued');
    // 無限に待たない
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('queued のあとに同期が通ったら onLateResult で通知する', async () => {
    let resolveWrite: () => void = () => {};
    const write = new Promise<void>((res) => { resolveWrite = res; });
    const onLateResult = vi.fn();

    const r = await commitWithoutBlocking(write, { timeoutMs: 20, onLateResult });
    expect(r.outcome).toBe('queued');
    expect(onLateResult).not.toHaveBeenCalled();

    resolveWrite();
    await vi.waitFor(() => expect(onLateResult).toHaveBeenCalledWith({ outcome: 'synced' }));
  });

  it('queued のあとに失敗が確定したら failed として通知する', async () => {
    let rejectWrite: (e: unknown) => void = () => {};
    const write = new Promise<void>((_, rej) => { rejectWrite = rej; });
    const onLateResult = vi.fn();

    const r = await commitWithoutBlocking(write, { timeoutMs: 20, onLateResult });
    expect(r.outcome).toBe('queued');

    const err = new Error('later failure');
    rejectWrite(err);
    await vi.waitFor(() =>
      expect(onLateResult).toHaveBeenCalledWith({ outcome: 'failed', error: err }),
    );
  });

  it('未処理の rejection を発生させない', async () => {
    const onUnhandled = vi.fn();
    process.on('unhandledRejection', onUnhandled);

    const write = Promise.reject(new Error('boom'));
    await commitWithoutBlocking(write, { timeoutMs: 10 });
    await new Promise((r) => setTimeout(r, 50));

    process.off('unhandledRejection', onUnhandled);
    expect(onUnhandled).not.toHaveBeenCalled();
  });
});
