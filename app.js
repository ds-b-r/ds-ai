(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const STORE = "dsai_v1_conversations";
  const WORKER_URL = String(window.DS_AI_CONFIG?.workerUrl || "").trim().replace(/\/+$/, "");
  const pageNames = {
    chat: "AI Chat", code: "Code Assistant", writer: "AI Writer",
    images: "AI Images", history: "Histórico", settings: "Configurações"
  };

  let conversations = loadConversations();
  let currentId = conversations[0]?.id || null;
  let busy = false;
  let activeMode = "chat";

  function loadConversations() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function save() {
    conversations = conversations.slice(0, 40);
    localStorage.setItem(STORE, JSON.stringify(conversations));
  }

  function current() {
    return conversations.find((conversation) => conversation.id === currentId);
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function newConversation() {
    const conversation = {
      id: makeId(), title: "Nova conversa", updated: Date.now(), messages: []
    };
    conversations.unshift(conversation);
    currentId = conversation.id;
    save();
    renderChat();
    showPage("chat");
  }

  function showPage(name) {
    activeMode = name;
    $$(".page").forEach((page) => page.classList.toggle("active", page.id === `page-${name}`));
    $$(".nav button").forEach((button) => button.classList.toggle("active", button.dataset.page === name));
    $("#crumb").textContent = `✦  ${pageNames[name] || pageNames.chat}`;
    $("#modeLabel").textContent = `✦ Modelo de IA · ${name === "code" ? "Programação" : name === "writer" ? "Escrita" : "Chat"}`;
    if (name === "history") renderHistory();
    if (name === "settings") renderSettings();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function formatText(value) {
    let output = escapeHtml(value);
    output = output.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (_, language, code) =>
      `<pre><code>${code.trim()}</code></pre>`);
    output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
    output = output.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return output;
  }

  function renderChat() {
    const conversation = current();
    $("#chatArea").innerHTML = "";
    const hasMessages = Boolean(conversation?.messages?.length);
    $("#welcome").hidden = hasMessages;
    $("#suggestions").hidden = hasMessages;
    if (!conversation) return;
    conversation.messages.forEach((message) => addMessage(message.role, message.content, false));
  }

  function addMessage(role, content, shouldScroll = true) {
    const element = document.createElement("div");
    element.className = `message ${role === "user" ? "user" : "assistant"}`;
    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = role === "user" ? "D" : "✦";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = formatText(content);
    element.append(avatar, bubble);
    $("#chatArea").appendChild(element);
    if (shouldScroll) element.scrollIntoView({ behavior: "smooth", block: "end" });
    return element;
  }

  function setStatus(ok, message) {
    $("#statusDot").classList.toggle("offline", !ok);
    $("#statusText").textContent = message;
    $("#connectionState").textContent = ok ? "Última conexão: resposta recebida com sucesso." : message;
  }

  function systemPrompt() {
    if (activeMode === "code") {
      return "Você é o DS AI Code Assistant, um tutor de programação paciente. Ajude com HTML, CSS, JavaScript e Luau/Roblox. Explique decisões, não invente testes e sinalize quando não tiver certeza.";
    }
    if (activeMode === "writer") {
      return "Você é o DS AI Writer. Ajude a criar e revisar textos naturais, claros e adequados ao objetivo solicitado.";
    }
    return "Você é o DS AI, um assistente útil, claro e honesto. Responda em português quando o usuário escrever em português. Explique limites e não invente informações.";
  }

  async function sendMessage(text) {
    if (busy) return;
    const prompt = String(text || "").trim();
    if (!prompt) return;

    if (!current()) {
      const conversation = {
        id: makeId(), title: "Nova conversa", updated: Date.now(), messages: []
      };
      conversations.unshift(conversation);
      currentId = conversation.id;
    }

    const conversation = current();
    conversation.messages.push({ role: "user", content: prompt });
    if (conversation.messages.length === 1) conversation.title = prompt.slice(0, 48);
    conversation.updated = Date.now();
    save();

    $("#prompt").value = "";
    $("#welcome").hidden = true;
    $("#suggestions").hidden = true;
    addMessage("user", prompt);

    const typing = addMessage("assistant", "DS AI está pensando...");
    typing.querySelector(".bubble").classList.add("typing");
    busy = true;
    $("#sendBtn").disabled = true;

    try {
      if (!WORKER_URL) throw new Error("A URL do Worker não foi definida em config.js.");

      const recentMessages = conversation.messages.slice(-16).map((message) => ({
        role: message.role,
        content: message.content
      }));

      const response = await fetch(`${WORKER_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: recentMessages, system: systemPrompt() })
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("O Worker retornou uma resposta inválida.");
      }

      if (!response.ok) throw new Error(data.error || `Falha ao consultar a IA (HTTP ${response.status}).`);
      const answer = data.reply || data.choices?.[0]?.message?.content;
      if (typeof answer !== "string" || !answer.trim()) throw new Error("A IA retornou uma resposta vazia.");

      typing.remove();
      conversation.messages.push({ role: "assistant", content: answer });
      conversation.updated = Date.now();
      save();
      addMessage("assistant", answer);
      setStatus(true, "IA conectada");
    } catch (error) {
      typing.remove();
      addMessage("assistant", `Não consegui responder: ${error.message}`);
      setStatus(false, `Falha na conexão: ${error.message}`);
    } finally {
      busy = false;
      $("#sendBtn").disabled = false;
      $("#prompt").focus();
    }
  }

  function renderHistory() {
    const box = $("#historyList");
    box.innerHTML = "";
    if (!conversations.length) {
      const empty = document.createElement("p");
      empty.className = "page-desc";
      empty.textContent = "Nenhuma conversa salva ainda.";
      box.appendChild(empty);
      return;
    }

    conversations.forEach((conversation) => {
      const row = document.createElement("div");
      row.className = "history-item";
      const openButton = document.createElement("button");
      const title = document.createElement("strong");
      title.textContent = conversation.title || "Nova conversa";
      const meta = document.createElement("small");
      meta.textContent = `${new Date(conversation.updated).toLocaleString("pt-BR")} · ${conversation.messages.length} mensagens`;
      openButton.append(title, meta);
      openButton.addEventListener("click", () => {
        currentId = conversation.id;
        renderChat();
        showPage("chat");
      });

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-one";
      deleteButton.textContent = "Excluir";
      deleteButton.addEventListener("click", () => {
        conversations = conversations.filter((item) => item.id !== conversation.id);
        if (currentId === conversation.id) currentId = conversations[0]?.id || null;
        save();
        renderHistory();
        renderChat();
      });
      row.append(openButton, deleteButton);
      box.appendChild(row);
    });
  }

  function renderSettings() {
    $("#workerAddress").textContent = WORKER_URL || "URL não definida em config.js";
    $("#connectionState").textContent = "O site usa automaticamente o endereço configurado. Envie uma mensagem para testar a conexão.";
  }

  // Navegação
  $$(".nav button").forEach((button) => button.addEventListener("click", () => showPage(button.dataset.page)));
  $("#newChat").addEventListener("click", newConversation);
  $("#settingsShortcut").addEventListener("click", () => showPage("settings"));

  // Chat
  $("#sendBtn").addEventListener("click", () => sendMessage($("#prompt").value));
  $("#prompt").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage($("#prompt").value);
    }
  });

  // Sugestões e ferramentas
  $$(".suggestion").forEach((button) => button.addEventListener("click", () => {
    $("#prompt").value = button.dataset.prompt || "";
    $("#prompt").focus();
  }));
  $$(".use-prompt").forEach((button) => button.addEventListener("click", () => {
    showPage("chat");
    $("#prompt").value = button.dataset.prompt || "";
    $("#prompt").focus();
  }));

  // Histórico
  $("#clearCurrent").addEventListener("click", () => {
    const conversation = current();
    if (!conversation) return;
    conversation.messages = [];
    conversation.title = "Nova conversa";
    conversation.updated = Date.now();
    save();
    renderChat();
  });

  $("#deleteHistory").addEventListener("click", () => {
    if (!window.confirm("Apagar todas as conversas salvas neste navegador?")) return;
    conversations = [];
    currentId = null;
    save();
    renderHistory();
    renderChat();
  });

  // Inicialização
  $("#workerAddress").textContent = WORKER_URL || "URL não definida em config.js";
  renderChat();
  if (!WORKER_URL) setStatus(false, "URL do Worker ausente em config.js");
})();
