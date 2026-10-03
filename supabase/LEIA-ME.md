# Pasta `supabase/`

Tudo o que o banco do catálogo precisa, para você poder **recriar o projeto do zero** (ou entender o que existe hoje). Estes arquivos refletem o estado real do banco.

## Importante: e-mails de admin
Os e-mails dos administradores **não** ficam no repositório. Em `02-funcoes-e-gatilhos.sql` há dois e-mails de exemplo
(`seu-email-admin-1@exemplo.com` e `seu-email-admin-2@exemplo.com`). **Troque pelos e-mails reais (em minúsculas) antes de rodar** e não faça commit com eles.

## Como recriar o banco
No painel do Supabase → SQL Editor, rode nesta ordem (cada arquivo pode ser rodado mais de uma vez sem problema):

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `01-tabelas.sql` | Cria as tabelas (categorias, produtos, pedidos, pedidos personalizados, dados privados, textos do site) |
| 2 | `02-funcoes-e-gatilhos.sql` | `is_admin()`, validação de pedidos e limite anti-spam |
| 3 | `03-seguranca-rls.sql` | Liga a segurança por linha e cria as regras de acesso (visitante só vê produtos ativos e só cria pedidos) |
| 4 | `04-storage.sql` | Pasta de fotos `fotos_produtos` (pública para ver, só admin envia/apaga) |
| 5 | `05-tempo-real.sql` | Atualização em tempo real do painel admin |
| 6 | `06-personalizacao.sql` | Colunas de selo, seção da vitrine (Destaques / Mais pedidos) e ordem manual de produtos e categorias |
| 7 | `07-controle-estoque.sql` | Permite desligar o controle de estoque no painel (o banco para de recusar pedidos por falta de estoque) |

Observação: o padrão de `status` dos pedidos nestes arquivos é `'novo'`; o banco atual ainda usa `'pending'` como padrão. O site funciona com os dois.

## Aviso de novo pedido no Telegram (opcional)

O código da função está em `functions/notificar-pedido/index.ts`.

## 1. Criar o bot
1. No Telegram, converse com **@BotFather** e envie `/newbot`. Siga os passos e guarde o **token**.
2. Abra uma conversa com o seu bot novo e envie qualquer mensagem (ex.: "oi").
3. No navegador, abra `https://api.telegram.org/botSEU_TOKEN/getUpdates` e copie o número que aparece em
   `"chat":{"id": ... }`. Esse é o **chat id**.

Não cole o token em conversas nem em arquivos do projeto.

## 2. Publicar a função (precisa da CLI do Supabase)
```
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... WEBHOOK_SECRET=uma-senha-longa-inventada
supabase functions deploy notificar-pedido --no-verify-jwt
```
`--no-verify-jwt` é necessário porque quem chama é o webhook do banco; a proteção é a senha `WEBHOOK_SECRET`.

## 3. Criar os webhooks (Painel do Supabase → Database → Webhooks → Create)
Crie dois, um para cada tabela:

| Campo | Valor |
|---|---|
| Table | `orders` (e depois `custom_orders`) |
| Events | só **Insert** |
| Type | Supabase Edge Functions |
| Function | `notificar-pedido` |
| HTTP Headers | adicionar `x-webhook-secret` com o mesmo valor de `WEBHOOK_SECRET` |

## 4. Testar
Envie um pedido pelo site. A mensagem deve chegar em alguns segundos.
Se não chegar, veja *Edge Functions → notificar-pedido → Logs* no painel do Supabase.
