// 未保存離脱保護フック。
//
// - beforeunload: リロード・タブ終了時にブラウザ標準の確認を出す。
// - useBlocker: React Router 内の遷移（Header ナビ・SPA navigate）と
//   ブラウザバック(POP)をブロックし、破棄確認モーダルを表示する。
//
// useBlocker は data router（createBrowserRouter / RouterProvider）でのみ動作する。
// App.tsx を data router へ移行済みであることが前提。
//
// ダーティ判定は同期的に読める `hasUnsavedChanges()`（ref ベース）で行う。
// 保存成功直後に基準スナップショットを同期更新してから navigate すると、
// この関数が false を返すため、保存後の遷移はブロックされない。

import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import type { BlockerFunction } from 'react-router-dom';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

export interface UnsavedChangesGuardOptions {
  /** 同期的にダーティ状態を返す（blocker/beforeunload の判定に使う） */
  hasUnsavedChanges: () => boolean;
  /** ダーティ状態（beforeunload リスナーの付け外し依存値・UI 用） */
  isDirty: boolean;
  /** ガードを有効にするか（閲覧モードでは false 等）。既定 true */
  enabled?: boolean;
}

export function useUnsavedChangesGuard({
  hasUnsavedChanges,
  isDirty,
  enabled = true,
}: UnsavedChangesGuardOptions): void {
  const { t } = useTranslation();
  // リロード・タブ終了の保護（SPA 遷移では発火しない）
  useEffect(() => {
    if (!enabled || !isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 一部ブラウザ互換のため returnValue を設定する
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled, isDirty]);

  // React Router 内遷移・ブラウザバックのブロック判定。
  // pathname が変わる遷移だけを対象にする（同一ページ内の ?copy= 付与などは対象外）。
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      enabled &&
      hasUnsavedChanges() &&
      currentLocation.pathname !== nextLocation.pathname,
    [enabled, hasUnsavedChanges],
  );

  const blocker = useBlocker(shouldBlock);

  // 破棄確認モーダル。二重表示を防ぐため ref でガードする。
  const promptOpenRef = useRef(false);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (promptOpenRef.current) return;
    promptOpenRef.current = true;
    Modal.confirm({
      title: t('common.unsaved.title'),
      content: t('common.unsaved.content'),
      okText: t('common.unsaved.leave'),
      cancelText: t('common.unsaved.stay'),
      okButtonProps: { danger: true },
      onOk: () => {
        promptOpenRef.current = false;
        blocker.proceed?.();
      },
      onCancel: () => {
        promptOpenRef.current = false;
        blocker.reset?.();
      },
    });
  }, [blocker, t]);
}
