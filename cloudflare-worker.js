// DS AI API — Cloudflare Worker
// No painel do Cloudflare, mantenha o binding Workers AI com o nome: AI

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return new Response("DS AI API online", {
        headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return json({ error: "Rota não encontrada." }, 404);
    }

    if (!env.AI) {
      return json({ error: "Workers AI não está conectado. Confira o binding AI." }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "JSON inválido." }, 400);
    }

    if (!Array.isArray(body.messages) || !body.messages.length) {
      return json({ error: "Envie ao menos uma mensagem." }, 400);
    }

    const messages = body.messages.slice(-16).map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content || "").slice(0, 12000),
    }));

    const system = typeof body.system === "string"
      ? body.system.slice(0, 3000)
      : "Você é o DS AI, um assistente inteligente, útil e honesto. Responda em português quando apropriado.";

    try {
      const result = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: 1024,
        temperature: 0.7,
      });

      const reply = result?.response;
      if (typeof reply !== "string" || !reply.trim()) {
        return json({ error: "A IA não retornou uma resposta válida." }, 502);
      }

      return json({ reply });
    } catch (error) {
      return json({
        error: "Erro ao executar a IA: " + (error?.message || "erro desconhecido"),
      }, 502);
    }
  },
};
