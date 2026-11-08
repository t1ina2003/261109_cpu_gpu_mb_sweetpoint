# 甜蜜點｜台灣桌機選配

以台灣 2026 年 11 月原價屋報價、第三方 CPU／GPU 實測，找出符合個人預算、用途與功耗偏好的整機組合。

- 18 款 CPU、12 款 GPU，提供台灣單價、效能、每千元效能與每瓦效能排名。
- 整機含主機板、記憶體、SSD、散熱、電源與機殼，支援平台與型號鎖定、VRAM／CUDA 篩選、自訂報價。
- 甜蜜點散佈圖可切換價格與功耗橫軸，標示三目標前緣並比較方案差額。
- 資料基準為 11 月 8 日原價屋報價快照與個別活動標價。研究來源、方法和限制見網頁底部。整機效能與同時負載功耗為模型估算。

## GitHub Pages

在 Settings → Pages 選擇 Deploy from a branch，再選 `main` 和 `/docs`。測試版本可使用 `develop` 和 `/docs`。網頁採相對路徑，無需前端建置或 API 金鑰。

## 本機使用

開啟 `docs/index.html`，或在專案目錄執行 `python -m http.server 8000 --directory docs`。模型測試使用 `node --test`。

資料與來源位於 `docs/data.js`，配對與排名模型位於 `docs/model.js`。
