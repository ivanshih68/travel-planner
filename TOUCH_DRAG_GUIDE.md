# 觸控拖曳功能指南

## 功能概述

Voyager 現已支援**觸控拖曳（Touch Drag and Drop）**功能，讓行動裝置使用者可以順暢地調整行程順序。

### 核心功能

| 功能 | 說明 |
|------|------|
| **Pointer Events** | 同時支援滑鼠、觸控筆、觸摸屏 |
| **拖曳預覽圖** | 拖曳時顯示浮動卡片預覽，視覺反饋清晰 |
| **自動設備檢測** | 自動判斷設備類型，選擇最佳拖曳方式 |
| **觸控優化** | 行動裝置禁用 HTML5 drag-drop，改用 pointer 事件 |
| **平滑動畫** | 拖曳過程中卡片位置實時更新 |
| **自動儲存** | 放開後自動更新 Firebase，無需手動保存 |

---

## 使用方法

### 手機版（iOS / Android）

1. **找到活動卡片** — 在行程詳細頁面，選擇一天後會看到活動時間線
2. **按住卡片** — 長按活動卡片任何位置（不需要特別按握把）
3. **拖曳到新位置** — 向上或向下滑動卡片
4. **放開手指** — 活動順序會自動更新並儲存

### 平板版（iPad / Android Tablet）

- 支援相同的觸控拖曳操作
- 也支援滑鼠拖曳（如連接藍牙滑鼠）

### 視覺提示

- **拖曳中**：卡片跟隨手指移動，顯示浮動預覽
- **懸停目標**：目標卡片周圍出現藍色邊框
- **放開後**：卡片回到原位或新位置，自動儲存

---

## 技術實現

### 核心元件

#### 1. `useTouchDragSort` Hook

```typescript
const { sortedItems, draggingId, dragOverId, isReordering, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave } = useTouchDragSort({
  items: dragSortItems,
  onReorder: async (reorderedItems) => {
    // 更新 Firebase
    await Promise.all(
      reorderedItems.map((item) =>
        updateActivity(item.id, { order: item.order })
      )
    );
  },
  onError: (error) => {
    console.error("Touch drag sort error:", error);
  },
});
```

**Hook 返回值**：
- `sortedItems` — 排序後的項目陣列
- `draggingId` — 正在拖曳的項目 ID
- `dragOverId` — 滑鼠/手指懸停的項目 ID
- `isReordering` — 是否正在更新中
- `handlePointerDown/Move/Up/Leave` — Pointer 事件處理函數

#### 2. 設備檢測

```typescript
const isMobile = useIsMobile();

// 根據設備類型選擇拖曳方式
const dragResult = isMobile ? touchDragResult : desktopDragResult;
```

#### 3. 活動卡片包裝（觸控版）

```tsx
<div
  key={item.id}
  onPointerDown={isMobile ? (e) => handlePointerDown?.(e, item) : undefined}
  onPointerMove={isMobile ? (e) => handlePointerMove?.(e, item) : undefined}
  onPointerUp={isMobile ? (e) => handlePointerUp?.(e, item) : undefined}
  onPointerLeave={isMobile ? handlePointerLeave : undefined}
  className={`transition-all duration-200 ${
    draggingId === item.id ? "opacity-50 scale-95" : ""
  } ${
    dragOverId === item.id
      ? "ring-2 ring-[oklch(0.62_0.12_220)] rounded-xl"
      : ""
  }`}
>
  <ActivityCard {...props} />
</div>
```

---

## Pointer Events vs HTML5 Drag-Drop

### 為什麼使用 Pointer Events？

| 特性 | HTML5 Drag-Drop | Pointer Events |
|------|-----------------|----------------|
| 觸控支援 | ❌ 不支援 | ✅ 原生支援 |
| 滑鼠支援 | ✅ 支援 | ✅ 支援 |
| 觸控筆支援 | ❌ 不支援 | ✅ 支援 |
| 行動裝置 | ❌ 差 | ✅ 優秀 |
| 自訂預覽 | 困難 | 容易 |
| 瀏覽器相容性 | 好 | 好 |

### 實現策略

```typescript
// 桌面版：使用 HTML5 Drag-Drop（更簡潔）
if (!isMobile) {
  return useDragSort({...});
}

// 行動版：使用 Pointer Events（更靈活）
if (isMobile) {
  return useTouchDragSort({...});
}
```

---

## 拖曳預覽圖實現

### 浮動卡片克隆

```typescript
// 在 handlePointerDown 中建立
const clone = element.cloneNode(true) as HTMLDivElement;
clone.style.position = "fixed";
clone.style.pointerEvents = "none";
clone.style.opacity = "0.7";
clone.style.zIndex = "9999";
clone.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.15)";
clone.style.transform = "scale(1.02)";
document.body.appendChild(clone);
```

### 位置更新

```typescript
// 在 handlePointerMove 中實時更新
dragImageRef.current.style.top = `${currentY - dragOffset}px`;
```

### 清理

```typescript
// 在 handlePointerUp 中移除
if (dragImageRef.current) {
  dragImageRef.current.remove();
  dragImageRef.current = null;
}
```

---

## 懸停檢測邏輯

### 中點判定

```typescript
// 檢查手指是否超過卡片中點
const rect = e.currentTarget.getBoundingClientRect();
const itemCenter = rect.top + rect.height / 2;

if (currentY > itemCenter && item.id !== draggingId) {
  setDragOverId(item.id);
} else if (currentY < itemCenter && item.id !== draggingId) {
  setDragOverId(item.id);
}
```

### 交換邏輯

```typescript
if (dragOverId && dragOverId !== draggingId) {
  const draggedIndex = newItems.findIndex((i) => i.id === draggingId);
  const targetIndex = newItems.findIndex((i) => i.id === dragOverId);
  
  // 交換項目
  [newItems[draggedIndex], newItems[targetIndex]] = [
    newItems[targetIndex],
    newItems[draggedIndex],
  ];
}
```

---

## 錯誤處理

### 拖曳失敗時

如果拖曳失敗（例如網路中斷），Hook 會：

1. 捕獲錯誤並調用 `onError` 回調
2. 自動回滾到上一個狀態
3. 顯示 toast 提示：「排序失敗，請稍後再試」

### 常見問題

| 問題 | 原因 | 解決方案 |
|------|------|--------|
| 觸控無法拖曳 | 設備未正確檢測 | 檢查 `useIsMobile()` 返回值 |
| 拖曳卡頓 | 事件處理效能低 | 檢查 `handlePointerMove` 是否過度計算 |
| 預覽圖位置錯誤 | 座標計算錯誤 | 檢查 `dragOffset` 計算 |
| 拖曳後未更新 | Firebase 連接問題 | 檢查 `.env.local` Firebase 設定 |

---

## 效能最佳化

### 1. 防抖 Pointer Move

```typescript
// 可選：使用 requestAnimationFrame 限制更新頻率
let animationFrameId: number;

const handlePointerMove = useCallback((e) => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(() => {
    // 更新邏輯
  });
}, []);
```

### 2. 樂觀更新

```typescript
// 立即更新 UI，然後同步到 Firebase
setSortedItems(reorderedItems);
await onReorder(reorderedItems); // 非同步
```

### 3. 記憶體管理

```typescript
// 確保清理 DOM 節點
if (dragImageRef.current) {
  dragImageRef.current.remove();
  dragImageRef.current = null;
}
```

---

## 瀏覽器相容性

| 瀏覽器 | Pointer Events | 觸控支援 |
|--------|---|---|
| Chrome | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari | ✅ | ✅ |
| Edge | ✅ | ✅ |
| iOS Safari | ✅ | ✅ |
| Android Chrome | ✅ | ✅ |

---

## 未來改進

- [ ] **跨日期拖曳** — 允許將活動拖曳到其他日期
- [ ] **長按菜單** — 長按時顯示快捷菜單（複製、刪除等）
- [ ] **多點觸控** — 支援多個活動同時拖曳
- [ ] **撤銷/重做** — 支援拖曳操作的撤銷
- [ ] **鍵盤快捷鍵** — 使用鍵盤調整順序
- [ ] **觸覺反饋** — 在支援的設備上提供振動反饋

---

## 相關檔案

- `client/src/hooks/useTouchDragSort.ts` — 觸控拖曳 Hook
- `client/src/hooks/useDragSort.ts` — 桌面拖曳 Hook
- `client/src/pages/TripDetail.tsx` — 整合拖曳排序的頁面
- `client/src/lib/firebase.ts` — Firebase 更新操作
- `DRAG_DROP_GUIDE.md` — 桌面拖曳功能文件
