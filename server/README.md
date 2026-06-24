# Travel Planner — 後端 API Server

## 技術棧

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL（Railway）
- **圖片儲存**: Cloudinary
- **認證**: JWT + bcrypt

## 環境變數設定

在 Railway 的 Environment Variables 中設定以下變數：

```
DATABASE_URL=postgresql://user:password@host:port/dbname
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
PORT=3001
NODE_ENV=production
```

## Railway 部署步驟

1. 在 Railway 建立新 Project
2. 新增 PostgreSQL Service（Railway 提供）
3. 新增 Node.js Service，連接此 GitHub repo
4. 設定 Root Directory 為 `server`
5. 設定 Build Command: `pnpm install && pnpm run build && pnpm run db:migrate`
6. 設定 Start Command: `pnpm run start`
7. 填入上方所有環境變數
8. 從 PostgreSQL Service 複製 `DATABASE_URL` 填入環境變數

## 本地開發

```bash
cd server
cp .env.example .env  # 填入本地環境變數
pnpm install
pnpm run db:migrate:dev  # 建立資料表
pnpm run dev            # 啟動開發伺服器（port 3001）
```

## API 端點

### 認證
- `POST /api/auth/register` — 註冊
- `POST /api/auth/login` — 登入
- `GET /api/auth/me` — 取得目前使用者（需 JWT）

### 行程
- `GET /api/trips` — 列出所有行程（需 JWT）
- `POST /api/trips` — 建立行程（需 JWT）
- `GET /api/trips/:id` — 取得行程（需 JWT）
- `PATCH /api/trips/:id` — 更新行程（需 JWT）
- `DELETE /api/trips/:id` — 刪除行程（需 JWT）
- `POST /api/trips/:id/cover` — 上傳封面圖（需 JWT）
- `POST /api/trips/:id/share` — 建立分享連結（需 JWT）
- `GET /api/trips/shared/:token` — 取得分享行程（公開）

### 活動
- `GET /api/trips/:tripId/activities` — 列出活動（需 JWT）
- `POST /api/trips/:tripId/activities` — 新增活動（需 JWT）
- `PATCH /api/activities/:id` — 更新活動（需 JWT）
- `DELETE /api/activities/:id` — 刪除活動（需 JWT）
- `PATCH /api/trips/:tripId/activities/reorder` — 重新排序（需 JWT）

## 前端設定

前端需要設定環境變數 `VITE_API_URL` 指向後端 API：

```
VITE_API_URL=https://your-railway-backend-url.railway.app
```
