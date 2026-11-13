# ERos 羽球團｜固定網址・永久相簿・持續更新（V1.3）

**核心理念：隨便打打，反正都會流汗！**

這是從 ERos V1.2 升級的、可部署至 GitHub Pages 的正式網站原始檔案。
原本的五個單元、綠頭鴨與老虎形象、手機版導覽與回首頁按鈕皆保留。

## 專案內容

| 路徑 | 功能 |
| --- | --- |
| `index.html` | 固定網址的首頁，包含五大主題 |
| `assets/` | 吉祥物、品牌圖片（不需重傳） |
| `docs/` | 羽球規則 PDF |
| `photos/` | 歷年真人團體照原檔（網站最佳化後） |
| `photos/thumbs/` | 相簿縮圖 |
| `data/photos.json` | 累積式相簿資料庫（文字清單） |
| `data/photos.js` | 供離線及 GitHub Pages 共用的相簿清單 |
| `data/gallery.js` | 相簿前端顯示、分類、分頁 |
| `scripts/add_photos.py` | 將新照片追加進相簿，不刪除舊資料 |
| `scripts/check_site.py` | 發布前自動驗證檔案與照片清單 |
| `.nojekyll` | 避免 GitHub Pages 額外處理檔案 |

## 原理

GitHub Pages 使用固定的儲存庫（例如 `eros-badminton`）發布網站。隨著每次更新儲存庫中的 `index.html`、`photos/`、`data/photos.js`，原有網址**不變**，既有照片**保留**。

目前沒有任何已核准上傳的真人團體照，所以相簿初始為 **0 張**；網站會顯示角色插畫與等待照片的占位畫面，避免把 AI 插畫誤當真人合照。

## 重要限制

- 這是公開靜態網站，**瀏覽者不能直接將照片寫入網站伺服器**；相片新增由網站管理員發布並更新網站資料庫。
- 將新照片交給 ChatGPT，由 ChatGPT 更新專案後再推送同一儲存庫，或依 `部署教學.md` 自行操作。
- 手機拍攝照片可能附帶 GPS/時間 EXIF；`add_photos.py` 在轉為 WebP 時不帶入原有 EXIF metadata。
- 公開網站的團體照應先取得出鏡成員的分享同意；不建議放電話、住址等敏感資訊。
- **不是雲端相片上傳系統**：沒有會員帳號、沒有管理後台、沒有自動同步私人相簿。

## 新增照片

先裝 Pillow：`python -m pip install pillow`

新增單張：

```bash
python scripts/add_photos.py "你的照片/2026-11-01_合照.jpg" --album "球團合照" --title "11 月第一場" --date 2026-11-01
```

新增整個資料夾：

```bash
python scripts/add_photos.py "你的照片資料夾" --album "球場日常"
```

每次腳本只追加新照片到 `photos/` 和 `data/photos.json`/`data/photos.js`，相同照片自動跳過。完成後用 `python scripts/check_site.py` 檢查，再上傳更新後的檔案到 GitHub。

## 更新順序

新增照片 → 加入資料庫 → 驗證 → commit/push 到 GitHub 同一儲存庫 → GitHub Pages 沿用固定網址更新內容。

**不要使用「重新建一個儲存庫」來更新網站，也不要清空 `photos/` 和 `data/photos.json`。**

## 報名功能設定

1. 在 Cloudflare 建立 D1，透過 D1 Console 或 Wrangler 執行根目錄的 registration.sql。把資料庫綁定至 Pages 專案，變數名稱為 REGISTRATION_DB。
2. 在 Pages 設定 LIFF_ID 和 LINE_LOGIN_CHANNEL_ID。既有 LIFF 需啟用 openid scope，Endpoint URL 須涵蓋 /registration.html。若既有 LIFF 的 Endpoint 只涵蓋其他頁面，可在同一個 LINE Login Channel 新增專用 LIFF，Endpoint 指向 /registration.html。
3. 在既有 ERos 官方帳號啟用 Messaging API，選擇 LINE Login 所在的 Provider。將 LINE_CHANNEL_SECRET 和 LINE_CHANNEL_ACCESS_TOKEN 設為 Pages Secrets。部署後，將 Webhook 設為網站網址加上 /api/line-webhook 並驗證。
4. 開啟「允許機器人加入群組」，邀請官方帳號進群組，並在 Pages 設定 LINE_GROUP_ID（LINE Webhook 的 source.groupId）。更新設定後重新部署。群組只處理指定群組的 +1、-1、報名狀態。
5. 團長在 D1 新增已確認的場次與成員資料。starts_at 使用 Unix 秒數，請在建立場次時明確輸入 +08:00 時區。系統選擇最近一場尚未開始的場次，is_open 可暫停新增報名。固定成員 role 為 regular，經 Ro 核准的朋友為 guest。固定成員先報名，Ro 確認有空位後，才在 guest_registration_open 新增該場次 id。這版沒有管理介面，資料由團長在 D1 管理。
6. 用同一個 LINE 帳號測試：群組傳 +1 → 開網頁查看已報名 → 網頁取消 → 群組輸入「報名狀態」核對名額。額滿時直接回覆額滿。LINE 群組的回覆全群可見。

### 第一次開放報名

- 團長和團員可私訊官方帳號「我的報名識別碼」，將識別碼交給團長。團長將自己的識別碼設為 Pages 變數 LINE_ADMIN_USER_ID 後重新部署，再在目標群組傳「報名群組設定」取得 LINE_GROUP_ID。
- D1 操作示例（換成實際已確認的場次時間和團員識別碼）：

```sql
INSERT INTO sessions (starts_at, location)
VALUES (unixepoch('2026-11-15 20:00:00+08:00'), '竹北 Y-POWER');
INSERT INTO members (user_id, role) VALUES ('U替換為團員識別碼', 'regular');
-- 團長確認可開放朋友名額後執行，將 1 換成實際場次 id。
INSERT INTO guest_registration_open (session_id) VALUES (1);
```
