# 拖曳排序功能指南

## 功能概述

Voyager 現已支援**拖曳排序（Drag and Drop）**功能，讓您可以直觀地調整每天的活動順序。

### 核心功能

| 功能 | 說明 |
|------|------|
| **拖曳握把** | 每個活動卡片左側顯示 ≡ 握把圖標 |
| **視覺反饋** | 拖曳時卡片變透明，懸停時顯示藍色邊框 |
| **平滑動畫** | 使用 Framer Motion 實現流暢的過渡效果 |
| **自動儲存** | 放開後自動更新 Firebase，無需手動保存 |
| **即時同步** | 其他裝置會立即看到更新的順序 |

---

## 使用方法

### 桌面版

1. **找到活動卡片** — 在行程詳細頁面，選擇一天後會看到活動時間線
2. **按住握把** — 點擊卡片左側的 ≡ 圖標
3. **拖曳到新位置** — 將卡片拖到目標位置
4. **放開滑鼠** — 活動順序會自動更新並儲存

### 視覺提示

- **握把圖標**：灰色，懸停時變深藍色
- **拖曳中**：卡片變透明（opacity: 50%）且縮小（scale: 95%）
- **懸停目標**：目標卡片周圍出現藍色邊框（ring）

---

## 技術實現

### 核心元件

#### 1. `useDragSort` Hook

```typescript
const { sortedItems, draggingId, dragOverId, isReordering, handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd } = useDragSort({
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
    console.error("Drag sort error:", error);
  },
});
```

**Hook 返回值**：
- `sortedItems` — 排序後的項目陣列
- `draggingId` — 正在拖曳的項目 ID
- `dragOverId` — 滑鼠懸停的項目 ID
- `isReordering` — 是否正在更新中
- `handleDragStart/Over/Leave/Drop/End` — 拖曳事件處理函數

#### 2. 活動卡片包裝

```tsx
<div
  key={item.id}
  draggable
  onDragStart={(e) => handleDragStart(e as any, item, el)}
  onDragOver={(e) => handleDragOver(e as any, item)}
  onDragLeave={handleDragLeave}
  onDrop={(e) => handleDrop(e as any, item)}
  onDragEnd={handleDragEnd}
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

#### 3. 握把圖標

```tsx
<div className="mt-1 cursor-grab active:cursor-grabbing text-[oklch(0.65_0.05_220)] hover:text-[oklch(0.55_0.05_220)] transition-colors flex-shrink-0">
  <GripVertical className="w-4 h-4" />
</div>
```

---

## 資料流程

### 1. 初始化

```
useActivities(tripId)
  ↓
currentDayActivities
  ↓
dragSortItems (轉換為 DragItem<Activity>[])
  ↓
useDragSort()
```

### 2. 拖曳時

```
handleDragStart
  ↓ (記錄源項目)
handleDragOver (多次)
  ↓ (更新 dragOverId)
handleDrop
  ↓ (計算新順序)
onReorder 回調
  ↓ (更新 Firebase)
sortedItems 更新
  ↓ (UI 重新渲染)
```

### 3. 完成後

```
Firebase 更新 activity.order
  ↓
Firestore 訂閱觸發
  ↓
useActivities 更新
  ↓
currentDayActivities 重新排序
  ↓
UI 同步
```

---

## 錯誤處理

### 拖曳失敗時

如果拖曳失敗（例如網路中斷），Hook 會：

1. 捕獲錯誤並調用 `onError` 回調
2. 自動回滾到上一個狀態（`setSortedItems(items)`）
3. 顯示 toast 提示：「排序失敗，請稍後再試」

### 常見問題

| 問題 | 原因 | 解決方案 |
|------|------|--------|
| 無法拖曳 | 活動卡片未設定 `draggable` | 檢查包裝 div 是否有 `draggable` 屬性 |
| 拖曳後未更新 | Firebase 未正確連接 | 檢查 `.env.local` 中的 Firebase 設定 |
| 順序不正確 | `order` 屬性未正確更新 | 確認 `onReorder` 回調中的 `updateActivity` 呼叫 |
| 拖曳卡頓 | 動畫性能問題 | 檢查瀏覽器是否支援 CSS `transform` 和 `opacity` |

---

## 進階自訂

### 修改拖曳視覺效果

編輯 `TripDetail.tsx` 中的 className：

```tsx
// 修改拖曳時的透明度
draggingId === item.id ? "opacity-50 scale-95" : ""

// 修改懸停時的邊框顏色
dragOverId === item.id
  ? "ring-2 ring-[oklch(0.62_0.12_220)] rounded-xl"
  : ""
```

### 修改握把圖標樣式

編輯 `ActivityCard` 中的握把 div：

```tsx
<div className="mt-1 cursor-grab active:cursor-grabbing text-[oklch(0.65_0.05_220)] hover:text-[oklch(0.55_0.05_220)] transition-colors flex-shrink-0">
  <GripVertical className="w-4 h-4" />
</div>
```

### 禁用拖曳排序

如果需要暫時禁用拖曳，修改包裝 div：

```tsx
<div
  draggable={false}  // 禁用拖曳
  // ... 其他屬性
>
```

---

## 效能考量

### 優化建議

1. **批量更新** — 如果有多個活動，考慮使用 Firestore 批量寫入
2. **防抖** — 可在 `onReorder` 中加入防抖以避免頻繁更新
3. **樂觀更新** — 目前已實現樂觀更新（立即更新 UI）

### 性能指標

- **拖曳響應時間** — < 16ms（60fps）
- **Firebase 更新延遲** — 通常 < 500ms
- **UI 重新渲染** — 使用 React.memo 優化

---

## 相關檔案

- `client/src/hooks/useDragSort.ts` — 拖曳排序 Hook
- `client/src/pages/TripDetail.tsx` — 整合拖曳排序的頁面
- `client/src/lib/firebase.ts` — Firebase 更新操作

---

## 未來改進

- [ ] **觸控支援** — 在行動裝置上支援觸控拖曳
- [ ] **跨日期拖曳** — 允許將活動拖曳到其他日期
- [ ] **拖曳預覽** — 顯示拖曳時的自訂預覽圖像
- [ ] **撤銷/重做** — 支援拖曳操作的撤銷
- [ ] **鍵盤快捷鍵** — 使用鍵盤調整順序
