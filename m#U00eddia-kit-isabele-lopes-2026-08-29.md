# Mídia Kit — Isabele Lopes

Ajustes na página inicial do mídia kit com base no feedback:

## Conteúdo
- **Nome**: trocar "Seu Nome Sobrenome" por **Isabele Lopes** (com "Lopes" em itálico, mantendo o estilo atual do hero). Atualizar também o rodapé ("© Isabele Lopes").
- **Tags do hero**: trocar "beleza · moda · lifestyle" por **lifestyle · viagem · beleza**.
- **Foto do hero**: substituir o retrato único por uma **tira de fotos estilo cabine fotográfica** (photobooth strip) — 3 fotos empilhadas na vertical dentro de uma moldura clara levemente inclinada, com o selo "ao vivo" e o balão "deu match?", como na referência enviada. Como as fotos da Isabele ainda não foram enviadas, gero 3 imagens placeholder em preto e branco com sensação de movimento; depois é só você me mandar suas fotos que eu troco.

## Paleta
- **Amarelo manteiga mais claro/suave**: clarear o `--butter` e `--secondary` (ex.: para um tom tipo `#fdffc9` / oklch ~0.995 0.04 108), mantendo o bordô `#860c0c` e o branco como estão.
- Ajustar contrastes derivados (bordas, selo "ao vivo", botão de contato) se necessário após o clareamento.

## Estrutura (mantida)
- Header com navegação, hero, marquee, sobre mim, meus números, vídeos em destaque, parceiros, contato e footer — sem mudanças de layout, apenas os conteúdos e a foto do hero acima.

## Técnico
- Editar `src/routes/index.tsx` (nome, tags, seção da foto do hero) e `src/styles.css` (token `--butter`/`--secondary` mais claros).
- Gerar 3 imagens de cabine fotográfica (P&B, movimento) em `src/assets/` e compor a tira em CSS (moldura clara, leve rotação, selo "ao vivo").
- Atualizar metadados (title/og) com o nome Isabele Lopes.
