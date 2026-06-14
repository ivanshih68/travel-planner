# Google Maps 整合指南

## 功能概述

Voyager 已整合 Google Maps，提供以下功能：

1. **地點搜尋** — 在編輯活動時搜尋景點、餐廳、住宿
2. **自動完成** — 即時顯示搜尋建議
3. **地圖預覽** — 在活動卡片中顯示地圖位置
4. **導航連結** — 點擊直接開啟 Google Maps 導航

---

## 設定步驟

### 1. 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立新專案（或選擇現有專案）
3. 啟用以下 API：
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**

### 2. 建立 API 金鑰

1. 在 Google Cloud Console，進入「API 和服務」> 「憑證」
2. 點擊「建立憑證」> 選擇「API 金鑰」
3. 複製生成的 API 金鑰

### 3. 限制 API 金鑰（安全性）

**強烈建議**在正式部署前限制 API 金鑰：

1. 在「憑證」頁面，點擊剛建立的 API 金鑰
2. 在「應用程式限制」中，選擇「HTTP 轉介者」
3. 新增允許的網域：
   - 本地開發：`localhost:3000`
   - Vercel 部署：`your-app.vercel.app`
   - 自訂網域（如適用）

4. 在「API 限制」中，選擇「限制金鑰」，只啟用：
   - Maps JavaScript API
   - Places API
   - Geocoding API

### 4. 設定環境變數

在 `.env.local` 檔案中加入：

```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

在 `client/index.html` 中，Google Maps 會自動載入（已在模板中設定）。

### 5. Vercel 部署

1. 在 Vercel Dashboard 中，進入專案設定
2. 在「Environment Variables」中新增：
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
3. 部署後，確保 Vercel 網域已在 Google Cloud 的允許清單中

---

## 功能詳解

### 地點搜尋元件 (`PlaceSearch`)

在編輯活動時，使用「地點搜尋」欄位：

- 輸入景點、餐廳或地址名稱
- 系統會顯示 Google Places 的自動完成建議
- 選擇一個地點後，會自動填入：
  - 地點名稱
  - 完整地址
  - 座標（緯度/經度）

### 地圖預覽元件 (`MapPreview`)

在活動卡片中展開詳情時，會顯示：

- **靜態地圖圖像** — 顯示活動位置
- **座標** — 以 DM Mono 字體顯示精確座標
- **導航按鈕** — 點擊在 Google Maps 中開啟導航

### 導航 URL

所有地址都支援點擊導航：

```
https://www.google.com/maps/search/{location}/@{lat},{lng},15z
```

---

## 故障排除

### 「Google Maps API 未載入」

**原因**：API 金鑰未設定或無效

**解決方案**：
1. 確認 `VITE_GOOGLE_MAPS_API_KEY` 已在環境變數中設定
2. 檢查 API 金鑰是否有效（在 Google Cloud Console 中驗證）
3. 確認已啟用 Maps JavaScript API、Places API 和 Geocoding API

### 搜尋結果為空

**原因**：
- API 金鑰限制太嚴格
- 地點不在允許的國家/地區內

**解決方案**：
1. 檢查 API 金鑰的應用程式限制
2. 在 `useGooglePlaces.ts` 中修改 `componentRestrictions` 以包含目標國家

```typescript
componentRestrictions: { country: ["tw", "hk", "jp", "sg", "kr", "th", "vn"] }
```

### 地圖圖像無法載入

**原因**：靜態地圖 API 未啟用或 API 金鑰無效

**解決方案**：
1. 在 Google Cloud Console 啟用 **Static Maps API**
2. 確認 API 金鑰有足夠的配額

### 導航連結無法開啟

**原因**：座標未正確儲存

**解決方案**：
1. 重新編輯活動，使用「地點搜尋」選擇地點
2. 確保選擇後自動填入了座標

---

## 成本考量

Google Maps API 按使用量計費。每月前 $200 USD 的使用量免費。

**典型使用成本**（假設 1000 個活動/月）：
- Places Autocomplete：$0.00275 × 1000 = $2.75
- Place Details：$0.0175 × 1000 = $17.50
- Static Maps：$0.007 × 1000 = $7.00
- **月總計**：約 $27.25（在免費配額內）

---

## 進階自訂

### 修改搜尋限制國家

編輯 `client/src/hooks/useGooglePlaces.ts`：

```typescript
componentRestrictions: { country: ["tw", "hk", "jp"] } // 只搜尋台灣、香港、日本
```

### 修改地圖縮放等級

編輯 `client/src/components/MapPreview.tsx`：

```typescript
const getStaticMapUrl = (zoom = 15, size = "300x200") => {
  // zoom: 1-21，預設 15
}
```

### 自訂地圖標記顏色

在 `MapPreview.tsx` 中修改標記顏色：

```typescript
const markers = `color:0x3B9DD9|${lat},${lng}`; // 改為其他 16 進制顏色
```

---

## 相關資源

- [Google Maps Platform 文件](https://developers.google.com/maps)
- [Places API 文件](https://developers.google.com/maps/documentation/places)
- [Geocoding API 文件](https://developers.google.com/maps/documentation/geocoding)
- [Static Maps API 文件](https://developers.google.com/maps/documentation/maps-static)
