# DS AI — versão 1.0

Primeira versão do DS AI: interface premium roxa, chat, Code Assistant, AI Writer, histórico local e configuração de backend.

## Arquivos

- `index.html`: frontend para publicar no GitHub Pages.
- `worker.js`: backend para Cloudflare Workers.

## 1. Publicar a interface

1. Crie um repositório no GitHub (por exemplo, `ds-ai`).
2. Envie o arquivo `index.html` para a raiz do repositório.
3. Em **Settings → Pages**, ative o GitHub Pages.
4. Aguarde a publicação.

## 2. Criar o backend no Cloudflare

1. Crie um Worker no painel Cloudflare.
2. Cole o conteúdo de `worker.js`.
3. Em **Settings → Variables and Secrets**, crie o secret:
   - Nome: `OPENAI_API_KEY`
   - Valor: sua chave privada de API.
4. (Opcional) Crie a variável `OPENAI_MODEL` com um modelo disponível na sua conta.
5. Salve e faça deploy.

A chave deve ser cadastrada como Secret no Cloudflare. **Nunca coloque a chave no `index.html`, GitHub ou em mensagens públicas.**

## 3. Conectar o site ao Worker

1. Abra o DS AI publicado.
2. Entre em **Configurações**.
3. Cole a URL base do Worker, por exemplo `https://seu-worker.seu-subdominio.workers.dev`.
4. Clique em **Salvar configuração**.
5. Volte ao AI Chat e envie uma mensagem de teste.

O frontend chama `POST https://SUA-URL/api/chat`.

## 4. Observações

- O histórico é guardado no LocalStorage do navegador e não sincroniza entre dispositivos.
- AI Images é apenas uma área preparada para uma futura integração; não gera imagens nesta versão.
- A integração de IA exige uma conta e uma chave de API do provedor. O uso pode ter custos e limites. Confira as condições e peça ajuda de um responsável antes de ativar qualquer serviço pago.
- O Worker de exemplo usa a API de Chat Completions da OpenAI. Configure um modelo que esteja disponível para sua chave.
- Para produção, substitua `Access-Control-Allow-Origin: *` no Worker pelo domínio exato do seu site e adicione controles de uso/limites. Não publique o Worker sem considerar abuso e custos.
