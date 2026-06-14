/**
 * useDragSort — Drag and drop reordering hook
 * Design: Coastal Morning theme
 * 
 * Features:
 * - Smooth drag animations
 * - Visual feedback during drag
 * - Automatic order persistence
 * - Mobile and desktop support
 */

import { useState, useCallback, useRef, useEffect } from "react";

export interface DragItem<T> {
  id: string;
  data: T;
  order: number;
}

export interface UseDragSortOptions<T> {
  items: DragItem<T>[];
  onReorder: (items: DragItem<T>[]) => Promise<void>;
  onError?: (error: Error) => void;
}

export const useDragSort = <T,>({
  items,
  onReorder,
  onError,
}: UseDragSortOptions<T>) => {
  const [sortedItems, setSortedItems] = useState<DragItem<T>[]>(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const dragSourceRef = useRef<DragItem<T> | null>(null);
  const dragImageRef = useRef<HTMLElement | null>(null);

  // Update sorted items when input items change
  useEffect(() => {
    setSortedItems(items);
  }, [items]);

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, item: DragItem<T>, element: HTMLElement) => {
      setDraggingId(item.id);
      dragSourceRef.current = item;

      // Create custom drag image
      const dragImage = element.cloneNode(true) as HTMLElement;
      dragImage.style.position = "absolute";
      dragImage.style.top = "-9999px";
      dragImage.style.opacity = "0.7";
      document.body.appendChild(dragImage);
      dragImageRef.current = dragImage;

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setDragImage(dragImage, 0, 0);
    },
    []
  );

  // Handle drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetItem: DragItem<T>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverId(targetItem.id);
    },
    []
  );

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, targetItem: DragItem<T>) => {
      e.preventDefault();
      e.stopPropagation();

      if (!dragSourceRef.current || dragSourceRef.current.id === targetItem.id) {
        setDraggingId(null);
        setDragOverId(null);
        return;
      }

      setIsReordering(true);

      try {
        // Find indices
        const sourceIndex = sortedItems.findIndex((item) => item.id === dragSourceRef.current!.id);
        const targetIndex = sortedItems.findIndex((item) => item.id === targetItem.id);

        if (sourceIndex === -1 || targetIndex === -1) {
          throw new Error("Item not found");
        }

        // Create new sorted array
        const newItems = [...sortedItems];
        const [movedItem] = newItems.splice(sourceIndex, 1);
        newItems.splice(targetIndex, 0, movedItem);

        // Update order property
        const reorderedItems = newItems.map((item, index) => ({
          ...item,
          order: index,
        }));

        setSortedItems(reorderedItems);

        // Persist to backend
        await onReorder(reorderedItems);
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Reorder failed");
        onError?.(err);
        // Revert on error
        setSortedItems(items);
      } finally {
        setIsReordering(false);
        setDraggingId(null);
        setDragOverId(null);
      }
    },
    [sortedItems, items, onReorder, onError]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (dragImageRef.current) {
      document.body.removeChild(dragImageRef.current);
      dragImageRef.current = null;
    }
    setDraggingId(null);
    setDragOverId(null);
    dragSourceRef.current = null;
  }, []);

  return {
    sortedItems,
    draggingId,
    dragOverId,
    isReordering,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
};
