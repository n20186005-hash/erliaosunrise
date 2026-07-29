# ErliaoSunrise.com

臺南二寮觀日亭的繁體中文景點網站。使用 Astro、Tailwind CSS、TypeScript 與 Cloudflare Worker，沒有資料庫、登入或 CMS。

## 功能

- 二寮實景照片與完整開放授權標示
- 下一次日出、天光、建議抵達時間
- Cloudflare Worker 整合 Open-Meteo 預報
- 雲量、濕度、風速、能見度、降雨機率與簡易觀景指數
- 官方即時影像、Google Maps 導航、交通停車與攝影提示
- SEO metadata、TouristAttraction／FAQ 結構化資料、sitemap、robots、llms.txt
- 響應式版面、鍵盤焦點、減少動態效果支援

## 技術架構

```text
Astro 靜態輸出 → Cloudflare Workers Static Assets
                         └─ /api/conditions → Open-Meteo
```

`wrangler.jsonc` 使用 `run_worker_first: ["/api/*"]`：只有 API 先進 Worker，其餘路徑直接由 Static Assets 提供。

## 本機開發

需要 Node.js 22 或更新版本，以及 Corepack。

```bash
corepack enable
pnpm install
pnpm dev
```

`pnpm dev` 會先建置網站，再由 Wrangler 同時提供靜態頁面與天氣 API。若只需要調整不依賴天氣資料的靜態頁面，可使用：

```bash
pnpm dev:astro
```

## 驗證與建置

```bash
pnpm check
pnpm build
```

輸出目錄為 `dist/`。

## 部署到 Cloudflare

1. 登入 Cloudflare：

```bash
pnpm exec wrangler login
```

2. 建置並部署：

```bash
pnpm deploy
```

3. 在 Cloudflare Workers & Pages 專案的 **Settings → Domains & Routes** 加入：

```text
ErliaoSunrise.com
www.ErliaoSunrise.com
```

建議將 `www` 301 轉址到裸網域，並在 DNS 確認網域已由 Cloudflare 管理。

## 無秘密金鑰

Open-Meteo 不需要 API Key，所以此專案不需要 `.env` 或 Worker Secret。若之後換成付費氣象供應商，請使用 `wrangler secret put`，不要把金鑰提交到 Git。

## 照片與資料

照片授權請見 `PHOTO-LICENSES.md` 與網站 `/credits/`。景點資料主要連結西拉雅國家風景區管理處與台南旅遊網；出發前仍應核對最新官方公告。
