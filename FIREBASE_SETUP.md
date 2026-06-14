# Firebase 設定指南

## 快速開始

### 1. 建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com)
2. 點擊「新增專案」，輸入專案名稱（例：voyager-travel）
3. 依照指示完成專案建立

### 2. 啟用 Authentication

1. 在 Firebase Console 左側選單，點擊「Authentication」
2. 點擊「開始使用」
3. 在「Sign-in method」分頁，啟用以下兩種方式：
   - **電子郵件/密碼** — 切換開關為啟用
   - **Google** — 切換開關為啟用，填入支援電子郵件

### 3. 建立 Firestore 資料庫

1. 在左側選單點擊「Firestore Database」
2. 點擊「建立資料庫」
3. 選擇「以正式模式啟動」（或測試模式，但正式部署前請更新規則）
4. 選擇資料庫位置（建議選 asia-east1 台灣/香港附近）

### 4. 設定 Firestore 安全規則

在 Firestore Console 的「規則」分頁，貼上以下規則：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Trips: only owner can read/write
    match /trips/{tripId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Activities: only owner can read/write
    match /activities/{activityId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### 5. 取得 Firebase 設定

1. 在 Firebase Console，點擊「專案設定」（齒輪圖示）
2. 滾動到「您的應用程式」區塊
3. 點擊「新增應用程式」> 選擇 Web（`</>`）
4. 輸入應用程式暱稱，點擊「註冊應用程式」
5. 複製 `firebaseConfig` 物件中的值

### 6. 設定環境變數

在本地開發時，建立 `.env.local` 檔案（專案根目錄）：

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=1:your_sender_id:web:your_app_id
```

---

## 部署至 Vercel

### 方法一：透過 Vercel CLI

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 在專案根目錄執行
vercel

# 設定環境變數
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID
```

### 方法二：透過 Vercel Dashboard

1. 前往 [vercel.com](https://vercel.com)，連結 GitHub 倉庫
2. 在「Environment Variables」區塊，新增上述所有 Firebase 環境變數
3. 點擊「Deploy」

### 重要：設定 Firebase Authorized Domains

部署後，需要將 Vercel 網域加入 Firebase 的授權網域：

1. Firebase Console > Authentication > Settings > Authorized domains
2. 點擊「新增網域」
3. 輸入你的 Vercel 網域（例：your-app.vercel.app）

---

## 資料結構

### trips 集合
```json
{
  "id": "auto-generated",
  "userId": "firebase_user_uid",
  "title": "東京賞楓之旅",
  "destination": "日本東京",
  "startDate": "2024-11-15",
  "endDate": "2024-11-22",
  "description": "行程簡介",
  "budget": 50000,
  "currency": "TWD",
  "status": "planning | ongoing | completed",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### activities 集合
```json
{
  "id": "auto-generated",
  "tripId": "trip_document_id",
  "userId": "firebase_user_uid",
  "day": 1,
  "date": "2024-11-15",
  "time": "09:00",
  "title": "淺草寺參拜",
  "category": "attraction | restaurant | hotel | transport | other",
  "location": "淺草寺",
  "address": "東京都台東區淺草2-3-1",
  "notes": "備註事項",
  "cost": 0,
  "currency": "JPY",
  "duration": 90,
  "order": 0,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```
