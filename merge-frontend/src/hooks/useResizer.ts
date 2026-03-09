import { useState } from 'react';
import type { MouseEvent } from 'react';

/**
 * メモエディタのリサイズ操作を管理するフック。
 */
export function useResizer(initialWidth = 450) {
  const [memoWidth, setMemoWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    setMemoWidth(Math.max(300, Math.min(800, window.innerWidth - e.clientX)));
  };

  return { memoWidth, isResizing, handleMouseDown, handleMouseMove, handleMouseUp };
}
