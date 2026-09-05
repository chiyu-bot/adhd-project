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

  const prompt = `You help someone with ADHD take the very first physical step on a task. They freeze before big tasks, so the step must be tiny and safe.
Notes (each may contain multiple tasks):
${tasks.map((x) => "- " + x).join("\n")}
For each real task, give: "title" (short, max 20 chars, same language as the note), "deadline" (YYYY-MM-DD only if explicitly written; today is ${today}; else null), and "steps": 3 short steps in ${lang}.
CRITICAL constraints for steps:
- Only "open / pick up / look at / stand up" level actions. The very first act of engaging, nothing more.
- NEVER assume what the person owns, or invent quantities, page numbers, word counts, item counts, durations, or specific tools they didn't mention. No "order 15 boxes", no "write 200 words", no "read page 3".
- No planning, deciding, organizing, or reviewing verbs.
- Later steps go BACKWARD toward easier preparation, not forward into the work.
Reply ONLY with a JSON array: [{"title":"...","deadline":null,"steps":["...","...","..."]}]`;

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
