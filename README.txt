# DS AI — projeto organizado

## Arquivos
- `index.html`: estrutura das páginas.
- `style.css`: identidade visual e layout responsivo.
- `app.js`: navegação, chat e histórico.
- `config.js`: endereço fixo do Cloudflare Worker.
- `cloudflare-worker.js`: código que deve ser publicado no Worker.

## Publicar no GitHub
1. Abra o repositório do DS AI.
2. Substitua o conteúdo do `index.html` pelo arquivo desta pasta.
3. Crie os arquivos `style.css`, `app.js` e `config.js` na raiz do repositório e cole o conteúdo correspondente.
4. Faça commit das alterações.
5. Aguarde o GitHub Pages atualizar e abra o site.

Não coloque `cloudflare-worker.js` no frontend como forma de executar a API. Ele é o código do backend e deve ser publicado no painel do Cloudflare Worker.

## Atualizar o Cloudflare Worker
1. Abra o Worker `ds-ai-api`.
2. Confirme que existe um binding Workers AI chamado `AI`.
3. Abra Edit Code, substitua o código pelo conteúdo de `cloudflare-worker.js` e publique.
4. O modelo configurado é `@cf/google/gemma-4-26b-a4b-it`.

O Gemma 4 é um modelo diferente do Llama 3.1 usado anteriormente. O preço por token não é idêntico; consulte a página oficial de preços da Cloudflare antes de habilitar qualquer cobrança.

## URL fixa
O endereço está em `config.js`:
`https://ds-ai-api.paulodaniel07oficial.workers.dev`

Para mudar o Worker no futuro, altere somente `config.js`.
