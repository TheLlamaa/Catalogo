# Catálogo online com pedidos por WhatsApp

Site de catálogo para pequenas lojas: o cliente escolhe os produtos, monta um orçamento e envia o pedido; o dono recebe tudo em um painel e conversa pelo WhatsApp. Feito para peças impressas em 3D, mas configurável para qualquer loja.

**Pilha:** React 19 · Vite · Tailwind · Supabase (banco, login, fotos) · Cloudflare Workers (hospedagem).

## O que tem

- **Vitrine:** categorias, busca, ordenação, destaques, mais pedidos, novidades, página de cada produto, produtos relacionados, carrinho/orçamento, pedido personalizado e página Sobre.
- **Painel do dono (`/admin`):** pedidos com resumo, filtros, relatório e planilhas; produtos e categorias com ordem manual; equipe; personalização completa do site (cores, fonte, logo, textos, menus, faixa de aviso, redes sociais).
- **Recursos que cada loja liga ou desliga:** controle de estoque, pedidos personalizados, prazo de produção, efeito de aura e link do modelo 3D.
- **Segurança no banco:** regras de acesso (RLS), preço e total dos pedidos calculados pelo banco, limite anti-spam por telefone, administradores em tabela.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu Supabase
npm run dev
```

## Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Conexão com o Supabase (obrigatórias) |
| `VITE_STORE_NAME` | Nome da loja (valor inicial) |
| `VITE_WHATSAPP_NUMBER` | WhatsApp que recebe os pedidos, com DDI e DDD (ex.: `5548999999999`) |
| `VITE_CONTACT_EMAIL` | E-mail de contato (opcional) |
| `VITE_AMBIENTE_LABEL` | Só no site de teste: mostra uma faixa amarela de aviso no topo (ex.: `Ambiente de teste`). Deixe em branco no site real |
| `VITE_NICHE` | Ponto de partida da loja: `3d` (padrão) ou `generico`. Define textos e recursos iniciais; o dono muda tudo depois no painel |

## Banco de dados

Os arquivos em [`supabase/`](supabase/LEIA-ME.md) recriam o banco do zero (rodar em ordem no SQL Editor do Supabase) e cada um grava a versão do banco; o painel avisa quando o banco está atrás do que o site espera. O passo a passo, inclusive como criar o primeiro administrador e o aviso de pedidos pelo Telegram, está no [`supabase/LEIA-ME.md`](supabase/LEIA-ME.md).

## Testes

```bash
npm run lint       # análise do código
npm run typecheck  # checagem de tipos (TypeScript)
npm test           # testes unitários (vitest)
npm run test:e2e   # testes no navegador, com um Supabase de mentira (precisa do Chromium)
npm run test:sql   # testes do banco num Postgres local (pip install pgserver psycopg2-binary)
```

O CI do GitHub roda tudo isso a cada pull request.

## Estrutura

```
src/
  features/
    vitrine/    o que o cliente vê: catálogo, detalhe do produto, carrinho, pedido personalizado, sobre, privacidade
    admin/      painel do dono, uma pasta por área: pedidos, produtos, categorias, auras, site, equipe, erros
    auth/       login do painel
  components/   peças compartilhadas (cabeçalho, diálogos, contexto)
  hooks/        carga de dados (useCatalogData), ações do painel (useAdminActions) e carrinho (useCart)
  lib/          regras puras e testadas (pedidos, relatório, tema, configurações…); não conhece o banco
  services/     ÚNICO lugar que fala com o Supabase (catálogo, pedidos, config, equipe, login, fotos, erros)
  views/        páginas da vitrine
supabase/       SQL do banco, testes do banco e função de aviso no Telegram
tests/          testes unitários e de navegador
```

TypeScript estrito em todo o código (`npm run typecheck`, também no CI): telas, hooks, serviços e regras são `.ts`/`.tsx`; tipos de domínio ficam em `src/types.ts`.

Regra de arquitetura (garantida por teste): telas e hooks nunca importam o Supabase direto; passam por `src/services/`. Trocar de banco ou adicionar cache mexe só nessa pasta.

## Publicação

O Cloudflare publica a branch `main` automaticamente. Antes do merge, o CI precisa estar verde.

## Ambiente de teste

Um segundo projeto Supabase (`Catalogo-Teste`) e um segundo site no Cloudflare, só para testar sem mexer nos pedidos e produtos reais.

- **Banco de teste:** mesmo esquema do real (arquivos `supabase/01` a `09`), com produtos, categorias e pedidos de mentira. Todo SQL novo roda primeiro aqui e só depois no banco real.
- **Site de teste:** um Worker do Cloudflare ligado a este repositório, com as variáveis de build apontando para o Supabase de teste (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e `VITE_AMBIENTE_LABEL=Ambiente de teste`, que mostra a faixa amarela de aviso no topo.
- **Login no teste:** crie o usuário em Authentication > Users do projeto de teste e coloque o e-mail na tabela `admins` (aba Equipe, ou `insert into public.admins (email) values ('voce@exemplo.com')`).
- **Nunca** use as chaves do Supabase real no site de teste, nem as do teste no real.
- **Branch `teste`:** o Worker de teste publica a partir da branch `teste`; o site real, a partir da `main`. Mudanças novas entram primeiro na `teste`, são validadas no site de teste e só depois vão para a `main`.
