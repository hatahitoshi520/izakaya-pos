import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { storage } from "./lib/storage.js";

// App.jsx内部は元のClaudeアーティファクト用コードのまま（window.storage.get/set/...を呼ぶ）。
// ここでSupabaseベースの実装をwindow.storageとして差し込むことで、
// App.jsx側のコードは無変更で動作する。
window.storage = storage;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
