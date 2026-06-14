/**
 * useCrossDayDragSort — Cross-day drag-and-drop sorting hook
 * Allows dragging activities between different days
 * Automatically updates the day property
 */

import { useState, useCallback, useEffect } from "react";

export interface CrossDayDragItem<T> {
  id: string;
  data: T;
  day: number;
  order: number;
}

interface UseCrossDayDragSortProps<T> {
  items: CrossDayDragItem<T>[];
  totalDays: number;
  onReorder: (reorderedItems: CrossDayDragItem<T>[]) => Promise<void>;
  onError?: (error: Error) => void;
}

export function useCrossDayDragSort<T>({
  items,
  totalDays,
  onReorder,
  onError,
}: UseCrossDayDragSortProps<T>) {
  const [sortedItems, setSortedItems] = useState<CrossDayDragItem<T>[]>(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Sync items when props change
  useEffect(() => {
    setSortedItems(items);
  }, [items]);

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, item: CrossDayDragItem<T>) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/json", JSON.stringify(item));
      setDraggingId(item.id);
    },
    []
  );

  /**
   * Handle drag over day
   */
  const handleDragOverDay = useCallback(
    (e: React.DragEvent<HTMLDivElement>, day: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverDay(day);
    },
    []
  );

  /**
   * Handle drag leave
   */
  const handleDragLeaveDay = useCallback(() => {
    setDragOverDay(null);
  }, []);

  /**
   * Handle drop on day
   */
  const handleDropOnDay = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, targetDay: number) => {
      e.preventDefault();

      if (!draggingId || targetDay < 1 || targetDay > totalDays) {
        setDragOverDay(null);
        return;
      }

      try {
        const draggedItem = sortedItems.find((item) => item.id === draggingId);
        if (!draggedItem) return;

        // If dragging to the same day, do nothing
        if (draggedItem.day === targetDay) {
          setDragOverDay(null);
          return;
        }

        // Create new items array with updated day
        const newItems = sortedItems.map((item) => {
          if (item.id === draggingId) {
            return {
              ...item,
              day: targetDay,
              order: 0, // Reset order to top of target day
            };
          }
          return item;
        });

        // Recalculate order for target day
        const targetDayItems = newItems
          .filter((item) => item.day === targetDay)
          .sort((a, b) => a.order - b.order);

        const reorderedItems = newItems.map((item) => {
          if (item.day === targetDay) {
            const index = targetDayItems.findIndex((i) => i.id === item.id);
            return { ...item, order: index };
          }
          return item;
        });

        setSortedItems(reorderedItems);

        // Persist to Firebase
        setIsReordering(true);
        try {
          await onReorder(reorderedItems);
        } catch (error) {
          // Rollback on error
          setSortedItems(sortedItems);
          if (onError) {
            onError(
              error instanceof Error
                ? error
                : new Error("Failed to move activity to another day")
            );
          }
        } finally {
          setIsReordering(false);
        }
      } finally {
        setDraggingId(null);
        setDragOverDay(null);
      }
    },
    [draggingId, sortedItems, totalDays, onReorder, onError]
  );

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverDay(null);
  }, []);

  return {
    sortedItems,
    draggingId,
    dragOverDay,
    isReordering,
    handleDragStart,
    handleDragOverDay,
    handleDragLeaveDay,
    handleDropOnDay,
    handleDragEnd,
  };
}
