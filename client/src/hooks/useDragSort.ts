/**
 * useDragSort — Drag and drop reordering hook (Desktop HTML5 drag API)
 * Design: Coastal Morning theme
 *
 * Fix: useEffect now deep-compares items before calling setSortedItems,
 * preventing infinite loops when parent re-renders with structurally
 * identical (but referentially new) arrays.
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

  // Stable refs for callbacks — avoids re-creating handlers on every render
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
      return prev; // same content → keep reference, no re-render
    });
  }, [items]);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, item: DragItem<T>, element: HTMLElement) => {
      setDraggingId(item.id);
      dragSourceRef.current = item;

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

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetItem: DragItem<T>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverId(targetItem.id);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

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

      // Use functional update to read latest sortedItems without adding it as dep
      setSortedItems((prevItems) => {
        const sourceIndex = prevItems.findIndex((i) => i.id === dragSourceRef.current!.id);
        const targetIndex = prevItems.findIndex((i) => i.id === targetItem.id);

        if (sourceIndex === -1 || targetIndex === -1) return prevItems;

        const newItems = [...prevItems];
        const [movedItem] = newItems.splice(sourceIndex, 1);
        newItems.splice(targetIndex, 0, movedItem);

        const reorderedItems = newItems.map((item, index) => ({ ...item, order: index }));

        // Persist asynchronously using stable ref
        onReorderRef.current(reorderedItems)
          .catch((error) => {
            const err = error instanceof Error ? error : new Error("Reorder failed");
            onErrorRef.current?.(err);
            // Revert on error
            setSortedItems(prevItems);
          })
          .finally(() => {
            setIsReordering(false);
            setDraggingId(null);
            setDragOverId(null);
          });

        return reorderedItems;
      });
    },
    [] // no external deps — reads everything via refs or functional updates
  );

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
