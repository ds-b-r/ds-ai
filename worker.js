const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return new Response("DS AI API — online", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return json({ error: "Rota não encontrada." }, 404);
    }

    if (!env.OPENAI_API_KEY) {
      return json({ error: "A chave da API não foi configurada no Worker." }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "O corpo da solicitação precisa ser JSON válido." }, 400);
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: "Envie ao menos uma mensagem." }, 400);
    }

    const messages = body.messages.slice(-16).map((m) => {
      const role = m.role === "assistant" ? "assistant" : "user";
      return {
        role,
        content: String(m.content || "").slice(0, 12000),
      };
    });

    const system = typeof body.system === "string"
      ? body.system.slice(0, 3000)
      : "Você é o DS AI, um assistente útil e honesto.";

    try {
      const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "system", content: system }, ...messages],
          temperature: 0.7,
        }),
      });

      const result = await upstream.json().catch(() => ({}));

      if (!upstream.ok) {
        const detail = result?.error?.message || `O provedor respondeu com status ${upstream.status}.`;
        return json({ error: detail }, upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502);
      }

      const reply = result?.choices?.[0]?.message?.content;
      if (typeof reply !== "string" || !reply.trim()) {
        return json({ error: "O provedor não retornou texto." }, 502);
      }

      return json({ reply });
    } catch {
      return json({ error: "Não foi possível conectar ao serviço de IA." }, 502);
    }
  },
};