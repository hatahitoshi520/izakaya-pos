// Vercel Serverless Function
// フロントエンドから直接 Anthropic API を叩くと API キーが漏洩するため、
// このエンドポイントがキーをサーバー側にだけ保持して中継する。
//
// 必要な環境変数（Vercelのプロジェクト設定 > Environment Variables で設定）:
//   ANTHROPIC_API_KEY  ... Anthropic Consoleで発行したAPIキー（必須・シークレット）
//   CLAUDE_MODEL       ... 使用するモデル名（任意、未設定なら claude-sonnet-5）
//
// 注意: フロントエンド(App.jsx)から送られてくる "model" フィールドは無視し、
// 常にサーバー側の環境変数で指定したモデルを使う（安全のため）。

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
    return;
  }

  const model = process.env.CLAUDE_MODEL || "claude-sonnet-5";

  try {
    const { messages, max_tokens } = req.body || {};
    if (!messages) {
      res.status(400).json({ error: "messages is required" });
      return;
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: max_tokens || 1000,
        messages,
      }),
    });

    // レート制限(429)の場合、Anthropicが返す retry-after をそのままブラウザに伝える
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) {
      res.setHeader("retry-after", retryAfter);
    }

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || "Unknown error" });
  }
}
