# GTI—人類心理 A.V.B 測驗｜人格心理類型測驗（完整版檔案）

這份專案是「可直接上線」的純前端測驗網站：

- 先做 GTI-12（12 題）
- 若落在邊界區，系統會自動補問校準
- 最多補問到 120 題
- 輸出 12 類型（象限×模式）＋「科學元素人格代碼」

## 檔案
- index.html
- styles.css
- bank.js（題庫：GTI-12 + 補問池）
- app.js（流程：作答、補問、計分、結果）

## 上線到 GitHub Pages
1. 建立 GitHub repo（例如 gti-avb-test）
2. 上傳以上四個檔案到 repo 根目錄
3. Settings → Pages → Deploy from branch → main / (root)
4. 完成後網址： https://<你的帳號>.github.io/<repo>/

## 自訂
- 修改網站名稱：index.html 的 <title>、.brand、首頁 H1
- 擴充題庫：bank.js 的 pools 每向度增加題目（建議朝 30 題/向度）
- 想改人格元素：app.js 的 ELEMENTS 映射表
