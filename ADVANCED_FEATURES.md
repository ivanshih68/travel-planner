# 進階功能指南

## 概述

Voyager 現已支援三項強大的進階功能，讓您的旅遊規劃更加靈活和便利：

1. **跨日期拖曳** — 在日期間移動活動
2. **行程匯出 PDF** — 生成可列印的旅遊手冊
3. **行程分享連結** — 與朋友分享唯讀行程

---

## 1. 跨日期拖曳功能

### 功能說明

允許您將活動從一天拖曳到另一天，自動更新 `day` 屬性和順序。

### 使用方法

1. **進入行程詳細頁面**
2. **選擇任一天** — 查看該天的活動
3. **按住活動卡片** — 長按或拖曳卡片
4. **拖曳到其他日期區域** — 活動會自動移動到目標日期
5. **放開手指** — 活動順序自動更新並儲存

### 技術實現

#### Hook: `useCrossDayDragSort`

```typescript
const { sortedItems, draggingId, dragOverDay, isReordering, handleDragStart, handleDragOverDay, handleDragLeaveDay, handleDropOnDay, handleDragEnd } = useCrossDayDragSort({
  items: allActivitiesWithDayInfo,
  totalDays: dayCount,
  onReorder: async (reorderedItems) => {
    // 更新 Firebase
    await Promise.all(
      reorderedItems.map((item) =>
        updateActivity(item.id, { day: item.day, order: item.order })
      )
    );
  },
});
```

#### 關鍵邏輯

```typescript
// 檢測目標日期
const handleDropOnDay = useCallback(
  async (e: React.DragEvent, targetDay: number) => {
    const draggedItem = sortedItems.find((item) => item.id === draggingId);
    
    // 更新 day 屬性
    const newItems = sortedItems.map((item) => {
      if (item.id === draggingId) {
        return { ...item, day: targetDay, order: 0 };
      }
      return item;
    });
    
    // 重新計算順序
    const targetDayItems = newItems
      .filter((item) => item.day === targetDay)
      .sort((a, b) => a.order - b.order);
    
    // 更新所有項目的順序
    const reorderedItems = newItems.map((item) => {
      if (item.day === targetDay) {
        const index = targetDayItems.findIndex((i) => i.id === item.id);
        return { ...item, order: index };
      }
      return item;
    });
    
    // 儲存到 Firebase
    await onReorder(reorderedItems);
  },
  [draggingId, sortedItems, onReorder]
);
```

### 視覺反饋

- **拖曳中** — 卡片透明度降低，顯示浮動預覽
- **懸停日期** — 目標日期區域顯示藍色邊框
- **放開後** — 活動立即更新位置並儲存

### 錯誤處理

如果拖曳失敗（例如網路中斷）：
1. Hook 會捕獲錯誤並調用 `onError` 回調
2. 自動回滾到上一個狀態
3. 顯示 toast 提示：「排序失敗，請稍後再試」

---

## 2. 行程匯出 PDF 功能

### 功能說明

將整趟行程的每日安排匯出成一份精美、可列印的 PDF 旅遊手冊。

### 使用方法

1. **進入行程詳細頁面**
2. **點擊「匯出 PDF」按鈕** — 位於頁面頂部
3. **等待生成** — 系統會自動生成 PDF
4. **自動下載** — PDF 檔案會自動下載到您的裝置

### PDF 內容

| 部分 | 內容 |
|------|------|
| **封面** | 行程標題、目的地、日期、預算 |
| **每日頁面** | 按日期組織，包含所有活動、時間、地點、費用 |
| **活動卡片** | 標題、分類、時間、地點、地址、時長、費用、備註 |
| **摘要頁面** | 總活動數、總費用、行程統計 |

### 技術實現

#### 函數: `exportTripToPdf`

```typescript
import { exportTripToPdf } from "@/lib/exportPdf";

// 使用
const handleExport = async () => {
  try {
    await exportTripToPdf(trip, activitiesByDay);
    toast.success("行程已匯出為 PDF");
  } catch (error) {
    toast.error("匯出 PDF 失敗");
  }
};
```

#### 核心步驟

1. **建立臨時容器** — 用於 HTML 渲染
2. **生成 HTML 內容** — 按日期組織活動
3. **轉換為 Canvas** — 使用 `html2canvas`
4. **生成 PDF** — 使用 `jsPDF`
5. **自動下載** — 檔案名格式：`{行程標題}-{日期}.pdf`

#### 依賴庫

```json
{
  "dependencies": {
    "jspdf": "^4.2.1",
    "html2canvas": "^1.4.1"
  }
}
```

### 自訂樣式

PDF 使用內聯 CSS，主要顏色和樣式：

```css
/* 標題 */
h1 { color: #0891b2; font-size: 36px; }
h2 { color: #0891b2; border-bottom: 2px solid #0891b2; }

/* 活動卡片 */
.activity { 
  background-color: #f9fafb;
  border-left: 4px solid #0891b2;
}

/* 分類標籤 */
.category { background-color: #dbeafe; color: #0c4a6e; }
```

### 列印提示

1. **紙張設定** — 建議使用 A4 紙張
2. **邊距** — 系統已預設 40px 邊距
3. **顏色** — 建議開啟彩色列印以顯示完整效果
4. **頁面方向** — 縱向（Portrait）

---

## 3. 行程分享連結功能

### 功能說明

生成唯讀分享連結，讓朋友無需登入即可檢視您的行程。

### 使用方法

#### 建立分享連結

1. **進入行程詳細頁面**
2. **點擊「分享」按鈕** — 位於頁面頂部
3. **分享連結已複製** — 系統會自動複製連結到剪貼板
4. **分享給朋友** — 貼上連結並分享

#### 檢視分享行程

1. **朋友收到分享連結**
2. **點擊連結** — 開啟分享頁面
3. **查看行程** — 無需登入即可檢視所有活動
4. **查看地圖** — 每個活動都有地圖預覽（如有地址）

### 分享頁面功能

| 功能 | 說明 |
|------|------|
| **日期選擇器** | 選擇不同日期查看活動 |
| **活動時間線** | 按順序顯示該日所有活動 |
| **活動詳情** | 顯示時間、地點、費用、備註 |
| **地圖預覽** | 每個活動的靜態地圖 |
| **統計摘要** | 該日和全程的活動數、費用統計 |

### 技術實現

#### 分享連結管理

```typescript
import { 
  createShareLink, 
  getShareLinkByToken, 
  copyShareUrlToClipboard,
  deactivateShareLink,
  deleteShareLink 
} from "@/lib/shareTrip";

// 建立分享連結
const shareLink = await createShareLink(tripId, userId, expirationDays);

// 複製到剪貼板
await copyShareUrlToClipboard(shareLink.shareToken);

// 停用分享連結
await deactivateShareLink(linkId);

// 刪除分享連結
await deleteShareLink(linkId);
```

#### ShareLink 資料結構

```typescript
interface ShareLink {
  id: string;                    // 唯一識別符
  tripId: string;               // 行程 ID
  shareToken: string;           // 分享令牌（用於 URL）
  createdAt: Date;              // 建立時間
  expiresAt: Date | null;       // 過期時間（可選）
  createdBy: string;            // 建立者 UID
  isActive: boolean;            // 是否有效
}
```

#### 分享 URL 格式

```
https://voyager.example.com/share/{shareToken}
```

### 安全性

#### 存取控制

- **驗證令牌** — 每次訪問都會驗證 `shareToken`
- **檢查過期** — 自動檢查連結是否已過期
- **唯讀存取** — 分享頁面只允許查看，不允許編輯
- **停用連結** — 可隨時停用分享連結

#### 隱私保護

```typescript
// 檢查連結有效性
const shareLink = await getShareLinkByToken(shareToken);
if (!shareLink) {
  return "分享連結已過期或無效";
}

// 檢查過期時間
if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
  await deactivateShareLink(shareLink.id);
  return "分享連結已過期";
}
```

### Firestore 集合結構

```
firestore/
├── shareLinks/
│   └── {linkId}
│       ├── id: string
│       ├── tripId: string
│       ├── shareToken: string
│       ├── createdAt: Timestamp
│       ├── expiresAt: Timestamp | null
│       ├── createdBy: string
│       └── isActive: boolean
```

### 分享選項

#### 無期限分享

```typescript
const shareLink = await createShareLink(tripId, userId);
// expiresAt = null（永不過期）
```

#### 7 天有效期

```typescript
const shareLink = await createShareLink(tripId, userId, 7);
// expiresAt = now + 7 days
```

#### 30 天有效期

```typescript
const shareLink = await createShareLink(tripId, userId, 30);
// expiresAt = now + 30 days
```

---

## 整合示例

### 完整的行程管理流程

```typescript
// 1. 建立行程
const tripId = await createTrip({
  title: "日本東京之旅",
  destination: "東京",
  startDate: "2026-07-01",
  endDate: "2026-07-07",
  budget: 50000,
  currency: "JPY",
});

// 2. 新增活動
const activityId = await createActivity({
  tripId,
  userId,
  day: 1,
  title: "淺草寺參拜",
  category: "attraction",
  location: "淺草寺",
  time: "09:00",
  cost: 0,
});

// 3. 調整活動順序（拖曳排序）
await updateActivity(activityId, { order: 0 });

// 4. 跨日期移動活動
await updateActivity(activityId, { day: 2, order: 0 });

// 5. 匯出為 PDF
await exportTripToPdf(trip, activitiesByDay);

// 6. 生成分享連結
const shareLink = await createShareLink(tripId, userId, 7);
const shareUrl = generateShareUrl(shareLink.shareToken);

// 7. 複製分享連結
await copyShareUrlToClipboard(shareLink.shareToken);

// 8. 停用分享（需要時）
await deactivateShareLink(shareLink.id);
```

---

## 常見問題

### Q: 跨日期拖曳時，活動的順序如何重新計算？

**A:** 系統會自動重新計算目標日期的所有活動順序。被拖曳的活動會被放在目標日期的最上方（order = 0），其他活動的順序會自動遞增。

### Q: PDF 匯出時，是否包含地圖？

**A:** 目前 PDF 不包含互動地圖，但包含所有活動的地址和座標信息。您可以在列印後手動查閱地圖或使用 Google Maps。

### Q: 分享連結可以設定密碼保護嗎？

**A:** 目前不支援密碼保護，但可以設定過期時間。建議只分享給信任的朋友。

### Q: 分享連結過期後，朋友還能看到行程嗎？

**A:** 不能。過期後，系統會自動停用連結，朋友會看到「分享連結已過期或無效」的提示。

### Q: 可以有多個分享連結嗎？

**A:** 可以。您可以為同一個行程建立多個分享連結，每個連結都有獨立的過期時間和有效狀態。

### Q: 如何撤銷分享？

**A:** 進入行程詳細頁面，點擊「分享」按鈕旁的選項，選擇「停用分享連結」即可。已分享的連結會立即失效。

---

## 相關檔案

- `client/src/hooks/useCrossDayDragSort.ts` — 跨日期拖曳 Hook
- `client/src/lib/exportPdf.ts` — PDF 匯出工具
- `client/src/lib/shareTrip.ts` — 分享連結管理
- `client/src/pages/SharedTrip.tsx` — 分享頁面元件
- `client/src/pages/TripDetail.tsx` — 行程詳細頁面（整合所有功能）

---

## 未來改進

- [ ] **PDF 自訂** — 允許使用者選擇要包含的內容
- [ ] **分享統計** — 追蹤分享連結的訪問次數
- [ ] **密碼保護** — 為分享連結添加密碼保護
- [ ] **協作編輯** — 允許多人共同編輯行程
- [ ] **版本歷史** — 保存行程的修改歷史
- [ ] **離線模式** — 支援離線檢視分享行程
