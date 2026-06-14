# 旅遊行程規劃網站 — 設計構思

## 三種風格方向

### 方向 A：「探索者日誌」Expedition Journal
深色皮革質感、手繪插圖風格，像一本老式探險家的旅行日誌。溫暖的棕褐色調搭配手寫字體，充滿冒險感與懷舊氛圍。
**Probability:** 0.04

### 方向 B：「清晨海岸」Coastal Morning ✅ 選定
清新的沙灘藍白色調，乾淨俐落的版面設計，帶有微妙的自然紋理。像是旅遊雜誌的高端排版，既現代又充滿度假氛圍。
**Probability:** 0.07

### 方向 C：「城市霓虹」Urban Neon
深色背景搭配霓虹漸層色，科技感十足的現代都市風。適合商務旅行者，強調效率與科技感。
**Probability:** 0.02

---

## 選定方向：「清晨海岸」Coastal Morning 深度展開

### Design Movement
**Coastal Editorial Minimalism** — 融合高端旅遊雜誌排版美學與北歐極簡主義，以自然光線感與留白為核心設計語言。

### Core Principles
1. **光線感（Luminosity）** — 所有色彩選擇模擬清晨海岸的自然光線，避免純白，使用帶溫度的米白與淡藍
2. **非對稱排版（Asymmetric Layout）** — 避免居中對齊的平庸感，採用偏移網格、錯位卡片創造視覺張力
3. **質感留白（Textured Whitespace）** — 留白不是空白，而是帶有細微紋理的呼吸空間
4. **敘事層次（Narrative Hierarchy）** — 每個頁面都像雜誌跨頁，有主角（大標題/圖片）、配角（次要資訊）、背景（輔助元素）

### Color Philosophy
- **主色 Horizon Blue** `oklch(0.62 0.12 220)` — 遠方地平線的深藍，用於主要互動元素
- **沙灘米白 Sand** `oklch(0.97 0.015 80)` — 頁面背景，帶溫度的米白而非純白
- **珊瑚橙 Coral** `oklch(0.72 0.14 35)` — 強調色，用於重要行動按鈕與標記
- **深海 Deep Sea** `oklch(0.25 0.08 220)` — 深色文字與側邊欄背景
- **霧灰 Mist** `oklch(0.92 0.008 220)` — 卡片背景與分隔線

情感意圖：讓使用者感受到「即將出發的期待感」，而非冰冷的工具感。

### Layout Paradigm
- **桌面版**：左側固定導覽欄（深海色）+ 右側主內容區，非傳統頂部導航
- **手機版**：底部導覽列 + 全屏卡片式瀏覽
- 行程卡片採用**錯位堆疊**設計，非整齊網格
- 詳細頁面使用**時間軸垂直佈局**，強調旅程的時序感

### Signature Elements
1. **波浪分隔線** — 使用 SVG 波浪作為區塊分隔，呼應海洋主題
2. **地圖縮略圖** — 每個行程卡片右上角顯示目的地地圖縮略圖
3. **日期標籤** — 採用大字號日期 + 小字月份的組合，像雜誌日期標記

### Interaction Philosophy
- 卡片 hover 時輕微上浮（translateY -4px）並加深陰影
- 按鈕點擊有輕微縮放回饋（scale 0.97）
- 頁面切換使用淡入滑動效果
- 表單輸入框聚焦時邊框顏色漸變到 Horizon Blue

### Animation
- 入場動畫：元素從下方 20px 淡入，錯開 50ms 間隔
- 卡片懸停：200ms ease-out，translateY(-4px) + box-shadow 加深
- 頁面轉場：300ms fade + slight slide
- 載入狀態：骨架屏使用波浪掃過動畫
- 所有動畫遵守 prefers-reduced-motion

### Typography System
- **Display Font**: `Playfair Display` — 用於大標題、行程名稱，帶有雜誌感的襯線字體
- **Body Font**: `Noto Sans TC` — 中文內容主體，清晰易讀
- **Accent Font**: `DM Mono` — 用於日期、數字、代碼，等寬字體增加精緻感
- 字體層次：Display 48-72px / H1 32px / H2 24px / Body 16px / Caption 13px

### Brand Essence
**「把每一次旅行，變成一個值得珍藏的故事」** — 為獨立旅行者打造的行程規劃工具，不只是清單，而是旅行日記。
個性形容詞：**精緻（Refined）、自由（Free-spirited）、真實（Authentic）**

### Brand Voice
語調：像一位有品味的旅行好友在分享建議，不說廢話，但充滿溫度。
- 範例標題：「你的下一段旅程，從這裡開始」
- 範例 CTA：「規劃這趟旅行」
- 禁止使用：「歡迎使用本系統」、「開始使用」等制式語言

### Wordmark & Logo
以羅盤指針為靈感的幾何圖形標誌：一個細線圓圈內含簡化的指針形狀，代表方向感與探索精神。

### Signature Brand Color
**Horizon Blue** `oklch(0.62 0.12 220)` — 地平線藍，這個顏色只屬於這個品牌。
