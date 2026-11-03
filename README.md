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
