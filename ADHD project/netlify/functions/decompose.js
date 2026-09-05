// 「まず5分」AIキャプチャ/分解用の中継Function
// 配置先: netlify/functions/decompose.js
// APIキーは Netlify のサイト設定 > Environment variables に
// ANTHROPIC_API_KEY として登録する(クライアントには一切露出しない)
//
// 契約: POST { tasks: string[], lang: string, today: "YYYY-MM-DD" }
//   → { items: [{ title, deadline|null, steps: string[] }] }
// 書き殴りの切り分けと5分行動への分解を1回の呼び出しで行う

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ error: "bad json" }, { status: 400 });
  }

  const tasks = Array.isArray(body.tasks)
    ? body.tasks
        .filter((x) => typeof x === "string" && x.trim())
        .map((x) => x.trim().slice(0, 500))
        .slice(0, 20)
    : [];
  const lang = typeof body.lang === "string" ? body.lang.slice(0, 40) : "Japanese";
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today || "")
    ? body.today
    : new Date().toISOString().slice(0, 10);
  if (!tasks.length) {
    return Response.json({ error: "no tasks" }, { status: 400 });
  }

  const prompt = `You will receive short task notes someone scribbled down. Some notes may contain multiple separate tasks run together in one line.
Notes:
${tasks.map((s) => "- " + s).join("\n")}
Do two things:
1) Split them into separate tasks (one entry per real task).
2) For each task, produce: "title" (short, max 20 characters, in the same language the note was written in), "deadline" (YYYY-MM-DD only if a date is explicitly stated in the note; today is ${today}; otherwise null), and "steps": 3 to 6 physical actions of under 5 minutes each, written in ${lang}. The first step must be extra small (open a file / look at a page level). No vague verbs like "think about" or "organize".
Reply ONLY with a JSON array: [{"title":"...","deadline":null,"steps":["...","..."]}]`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      // 分解タスクには最安モデルで十分。精度が不足したら claude-sonnet-5 に変更
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!r.ok) {
    return Response.json({ error: "upstream" }, { status: 502 });
  }

  const data = await r.json();
  const text = (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  try {
    const raw = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (Array.isArray(raw)) {
      const items = raw
        .filter((it) => it && typeof it.title === "string" && it.title.trim() && Array.isArray(it.steps) && it.steps.length)
        .map((it) => ({
          title: it.title.trim().slice(0, 40),
          deadline: /^\d{4}-\d{2}-\d{2}$/.test(it.deadline || "") ? it.deadline : null,
          steps: it.steps.map(String).slice(0, 6)
        }));
      if (items.length) return Response.json({ items });
    }
  } catch (e) {}

  return Response.json({ error: "parse" }, { status: 502 });
};
