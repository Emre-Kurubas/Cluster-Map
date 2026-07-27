import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export interface Size { width: number; height: number }

/**
 * An element's pixel size, kept current as it resizes.
 *
 * The focus view's connector needs it to decide whether the pin it points at is
 * still on screen — a question that has no answer without knowing how big the
 * container is.
 */
export function useContainerSize(ref: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
