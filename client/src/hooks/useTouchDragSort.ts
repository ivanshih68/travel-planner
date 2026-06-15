/**
 * useTouchDragSort — Touch-enabled drag-and-drop sorting hook
 * Supports both pointer events (desktop + touch) and fallback to mouse events
 * Handles visual feedback, animation, and reordering logic
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
  const [touchState, setTouchState] = useState<TouchState | null>(null);
  const [dragImage, setDragImage] = useState<HTMLElement | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const draggingItemRef = useRef<DragItem<T> | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  // Sync items when props change - only update if items actually changed
  useEffect(() => {
    // Check if items reference changed (not just content)
    // This prevents unnecessary updates when the same items are passed
    setSortedItems((prev) => {
      // If lengths differ, definitely update
      if (prev.length !== items.length) return items;
      // If any id changed, update
      for (let i = 0; i < items.length; i++) {
        if (prev[i]?.id !== items[i]?.id || prev[i]?.order !== items[i]?.order) {
          return items;
        }
      }
      // Otherwise keep previous state to avoid unnecessary renders
      return prev;
    });
  }, [items]);

  /**
   * Handle pointer/touch start
   */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, item: DragItem<T>) => {
      // Only handle left mouse button or touch
      if (e.button !== undefined && e.button !== 0) return;

      e.preventDefault();
      setDraggingId(item.id);
      draggingItemRef.current = item;

      const element = e.currentTarget as HTMLElement;
      containerRef.current = element;

      // Get initial position
      const rect = element.getBoundingClientRect();
      const startY = e.clientY || (e as any).touches?.[0]?.clientY || 0;

      setTouchState({
        startY,
        currentY: startY,
        offsetY: 0,
      });

      // Create drag image for visual feedback
      const clone = element.cloneNode(true) as HTMLDivElement;
      clone.style.position = "fixed";
      clone.style.pointerEvents = "none";
      clone.style.opacity = "0.7";
      clone.style.zIndex = "9999";
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${startY}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.15)";
      clone.style.transform = "scale(1.02)";
      document.body.appendChild(clone);
      dragImageRef.current = clone;
      setDragImage(clone);

      // Set drag offset for smooth dragging
      setDragOffset(startY - rect.top);
    },
    []
  );

  /**
   * Handle pointer/touch move
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, item: DragItem<T>) => {
      if (!draggingId || !touchState || !dragImageRef.current) return;

      e.preventDefault();

      const currentY = e.clientY || (e as any).touches?.[0]?.clientY || 0;
      const offsetY = currentY - touchState.startY;

      setTouchState((prev) =>
        prev ? { ...prev, currentY, offsetY } : null
      );

      // Update drag image position
      dragImageRef.current.style.top = `${currentY - dragOffset}px`;

      // Check if hovering over another item
      const rect = e.currentTarget.getBoundingClientRect();
      const itemCenter = rect.top + rect.height / 2;

      if (currentY > itemCenter && item.id !== draggingId) {
        setDragOverId(item.id);
      } else if (currentY < itemCenter && item.id !== draggingId) {
        setDragOverId(item.id);
      }
    },
    [draggingId, touchState, dragOffset]
  );

  /**
   * Handle pointer/touch end
   */
  const handlePointerUp = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>, item: DragItem<T>) => {
      if (!draggingId || !touchState) return;

      e.preventDefault();

      // Clean up drag image
      if (dragImageRef.current) {
        dragImageRef.current.remove();
        dragImageRef.current = null;
      }

      setDragImage(null);
      setDragOverId(null);

      if (dragOverId && dragOverId !== draggingId) {
        // Use functional update to avoid dependency on sortedItems
        setSortedItems((prevItems) => {
          const newItems = [...prevItems];
          const draggedIndex = newItems.findIndex((i) => i.id === draggingId);
          const targetIndex = newItems.findIndex((i) => i.id === dragOverId);

          if (draggedIndex !== -1 && targetIndex !== -1) {
            // Swap items
            [newItems[draggedIndex], newItems[targetIndex]] = [
              newItems[targetIndex],
              newItems[draggedIndex],
            ];

            // Recalculate order
            const reorderedItems = newItems.map((item, idx) => ({
              ...item,
              order: idx,
            }));

            // Persist to Firebase
            setIsReordering(true);
            onReorder(reorderedItems)
              .catch((error) => {
                // Rollback on error
                setSortedItems(prevItems);
                if (onError) {
                  onError(
                    error instanceof Error
                      ? error
                      : new Error("Failed to reorder items")
                  );
                }
              })
              .finally(() => {
                setIsReordering(false);
              });

            return reorderedItems;
          }
          return newItems;
        });
      }

      setDraggingId(null);
      draggingItemRef.current = null;
      setTouchState(null);
    },
    [draggingId, dragOverId, touchState, onReorder, onError]
  );

  /**
   * Handle pointer leave (cancel drag)
   */
  const handlePointerLeave = useCallback(() => {
    if (!draggingId) return;

    // Clean up drag image
    if (dragImageRef.current) {
      dragImageRef.current.remove();
      dragImageRef.current = null;
    }

    setDragImage(null);
    setDragOverId(null);
    setDraggingId(null);
    draggingItemRef.current = null;
    setTouchState(null);
  }, [draggingId]);

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
