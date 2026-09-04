# Integração com a Instagram Graph API

O mídia kit vai buscar seus dados reais do Instagram (perfil, posts e métricas) através de uma função segura no backend. O token nunca aparece no navegador nem no código.

## Como vai funcionar

1. Você salva o token de acesso da Meta num campo seguro (secret `INSTAGRAM_ACCESS_TOKEN`). Ele fica criptografado no backend.
2. O Instagram User ID `17841403141975462` fica como configuração fixa no servidor.
3. Ao abrir o mídia kit, o site chama a função do backend, que conversa com a Meta e devolve só os dados prontos.
4. Enquanto carrega, aparece um estado de carregamento; se a Meta falhar, aparece uma mensagem amigável explicando o motivo (token expirado, permissão faltando, etc.).
5. Um botão **"Atualizar dados do Instagram"** força uma nova busca a qualquer momento, mostrando a hora da última atualização.

## O que será buscado

- **Perfil**: username, nome, foto, bio, seguidores, seguindo, total de publicações.
- **Conteúdo**: últimos posts/reels — id, legenda, tipo, imagem/vídeo, link, data e thumbnail quando existir.
- **Métricas por mídia** (quando a Meta liberar para aquele tipo): curtidas, comentários, alcance, compartilhamentos, salvamentos e visualizações.
- **Insights da conta** (janela dos últimos 30 dias): alcance, contas engajadas, total de interações e atividade no perfil.

Regra firme: nada de número inventado. Se a Meta não devolver uma métrica, o mídia kit mostra "—" ou simplesmente omite o item, com uma nota discreta de "não disponível pela API".

## Onde isso aparece no mídia kit

- **Meus números**: seguidores, alcance, interações e média de visualizações — todos com a animação de contagem que já existe.
- **Vídeos em destaque**: passam a listar os reels/posts reais mais recentes, com thumbnail, link para o Instagram e views/curtidas.
- **Contato / redes**: o @ e a contagem de seguidores vêm da API.
- Blocos de gênero, idade e localização continuam como estão hoje (a API só entrega esses dados demográficos em contas com volume mínimo; se vierem, uso-os; se não, mantenho os valores atuais editáveis).

## Ordem de execução

1. Pedir o `INSTAGRAM_ACCESS_TOKEN` no formulário seguro de secrets.
2. Reescrever a função de backend `instagram-media-kit` (perfil + mídias + insights, com tratamento de erro por bloco).
3. Atualizar o mídia kit para consumir os dados, com carregamento, erro e botão de atualizar.
4. Testar chamando a função e conferindo o retorno real da sua conta.

### Detalhes técnicos

- Este projeto roda em TanStack Start: a função segura é um `createServerFn` (mesmo papel e mesma segurança de uma edge function, e é o padrão suportado aqui). Arquivo: `src/lib/instagram.functions.ts`, com a função exportada `instagramMediaKit`.
- Endpoints Graph API v21.0:
  - `GET /{ig-user-id}?fields=username,name,profile_picture_url,biography,followers_count,follows_count,media_count`
  - `GET /{ig-user-id}/media?fields=id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,like_count,comments_count&limit=12`
  - `GET /{media-id}/insights?metric=reach,shares,saved,views` (métricas variam por `media_type`; erro em uma mídia não derruba as demais)
  - `GET /{ig-user-id}/insights?metric=reach,accounts_engaged,total_interactions,profile_views&metric_type=total_value&period=day&since=&until=` (janela de 30 dias)
- Token lido só dentro do `.handler()` via `process.env['INSTAGRAM_ACCESS_TOKEN']`; ID em constante no módulo servidor. O retorno é um DTO limpo — nunca inclui token nem headers.
- Erros da Meta: capturados por bloco, retornados como `{ ok: false, reason, code }` por seção, para o front distinguir "indisponível" de "zero".
- Front: `useQuery` com `staleTime` de 5 min + `refetch()` no botão; skeletons durante o carregamento; `AnimatedNumber` só quando o valor existir.
