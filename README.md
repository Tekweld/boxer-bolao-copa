# boxer-bolao-copa

Sistema interno de bolão da Copa do Mundo 2026 — Boxer Soldas.

## Páginas

| Arquivo | Descrição |
|---|---|
| `index.html` | Login e cadastro via Supabase Auth |
| `palpites.html` | Palpites por rodada com trava automática de horário |
| `classificacao.html` | Ranking geral em tempo real |
| `admin.html` | Painel admin: lançar resultados, recalcular pontos |

## Configuração

Em cada arquivo HTML, substitua as duas constantes no topo do bloco `<script>`:

```js
const SUPABASE_URL = 'COLE_AQUI_SUA_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'COLE_AQUI_SUA_SUPABASE_ANON_KEY';
```

Obtenha esses valores em: **Supabase → projeto `boxer-sistemas` → Settings → API**.

## Banco de dados

Projeto Supabase: `boxer-sistemas`  
Schema: `app_bolao`  
Todas as queries usam `.schema('app_bolao')`.

## Regras de pontuação

| Situação | Pontos |
|---|---|
| Placar exato | 12 |
| Resultado certo + placar de um time | 9 |
| Só resultado certo | 6 |
| Errou resultado, acertou gols de um time | 3 |
| Errou tudo | 0 |

## Deploy

Hospedagem via GitHub Pages — organização Tekweld, repositório `boxer-bolao-copa`, branch `main`.

## Stack

- Frontend: HTML + JavaScript puro
- Banco/Auth: Supabase (`boxer-sistemas`, schema `app_bolao`)
- Fonte: Outfit (Google Fonts)
