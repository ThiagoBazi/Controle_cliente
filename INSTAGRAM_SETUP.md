# Instagram — configuração da integração

O código já está conectado à Instagram Graph API usando o **Instagram User ID `17841403141975462`** e o fluxo **Facebook Login** validado no Graph API Explorer.

## 1. Token

Nunca coloque o token em um arquivo público ou em uma variável `VITE_*`. No ambiente do servidor/hospedagem, crie uma destas variáveis:

```env
INSTAGRAM_ACCESS_TOKEN=seu_token
```

ou, se você estiver usando um token de longa duração:

```env
INSTAGRAM_LONG_LIVED_TOKEN=seu_token
```

`INSTAGRAM_LONG_LIVED_TOKEN` tem prioridade quando as duas existem.

> O token que apareceu em capturas de tela durante os testes deve ser considerado exposto. Gere um novo antes de publicar.

## 2. Teste local

Copie `.env.example` para `.env`, preencha o token e rode:

```bash
npm install
npm run dev
```

A seção **Meus números** deve preencher automaticamente e o botão **Atualizar dados do Instagram** força uma nova consulta.

## 3. Publicação

Cadastre o token como **secret / environment variable do servidor** na hospedagem. Não faça commit de `.env`; ele já está no `.gitignore`.

## O que o backend busca

- perfil, bio, seguidores e número de publicações;
- até 300 conteúdos do histórico disponível (com limite de segurança), com mídia, link, curtidas e comentários;
- insights por mídia quando a Meta disponibiliza (`reach`, `shares`, `saved`, `views`);
- insights de conta (`reach`, `profile_views`, `accounts_engaged`, `total_interactions`).

O token é enviado à Meta pelo header `Authorization: Bearer ...` no servidor e nunca é devolvido ao navegador.
