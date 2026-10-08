# Proposta: painel de configurações do site (Fase 1 — somente leitura)

**Base:** branch `teste`, commit `90240a1`, pasta `Catalogo-teste/`. Nada foi alterado além deste arquivo e do `ANALISE-CATALOGO.md` já existente; sem commit, push, migration ou instalação. **Aguardando sua aprovação para a Fase 2.**

---

## 0. Resumo do diagnóstico

O painel **já tem boa parte dos padrões que você pediu**: busca de configurações, descrição curta por campo, restaurar padrão por campo/seção/tudo, prévia ao vivo da vitrine, "Alterações não publicadas", aviso ao sair sem publicar e "Desfazer" a última publicação. O problema real está em três pontos:

1. **Organização pela estrutura do código, não pela tarefa do dono.** Exemplos: "Página inicial" mistura layout, capa, faixa de aviso, passo a passo e regras de exibição de produtos; "Pedidos e carrinho" guarda a "Janela do produto" e a cor dos selos; SEO está dentro de "Dados da loja"; não existe "Contato e redes" nem "Avançado".
2. **Busca limitada e escondida:** só procura dentro da área "Site" (não acha Produtos, Pedidos, Equipe) e só aparece depois de abrir uma aba do Site.
3. **Muito texto e regra fixos no código** (ver seção 2): rótulos de botões, estados vazios, mensagens de erro, rodapé, mensagem do WhatsApp, tamanho de página, limites de estoque, ordem das seções da home, SEO por página, raio de borda, etc.

A boa notícia técnica: as configurações vivem numa tabela `chave → texto` (`site_settings`), então **quase tudo pode ser feito sem alterar o banco** (exceções na seção 5).

---

## 1. Mapa atual

### 1.1 Onde ficam as configurações no painel

Menu lateral (`src/features/admin/AdminNav.tsx:34-44`): **Vendas** (Pedidos, Personalizados) · **Catálogo** (Produtos, Categorias, Auras) · **Site** (7 grupos) · **Sistema** (Calculadora, Equipe, Erros).

Os 7 grupos de "Site" vêm de `GROUPS` em `src/lib/settings.ts:105-124`; os campos estão em `SETTINGS_SCHEMA` (`settings.ts:134-359`): **114 campos em 29 seções**.

| Grupo atual | Seções (campos) |
|---|---|
| **Página inicial** | Modelo da página inicial · Blocos da página inicial · Passo a passo do pedido · Capa da vitrine · Página inicial (vitrine) · Seções no topo da vitrine · Exibição da vitrine · Faixa de aviso no topo |
| **Aparência** | Cores e fonte · Logo · Nome da loja no topo · Estilo dos cards (+ "Temas prontos") |
| **Dados da loja** | Identidade e contato · Redes sociais · Rodapé · Google e compartilhamento |
| **Pedidos e carrinho** | Pedidos · Janela do produto · Carrinho e pedido |
| **Peça personalizada** | Faixa de destaque · Página de peça personalizada |
| **Páginas e menus** | Página Sobre · Perguntas frequentes · Páginas · Menu do topo · Nomes dos botões do menu · Links do rodapé · Política de privacidade |
| **Recursos** | Recursos da loja (estoque, personalizados, prazo, auras, link do modelo 3D) |

Outras configurações **fora** de "Site": cadastro de produto (selo, seção Destaque/Mais pedidos, aura, prazo, opções — `ProductForm.tsx`), categorias (nome, descrição, visível, aura — `CategoryManager.tsx`), auras (`AuraManager.tsx`), equipe (`TeamManager.tsx`), variáveis de ambiente de build (`.env.example`: `VITE_STORE_NAME`, `VITE_WHATSAPP_NUMBER`, `VITE_CONTACT_EMAIL`, `VITE_NICHE`, `VITE_AMBIENTE_LABEL`).

### 1.2 Como são salvas

- Tabela `public.site_settings (key text, value text)`; chave só com letras (`^[A-Za-z]{1,40}$`) e valor até 5000 caracteres (`supabase/01-tabelas.sql:64-68`). Leitura pública, escrita só admin (`03-seguranca-rls.sql:59-65`).
- **Só o que difere do padrão é gravado**; voltar ao padrão apaga a linha (`src/lib/settingsWrite.ts:33-47` `toStored`, `diffSettings`). Por isso o padrão = comportamento atual do site, sem migração de dados.
- Leitura: `mergeSettings` junta padrões + valores válidos e descarta lixo (`settings.ts:416-436`); cada campo tem validação por tipo (`validFor`, `settings.ts:380-392`).
- Fluxo "Publicar": rascunho local → `diffSettings` → `gateway.writeSettings` (upsert/delete) → guarda o valor anterior em `settingsBackup` para **um** "Desfazer" (`useAdminActions.ts`, `settingsWrite.ts`).
- Prévia: a vitrine abre num iframe `/?preview=1` e recebe o rascunho por `postMessage` (`src/lib/preview.ts`, `VitrinePreview.tsx`); em desktop ≥1280 px fica ao lado do formulário.

### 1.3 Onde são usadas

`useCatalogData` carrega `site_settings` → `mergeSettings` → `SettingsContext` (`App.tsx`) → todos os componentes da vitrine via `useSettings()`. Aparência (cor, fonte, fundo, cantos, favicon) é aplicada no `<html>` por `applyTheme` (`src/lib/theme.ts`); SEO global por `applySeo` (`src/lib/seo.ts`).

### 1.4 O que já atende aos padrões pedidos (não refazer)

| Padrão | Situação | Evidência |
|---|---|---|
| Busca de configurações | Existe, mas só dentro de "Site" | `SiteSettings.tsx` (`fieldMatches`, campo "Buscar configuração…") |
| Descrição curta por campo | Existe (`hint`) em ~metade dos campos | `settings.ts` |
| Restaurar padrão por campo/seção/tudo | Existe; o botão do campo só aparece se o valor mudou | `SiteSettings.tsx` (`resetField`, `resetSection`, `resetAll`) |
| Prévia antes de salvar | Existe, vitrine inteira | `VitrinePreview.tsx` |
| "Alterações não publicadas" + aviso ao sair | Existe (ao fechar aba e ao sair da área Site) | `SiteSettings.tsx` (`beforeunload`), `AdminView.tsx:40-50` |
| Salvo/erro | Toast de sucesso/erro; validação mostra **só o primeiro erro** em toast | `validateSettingsForm`, `SiteSettings.tsx` `handleSubmit` |
| Desfazer | Só a **última** publicação | `settingsBackup` |
| Celular | Menu vira botão + gaveta; barra de salvar fixa; prévia em tela cheia | `AdminNav.tsx`, `SiteSettings.tsx` |

---

## 2. O que está fixo no código e deveria ser configurável

Padrão da proposta: **o valor atual vira o padrão** do novo campo; nada muda visualmente até o dono editar.

### 2.1 Identidade
| Item | Hoje | Evidência |
|---|---|---|
| Cor principal | Configurável (1 cor) | `settings.ts` `primaryColor` |
| Cores de texto, fundo dos cards, links, preço, botões secundários | Fixas (cinzas/branco do Tailwind) | `tailwind.config.js`, classes `text-gray-*`, `bg-white` nos componentes |
| Fonte do site | 5 opções fixas | `theme.ts:7-13` `FONT_CHOICES` (as 13 fontes de marca existem, mas só valem para o nome da loja: `brand.ts`) |
| Raio de borda | 3 presets fixos | `theme.ts:26-30` `CARD_STYLES` |
| Modo claro/escuro | Só "cliente escolhe" ou "sempre claro"; sem "padrão escuro" | `settings.ts` `darkMode` |
| Textos do botão sol/lua e do "Pular para o conteúdo" | Fixos | `Layout.tsx` (`ColorModeButton`), `App.tsx:182` |

### 2.2 Página inicial
| Item | Hoje | Evidência |
|---|---|---|
| **Ordem** das seções (Destaques → Mais pedidos → Novidades) | Fixa | `CatalogView.tsx` (array `shelves`), `home/*.tsx` |
| Visibilidade de cada seção | Configurável (toggles) | `settings.ts` "Seções no topo", "Blocos" |
| Banners / carrossel, depoimentos, blocos de texto livres, vídeo | **Não existem** | — |
| Faixa de aviso | 1 faixa só | `settings.ts` "Faixa de aviso" |
| Título "Todos os modelos", "Por categoria", "Tudo", "Categorias" | Fixos | `CatalogView.tsx:131,206,125`, `HomeBancada.tsx:71`, `HomeVitrine.tsx:71`, `HomeMista.tsx:20` |
| Placeholder da busca ("Buscar modelos...", "O que você procura?") | Fixos | `CatalogView.tsx:116`, `HomeBancada.tsx:43`, `shared.tsx:86` |
| Foto da categoria nos "Atalhos/Por categoria" | Usa foto de um produto; categoria não tem imagem | `HomeBancada.tsx` `CategoryTiles`; `categories` sem coluna de imagem (`01-tabelas.sql:4-11`) |

### 2.3 Textos (microcopy) — hoje no código
| Área | Exemplos fixos | Evidência |
|---|---|---|
| Vitrine/lista | "Esgotado", "Foto em breve", "Indisponível", "Escolher opções", "Adicionar", "No orçamento", "Ver mais", "Limpar busca", "Nenhum produto encontrado…", "Mais recentes / Menor preço / Maior preço", "Ordenar por" | `CatalogView.tsx:182-184,246,291,298`, `home/shared.tsx:104-141,179-231` |
| Erro/carregamento | "Não conseguimos carregar o catálogo…", "Tentar novamente", "Carregando…", "Esse produto não está mais disponível" | `CatalogView.tsx:94-96`, `App.tsx:44,101,141,205` |
| Janela do produto | "Descrição", "Copiar link", "N em estoque", "Escolha: …" | `ProductDetailModal.tsx:130,157` |
| Carrinho/checkout | "Informações para contato", "Seu nome", "Seu WhatsApp", "Como prefere receber?", "Retirada/Entrega", "Endereço…", "Itens/Total", "Voltar", "Concluir", "Enviando pedido…", placeholders | `CartDrawer.tsx:96-256` |
| Pedido personalizado | "Solicitação enviada!", "Voltar para a loja", "Enviar outra solicitação", "Foto ou Referência do Modelo", "Observações e detalhes…", placeholders | `CustomRequestView.tsx:77-186` |
| Rodapé | "WhatsApp", "Política de privacidade", "Área do lojista", "© ano" | `Layout.tsx:206-209` |
| Mensagem do WhatsApp | A abertura é editável, mas "Total:", "Retirada", "Entrega:", "Observações:" são fixos | `format.ts:82-84` |
| Política de privacidade | Texto padrão fixo (pode ser substituído inteiro por `privacyText`) | `PrivacyView.tsx:14-59` |
| Sobre | "Perguntas frequentes", "Em breve, mais informações por aqui." | `AboutView.tsx:36,52` |

### 2.4 Navegação
| Item | Hoje | Evidência |
|---|---|---|
| Menu do topo e rodapé (itens, ordem, links externos) | Configurável | `menus.ts`, `MenusAndPages.tsx` |
| Nomes dos botões Vitrine/Sobre/Personalizado | Configurável | `settings.ts` "Nomes dos botões do menu" |
| Ordem das categorias | Configurável (arrastar) | `CategoryManager.tsx`, `sort_order` |
| Rótulos do rodapé e "Painel/Sair" do cabeçalho do lojista | Fixos | `Layout.tsx:122-178,206-209` |

### 2.5 Produtos
| Item | Hoje | Evidência |
|---|---|---|
| Itens por vez ("Ver mais") | 12 fixo | `CatalogView.tsx:24` `PAGE_SIZE`, `home/shared.tsx` |
| Colunas no computador | Configurável | `gridCols` |
| Ordem padrão | Configurável (3 opções); sem "mais pedidos"/"A–Z" | `defaultSort` |
| "Poucas unidades" | ≤ 3 fixo; novidades = 30 dias, máx. 8; relacionados = 4 | `lib/catalog.ts:6-8,55` |
| O que aparece no card (descrição, prazo, estoque baixo, selo) e na janela do produto | Parcial: some descrição/prazo no celular por CSS (`hidden sm:…`); selo/estoque/prazo têm toggles só de "recurso" | `CatalogView.tsx:304-316` (`hidden sm:block`), `settings.ts` "Janela do produto" |
| Botão "copiar link" e compartilhar | Sempre visível | `ProductDetailModal.tsx:155-160` |
| Moeda e formato | R$ pt-BR fixo | `lib/format.ts` `brl` |
| Foto: tamanho/qualidade | Fixos | `lib/images.ts:17-22` |

### 2.6 Contato e redes
| Item | Hoje | Evidência |
|---|---|---|
| WhatsApp, e-mail, nome, Instagram/TikTok/Facebook/YouTube, linha extra do rodapé | Configuráveis | `settings.ts` "Identidade e contato", "Redes sociais", "Rodapé" |
| **Endereço físico, horário de atendimento, link de mapa, outras redes (Pinterest, X, LinkedIn)** | **Não existem** (horário só como "linha extra" livre) | `settings.ts` |
| E-mail aparece só na política de privacidade | Não aparece no rodapé/contato | `PrivacyView.tsx:52` |

### 2.7 SEO
| Item | Hoje | Evidência |
|---|---|---|
| Título, descrição e imagem **globais** | Configuráveis | `settings.ts` "Google e compartilhamento"; `seo.ts` |
| Por página (Sobre, páginas extras) | Título automático "X \| Loja"; **sem descrição/imagem própria** | `AboutView.tsx:12-14`, `PageView.tsx:16-18` |
| Por produto | Só título automático; sem descrição/imagem própria; **crawlers não executam JS** (WhatsApp mostra o global) | `App.tsx:105-111`; `seo.ts:1-2` |
| Texto do `index.html` ("Catálogo 3D") | Fixo no HTML estático | `index.html:8,13-14` |

### 2.8 Liga/desliga (já existem) e o que falta
Existem: estoque, pedidos personalizados, prazo, auras, link 3D, relacionados, selo "últimas unidades", busca, esconder preços, pausar pedidos, entrega, observações, Sobre, seções Destaques/Mais pedidos/Novidades, faixa personalizada, passo a passo, abas de categoria, mosaico, atalhos de categoria.
**Faltam toggles para:** ordenação visível ao cliente, botão copiar link, menu de categorias, botão modo escuro, "Ver mais"/paginação, descrição no card, prazo no card, contador de estoque na janela do produto, links "Área do lojista" e "Política de privacidade" no rodapé (a política é obrigação legal: manter ligada por padrão).

---

## 3. Nova estrutura do painel (árvore)

Princípio: **o dono pensa em tarefas** ("trocar a cor", "mudar o WhatsApp", "pausar pedidos"), não em arquivos. Cada configuração fica a no máximo **2 cliques** do menu (grupo → seção) ou a **1 busca**. O menu "Site" passa a se chamar **"Personalizar loja"**; Vendas, Catálogo e Sistema não mudam.

```
Personalizar loja
├─ 1. Aparência
│   ├─ Identidade visual ........ logo · formato da logo · tamanhos · ícone da aba · nome da loja no topo (fonte, tamanho, cor) · frase
│   ├─ Cores e fonte ............ temas prontos · cor principal · fundo · fonte do site · modo claro/escuro [+ cores de texto/destaque: etapa futura]
│   └─ Cantos e cards ........... cantos (3 presets + controle de raio) · produtos por linha
├─ 2. Página inicial
│   ├─ Modelo ................... Clássico · Vitrine · Bancada · Vitrine + Bancada
│   ├─ Seções e ordem ........... lista arrastável: capa · faixa "Peça personalizada" · Destaques · Mais pedidos · Novidades · Categorias com foto · Passo a passo — cada uma com liga/desliga e título
│   ├─ Capa e título ............ imagem · título · texto de apresentação
│   ├─ Faixa de aviso ........... texto · cor · imagem · até quando
│   └─ Passo a passo do pedido .. 3 passos · texto do pedido personalizado
├─ 3. Loja e produtos
│   ├─ Lista de produtos ........ ordem padrão · busca · mostrar preços · itens por vez · "Ver mais"
│   ├─ Card do produto .......... descrição · prazo · selo · estoque baixo · botão do card
│   ├─ Janela do produto ........ relacionados · copiar link · contador de estoque · selos (cor/texto)
│   └─ Estoque e disponibilidade  controlar estoque · limite de "poucas unidades" · selo automático
├─ 4. Pedidos e carrinho
│   ├─ Regras ................... pausar pedidos · mínimo · entrega · observações · aviso de frete
│   ├─ Carrinho e envio ......... textos do carrinho · botão · mensagem depois de enviar
│   ├─ Mensagem do WhatsApp ..... abertura do pedido e do personalizado · rótulos (Total, Retirada, Entrega, Observações)
│   └─ Peça personalizada ....... aceitar pedidos · faixa de destaque · página e mensagens
├─ 5. Textos e mensagens        (um lugar só para todo texto de botão, aviso e estado vazio)
│   ├─ Vitrine .................. Esgotado, Foto em breve, Ver mais, busca, ordenação…
│   ├─ Carrinho e formulários ... rótulos, placeholders, botões
│   ├─ Estados vazios e erros ... sem resultados, falha de carregamento, produto indisponível
│   └─ Rodapé e menus ........... rótulos do rodapé, "Área do lojista", "Política de privacidade"
├─ 6. Menus e páginas
│   ├─ Menu do topo · Links do rodapé · nomes dos botões
│   ├─ Páginas extras · Página "Sobre" · Perguntas frequentes
│   └─ Política de privacidade
├─ 7. Contato e redes
│   ├─ Contato ................... nome da loja · WhatsApp · e-mail · endereço · horário · link do mapa  (endereço/horário/mapa são novos)
│   ├─ Redes sociais ............. Instagram · TikTok · Facebook · YouTube [+ outras]
│   └─ Rodapé .................... linha extra · o que mostrar (contato, redes)
├─ 8. Google e compartilhamento (SEO)
│   ├─ Site todo ................. título · descrição · imagem
│   ├─ Por página ................ Sobre e páginas extras: título · descrição · imagem
│   └─ Por produto ............... modelo de título/descrição e imagem automática (depende de Worker: ver etapa 10)
└─ 9. Avançado
    ├─ Recursos da loja .......... estoque · personalizados · prazo · auras · link 3D
    ├─ Histórico e desfazer ...... últimas publicações · restaurar uma versão
    ├─ Exportar / importar ....... backup das configurações em arquivo
    └─ Restaurar padrão .......... por grupo · tudo
```

**Onde cada seção atual vai** (nenhuma é removida; nenhum dado é perdido, pois as chaves do banco não mudam de nome):

| Seção atual | Novo lugar |
|---|---|
| Modelo da página inicial | Página inicial › Modelo |
| Blocos da página inicial · Seções no topo da vitrine | Página inicial › Seções e ordem |
| Passo a passo do pedido · Faixa de aviso · Capa da vitrine · Página inicial (vitrine) | Página inicial › (mesmos nomes) |
| Exibição da vitrine | Loja e produtos › Lista de produtos |
| Janela do produto | Loja e produtos › Janela do produto (+ selos) |
| Cores e fonte · Logo · Nome da loja no topo · Estilo dos cards | Aparência |
| Identidade e contato · Redes sociais · Rodapé | Contato e redes |
| Google e compartilhamento | SEO |
| Pedidos · Carrinho e pedido | Pedidos e carrinho |
| Faixa de destaque · Página de peça personalizada | Pedidos e carrinho › Peça personalizada |
| Páginas · Menu · Nomes dos botões · Links do rodapé · Sobre · FAQ · Privacidade | Menus e páginas |
| Recursos da loja | Avançado › Recursos |

---

## 4. Padrões de interação

| Padrão | Como fica | Já existe? |
|---|---|---|
| **Busca** | Campo no topo do painel (e atalho `Ctrl+K`) que procura em **todas** as configurações **e** nas telas (Produtos, Pedidos, Categorias, Equipe…). Resultado mostra o caminho ("Aparência › Cores e fonte › Cor principal") e leva direto ao campo, com destaque. Cada campo ganha sinônimos (`keywords`: "zap" → WhatsApp, "frete" → entrega) e a busca ignora acento (já faz). | Parcial (só dentro de "Site") |
| **Cartão de campo** | Rótulo + 1 linha de descrição + controle + linha "**Padrão:** X" (com cor/amostra) + botão **Restaurar**; ponto "modificado" quando difere do publicado. Toda configuração ganha descrição (hoje cerca de metade). | Parcial |
| **Restaurar padrão** | Por campo (sempre visível quando difere do padrão, mostrando o valor que voltará), por seção e por grupo (novo), e "tudo" em Avançado. Sempre com confirmação e valendo só no rascunho até publicar. | Campo/seção/tudo: sim; grupo: não |
| **Prévia** | Mantém a prévia ao vivo e adiciona **prévia contextual**: ao editar texto do carrinho, abre o carrinho; ao editar a janela do produto, abre um produto; ao editar a faixa/rodapé, rola até ela. | Prévia geral: sim; contextual: não |
| **Salvar/erro** | Barra fixa: "**3 alterações não publicadas**" + **Revisar** (lista antes → depois por campo) + **Publicar**. Erros aparecem **no campo** (borda vermelha + mensagem) e a tela rola até o primeiro, em vez de um toast. Sucesso: toast com "Desfazer". | Parcial (toast do 1º erro) |
| **Alterações não salvas** | Aviso ao sair do painel, ao trocar de grupo e ao fechar a aba; o rascunho sobrevive à troca de grupo (já acontece). | Fechar aba e sair de "Site": sim |
| **Histórico** | Últimas 10 publicações com data e quantos campos mudaram; restaurar qualquer uma. | Só a última (1 nível) |
| **Celular** | Grupos e seções em acordeão de largura total; alvos de toque ≥ 44 px; barra de publicar compacta (contador + botão); prévia em tela cheia; busca fixa no topo. | Base existe; ajustes |
| **Segurança contra "quebrar o site"** | Nada vai ao ar sem Publicar; validação por tipo (já existe `validFor`); aviso de contraste ao escolher cores (já existe para a principal; estender); limites de tamanho visíveis (contador de caracteres). | Parcial |

---

## 5. Mudanças necessárias no banco

**A grande maioria não exige mudança de schema**: `site_settings` aceita qualquer chave nova (só letras, até 40) com valor até 5000 caracteres.

| Necessidade | Mudança | Obrigatória? |
|---|---|---|
| Novos textos, toggles, ordem das seções (guardada como um JSON em uma chave, ex.: `homeSections`), tamanhos, endereço/horário, SEO global e de páginas extras (dentro do JSON de cada página) | **Nenhuma** (novas chaves em `site_settings`; padrão = valor atual; leitura por `mergeSettings`) | — |
| Etapas 1–9 abaixo | **Nenhuma** | — |
| Histórico com várias versões e "quem mudou" (etapa 11) | Nova tabela `site_settings_history` (chave, valor anterior, data, e-mail) + RLS só admin | Opcional; **perguntarei antes** |
| SEO **por produto** (título/descrição/imagem próprios) | Colunas `seo_title`, `seo_description` em `products` | Opcional (etapa 10); **perguntarei antes** |
| Foto própria da categoria (para "Por categoria") | Coluna `image_url` em `categories` | Opcional; **perguntarei antes** |
| Limite de 5000 caracteres por valor | Suficiente: cada texto é curto; a ordem das seções cabe em 1 chave | — |
| Prévia aceita no máximo 500 linhas (`preview.ts` `cleanRows`) | Hoje há 114 campos; ~90 textos novos cabem, mas o limite será subido junto da etapa 5 | Ajuste de código |
| Versão do banco (`app_meta.schema_version`) | Só sobe se houver SQL novo | Só nas etapas opcionais |

---

## 6. Plano de implementação (etapas pequenas e independentes)

Regras para **todas**: padrão = comportamento atual; chaves existentes intocadas; testes unitários + e2e existentes continuam verdes; cada etapa pode ir à `teste` sozinha. Estimativa: P = até ½ dia, M = 1–3 dias, G = mais de 3.

| # | Etapa | O que muda | Banco | Esforço | Risco |
|---|---|---|---|---|---|
| 1 | **Reorganizar menus e grupos** | Novos 9 grupos e nomes (seção 3), seções realocadas, "Site" → "Personalizar loja". Só metadados (`GROUPS`, `AdminNav`). Chaves do banco iguais. | Não | P–M | Baixo |
| 2 | **Busca global** | Busca no topo do painel + `Ctrl+K`, acha configurações e telas; caminho do resultado; `keywords` por campo. | Não | M | Baixo |
| 3 | **Cartão de campo** | "Padrão: X", ponto "modificado", restaurar por grupo, descrição em todos os campos, erro no próprio campo. | Não | M | Baixo |
| 4 | **Revisar e publicar** | Contador de alterações, "Revisar" (antes → depois), aviso ao trocar de grupo, barra compacta no celular. | Não | M | Baixo |
| 5 | **Textos e mensagens** (em 3 lotes) | Extrai textos fixos para o schema: (a) vitrine e botões, (b) carrinho/formulários/pedido personalizado, (c) estados vazios, erros, rodapé e rótulos da mensagem do WhatsApp. Hook `useText(chave)` com o texto atual como padrão. | Não | G (3×M) | Médio: muitos arquivos; testes e2e dependem de textos (usam os padrões) |
| 6 | **Regras da vitrine** | Itens por vez, limite de "poucas unidades", dias de "novidade", quantidade de relacionados, toggles de card/janela (descrição, prazo, copiar link, contador, ordenação visível). | Não | M | Baixo |
| 7 | **Seções da página inicial: ordem e visibilidade** | Lista arrastável nas 4 versões da home; chave `homeSections`; padrão = ordem atual. | Não | M–G | Médio |
| 8 | **Identidade ampliada** | Controle de raio, fonte do site entre as de marca, "modo escuro como padrão", cores de destaque/texto com checagem de contraste. | Não | M | Médio (Tailwind usa variáveis; precisa revisar o modo escuro) |
| 9 | **Contato completo** | Endereço, horário, link de mapa, mais redes; mostrar no rodapé/contato com toggles. | Não | P–M | Baixo |
| 10 | **SEO por página e por produto** | Descrição/imagem para Sobre e páginas extras (dentro do JSON de cada página); SEO por produto + Worker que injeta metatags para WhatsApp/Google (ver `ANALISE-CATALOGO.md`, itens 4 e 7). | Sim (opcional): colunas em `products` | G | Médio (infraestrutura Cloudflare) |
| 11 | **Histórico multi-nível, exportar/importar** | Últimas 10 publicações, restaurar versão, backup das configurações em arquivo. | Sim (opcional): tabela de histórico | M | Baixo |
| 12 | **Prévia contextual** | A prévia abre no carrinho, produto ou rodapé conforme o campo editado. | Não | M | Baixo |
| 13 | **Blocos novos da home** (depoimentos, banners/links, texto livre) | Novos tipos de seção na lista da etapa 7. | Não (JSON em chave) ou tabela | G | Médio |

**Sugestão de ordem:** 1 → 2 → 3 → 4 (resolve a "dificuldade de achar" sem tocar na vitrine) → 9 → 6 → 5(a,b,c) → 7 → 8 → 12 → 11 → 10 → 13. As etapas 1 a 4 não alteram nada que o cliente vê.

---

## 7. Decisões que preciso de você

1. **Nome do menu:** "Personalizar loja" serve, ou prefere manter "Site"?
2. **Textos:** quer que **todos** os textos da vitrine fiquem editáveis (etapa 5, ~90 campos) ou só os mais importantes (botões do carrinho, estados vazios, rodapé)?
3. **Política de privacidade e "Área do lojista":** manter os links no rodapé sempre visíveis (recomendado pela LGPD) ou permitir esconder?
4. **Histórico (etapa 11) e SEO por produto (etapa 10):** posso propor o SQL quando chegar nelas?
5. **Quais etapas libera primeiro?** Recomendo 1–4 juntas.

---

## 8. [NÃO VERIFICADO]

| Item | O que checar |
|---|---|
| Quantos textos fixos existem ao todo | Os números aqui vêm de busca por texto em JSX dos arquivos da vitrine (`src/features/vitrine`, `Layout.tsx`, `App.tsx`); textos montados em funções (`lib/format.ts`, mensagens de toast) podem ter escapado. A etapa 5 começa por um levantamento completo. |
| Contraste dos textos quando o dono escolher cores novas (etapa 8) | Rodar axe/Lighthouse com temas de teste; hoje só a cor principal tem aviso (`isTooLight`). |
| Comportamento do modo escuro com raio/cores novos | Revisar `tailwind.config.js` (`--d-blue-*`, `DARK_SURFACE`) junto da etapa 8. |
| Se o dono prefere configurar por busca ou por menu | Não há métricas de uso do painel; validar a nova estrutura com ele (ou a pessoa que administra a loja) antes das etapas 5–8. |
| Valor atual dos campos em produção | Os padrões e o schema vêm do código; quais chaves o banco real já tem (e quais foram personalizadas) só se vê consultando `site_settings` do projeto real. |

---

**Parando aqui, como pedido.** Aguardo sua aprovação e a lista de etapas liberadas; nenhum arquivo do projeto foi alterado nesta fase.

---

# Fase 2 — o que foi implementado (branch `personalizar-loja`)

Todas as etapas liberadas foram feitas **sem alterar o banco**: tudo usa a tabela `site_settings` que já existia, com padrões iguais ao comportamento anterior (nada muda na vitrine até o dono editar). Nenhuma configuração existente foi removida ou renomeada.

| Etapa | Situação | Onde |
|---|---|---|
| 1 Menus e grupos por tarefa (9 grupos, "Personalizar loja") | ✅ | `src/lib/settings.ts` (`GROUPS`), `AdminNav.tsx` |
| 2 Busca global (`Ctrl+K`) com sinônimos | ✅ | `CommandPalette.tsx`, `settingsMeta.ts`, `settingsHints.ts` |
| 3 Cartão de campo: "O padrão é…", "Alterado", erro no próprio campo, voltar área ao padrão, explicação em todos os campos | ✅ | `SiteSettings.tsx`, `settingsWrite.ts` (`findFormProblem`) |
| 4 Revisar alterações (antes → depois) e contador | ✅ | `SiteSettings.tsx` |
| 5 Textos e mensagens (70 textos editáveis) | ✅ | `src/lib/texts.ts`, componentes da vitrine |
| 6 Regras da vitrine (itens por vez, "poucas unidades", novidades, relacionados, descrição/prazo no card, ordem, copiar link, estoque na janela) | ✅ | `settings.ts`, `catalog.ts` |
| 7 Ordem e visibilidade das seções da página inicial | ✅ | `homeSections.ts`, `HomeSectionsEditor.tsx` |
| 8 Identidade: mais cantos, fonte de marca no site, modo escuro por padrão | ✅ (cores extras de texto/destaque **não** — risco de contraste; ver abaixo) | `theme.ts`, `siteFont.ts`, `colorMode.ts` |
| 9 Contato completo (endereço, horário, mapa, e-mail no rodapé, 3 redes novas, esconder "Área do lojista") | ✅ | `settings.ts`, `Layout.tsx` |
| 10 SEO por página (Sobre e páginas extras: descrição e imagem) | ✅ parcial — **por produto fica para depois (precisa de SQL e de Worker)** | `pages.ts`, `seo.ts`, `PageView.tsx`, `AboutView.tsx` |
| 11 Backup das configurações em arquivo (baixar/carregar como rascunho) | ✅ parcial — **histórico com várias versões precisa de SQL** | `settingsBackup.ts`, `BackupPanel.tsx` |
| 12 Prévia acompanha o campo em edição (carrinho, produto, rodapé, pedido personalizado) | ✅ | `preview.ts`, `VitrinePreview.tsx` |
| 13 Blocos extras da página inicial (texto, banner, depoimentos; até 6) | ✅ | `blocks.ts`, `ExtraBlock.tsx` |

Decisões que eu tomei no seu lugar (você não respondeu): menu chamado **"Personalizar loja"**; **todos** os textos principais editáveis; o link da **política de privacidade fica sempre visível** (só o texto muda) e só "Área do lojista" pode ser escondido.

## O que ficou de fora, e por quê

1. **Cores extras (texto, links, destaque)**: o tema inteiro usa classes do Tailwind (`text-gray-*`, `bg-white`…); trocar isso exige revisar o modo escuro e o contraste de cada tela. É o item de maior risco visual; proponho tratar em separado, com checagem de contraste automática.
2. **Histórico com várias versões** e "quem mudou" — precisa de tabela nova. SQL proposto (**não aplicado**):
   ```sql
   create table if not exists public.site_settings_history (
     id         uuid primary key default gen_random_uuid(),
     created_at timestamptz not null default now(),
     changed_by text,
     changes    jsonb not null   -- { chave: { de: valor|null, para: valor|null } }
   );
   alter table public.site_settings_history enable row level security;
   create policy "historico admin le" on public.site_settings_history for select to authenticated using (public.is_admin());
   create policy "historico admin grava" on public.site_settings_history for insert to authenticated with check (public.is_admin());
   ```
3. **SEO por produto** — colunas `seo_title`, `seo_description` (e `seo_image`) em `products`, mais um Worker para entregar as metatags a WhatsApp/Google (ver `ANALISE-CATALOGO.md`, itens 4 e 7).
4. **Foto própria da categoria** — coluna `image_url` em `categories` (hoje "Por categoria" usa a foto de um produto).
5. **Textos que continuam no código**: mensagens de erro de gravação do painel (só o dono vê), política de privacidade padrão (já substituível inteira em "Política de privacidade"), formatação de moeda.
