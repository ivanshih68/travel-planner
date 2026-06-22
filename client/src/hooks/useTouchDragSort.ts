/**
 * useTouchDragSort — Touch-enabled drag-and-drop sorting hook
 * Supports Pointer Events (desktop + touch)
 *
 * Fix: onReorder/onError stored in refs so they never appear in dependency
 * arrays; useEffect syncs items with deep comparison to avoid infinite loops.
 */

import { useState, useRef, useCallback, useEffect } from "react";

export interface DragItem<T> {
  id: string;
  data: T;
  order: number;
}

interface UseTouchDragSortProps<T> {
  items: DragItem<T>[];
  onReorder: (reorderedItems: DragItem<T>[]) => Promise<void>;
  onError?: (error: Error) => void;
}

interface TouchState {
  startY: number;
  currentY: number;
  offsetY: number;
}

export function useTouchDragSort<T>({
  items,
  onReorder,
  onError,
}: UseTouchDragSortProps<T>) {
  const [sortedItems, setSortedItems] = useState<DragItem<T>[]>(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const touchStateRef = useRef<TouchState | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef(0);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  // Stable refs for callbacks — prevents them from appearing in dep arrays
  const onReorderRef = useRef(onReorder);
  const onErrorRef = useRef(onError);
  useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Sync items only when content actually changes (deep compare by id+order)
  useEffect(() => {
    setSortedItems((prev) => {
      if (prev.length !== items.length) return items;
      for (let i = 0; i < items.length; i++) {
        if (prev[i]?.id !== items[i]?.id || prev[i]?.order !== items[i]?.order) {
          return items;
        }
      }
      return prev; // identical content → no state update
    });
  }, [items]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, item: DragItem<T>) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();

      const element = e.currentTarget as HTMLElement;
      const rect = element.getBoundingClientRect();
      const startY = e.clientY;

      draggingIdRef.current = item.id;
      setDraggingId(item.id);

      touchStateRef.current = { startY, currentY: startY, offsetY: 0 };
      dragOffsetRef.current = startY - rect.top;

      // Create floating drag clone
      const clone = element.cloneNode(true) as HTMLDivElement;
      clone.style.position = "fixed";
      clone.style.pointerEvents = "none";
      clone.style.opacity = "0.75";
      clone.style.zIndex = "9999";
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${startY - dragOffsetRef.current}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
      clone.style.transform = "scale(1.02)";
      document.body.appendChild(clone);
      dragImageRef.current = clone;
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, item: DragItem<T>) => {
      if (!draggingIdRef.current || !touchStateRef.current || !dragImageRef.current) return;
      e.preventDefault();

      const currentY = e.clientY;
      touchStateRef.current = {
        ...touchStateRef.current,
        currentY,
        offsetY: currentY - touchStateRef.current.startY,
      };

      // Move the floating clone
      dragImageRef.current.style.top = `${currentY - dragOffsetRef.current}px`;

      // Determine which item we're hovering over
      if (item.id !== draggingIdRef.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        if (Math.abs(currentY - itemCenter) < rect.height / 2) {
          dragOverIdRef.current = item.id;
          setDragOverId(item.id);
        }
      }
    },
    []
  );

  const handlePointerUp = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingIdRef.current) return;
      e.preventDefault();

      // Clean up clone
      if (dragImageRef.current) {
        dragImageRef.current.remove();
        dragImageRef.current = null;
      }

      const currentDraggingId = draggingIdRef.current;
      const currentDragOverId = dragOverIdRef.current;

      // Reset refs before async work
      draggingIdRef.current = null;
      dragOverIdRef.current = null;
      touchStateRef.current = null;
      setDraggingId(null);
      setDragOverId(null);

      if (currentDragOverId && currentDragOverId !== currentDraggingId) {
        setIsReordering(true);

        setSortedItems((prevItems) => {
          const draggedIndex = prevItems.findIndex((i) => i.id === currentDraggingId);
          const targetIndex = prevItems.findIndex((i) => i.id === currentDragOverId);

          if (draggedIndex === -1 || targetIndex === -1) return prevItems;

          const newItems = [...prevItems];
          const [movedItem] = newItems.splice(draggedIndex, 1);
          newItems.splice(targetIndex, 0, movedItem);

          const reorderedItems = newItems.map((item, idx) => ({ ...item, order: idx }));

          // Persist via stable ref — no closure over sortedItems
          onReorderRef.current(reorderedItems)
            .catch((error) => {
              const err = error instanceof Error ? error : new Error("Reorder failed");
              onErrorRef.current?.(err);
              setSortedItems(prevItems); // rollback
            })
            .finally(() => setIsReordering(false));

          return reorderedItems;
        });
      }
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    if (!draggingIdRef.current) return;

    if (dragImageRef.current) {
      dragImageRef.current.remove();
      dragImageRef.current = null;
    }

    draggingIdRef.current = null;
    dragOverIdRef.current = null;
    touchStateRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  return {
    sortedItems,
    draggingId,
    dragOverId,
    isReordering,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  };
}
