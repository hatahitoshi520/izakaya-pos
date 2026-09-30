// Vercel Serverless Function
// フロントエンドから直接 Gemini API を叩くと API キーが漏洩するため、
// このエンドポイントがキーをサーバー側にだけ保持して中継する
// （api/claude.js と同じ考え方。Anthropicのクレジットが尽きた際の
// 無料の代替として、領収書スキャン機能で使用する）。
//
// 必要な環境変数（Vercelのプロジェクト設定 > Environment Variables で設定）:
//   GEMINI_API_KEY ... Google AI Studio(aistudio.google.com)で発行した
//                      無料のAPIキー（必須・シークレット）
//   GEMINI_MODEL   ... 使用するモデル名（任意、未設定なら gemini-3.8-flash）

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    return;
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  try {
    const { contents, generationConfig } = req.body || {};
    if (!contents) {
      res.status(400).json({ error: "contents is required" });
      return;
    }

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({ contents, generationConfig }),
      }
    );

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || "Unknown error" });
  }
}
