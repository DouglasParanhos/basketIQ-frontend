# BasketIQ Constitution (Frontend)

Princípios que governam a especificação, implementação e teste da PWA do BasketIQ. A constituição de
produto é partilhada com o repositório Backend (`../Backend/.specify/memory/constitution.md`); este
ficheiro repete os princípios de produto e acrescenta as regras específicas do cliente. Fontes:
`Documentation/` — Especificação Funcional, Especificação Técnica e Plano de Testes, v1.2.

## Core Principles

### I. Processamento local primeiro (princípio de produto)

O cliente nunca envia documentos a terceiros: o ficheiro vai apenas para o storage privado através do
URL pré-assinado emitido pela API, e o processamento (texto de PDF → OCR local → parser → LLM local →
fallback externo controlado) acontece no backend. A interface mostra o estado do processamento e não
toma decisões de extração.

### II. Dinheiro exato

Valores monetários circulam como inteiros em cêntimos, exatamente como a API os devolve. O cliente
só formata para apresentação (`Intl.NumberFormat` pt-PT) e converte o que a pessoa escreve ("3,49",
"1.234,56") para cêntimos sem ponto flutuante (`parseEurToCents`). Quantidades circulam como
strings decimais. Nenhum total é calculado em `number` com casas decimais.

### III. Nunca inventar valores

O que a API devolve como `null` aparece como em falta e pedido à pessoa. A interface envia apenas os
campos que a pessoa alterou (o resto mantém a confiança original). A descrição original da nota é
sempre mostrada e nunca substituída pelo nome do produto.

### IV. Privacidade no cliente

- O service worker não guarda respostas da API (`/v1/**` fora do precache e sem runtime caching).
- Sem CDNs nem fontes de terceiros: tipos de letra servidos pela própria aplicação (`@fontsource`).
- HEIC é convertido para JPEG apenas para pré-visualização; sem edição é enviado o original.
- Sessão em cookies `HttpOnly` geridos pelo backend (BFF); o cliente só lê o cookie CSRF.
- Nenhum dado pessoal é guardado em `localStorage`.

### V. Mobile-first e acessível

Desenhada primeiro para 320–430 px e uso com uma mão: navegação inferior com quatro destinos
(Resumo, Compras, Adicionar, Definições), alvos de toque ≥ 44 px, sem scroll horizontal. Meta WCAG 2.2
AA verificada com axe em CI (modo claro e escuro). A cor nunca é o único sinal: baixa confiança e erros
levam ícone e texto. Todos os gráficos têm alternativa textual (tabela). Movimento respeita
`prefers-reduced-motion`.

### VI. Contrato tipado

Os tipos da API são gerados do OpenAPI do backend (`pnpm gen:api` → `src/api/schema.d.ts`) e todas as
chamadas passam pelo cliente tipado (`openapi-fetch`). Alterações de contrato começam no backend.

### VII. Rastreabilidade

Cada critério de aceitação cita o identificador do Plano de Testes (F-xx, RF-xx, §10, §11) e o teste
que o verifica. Os testes do frontend levam o identificador no nome (`F-13: …`). Cenários verificados
apenas no backend ficam indicados como tal.

### VIII. Simplicidade

Sem estado global além da cache de servidor (TanStack Query) e do URL (filtros, período). Sem
bibliotecas de UI genéricas: componentes próprios mínimos. Funcionalidades fora do âmbito do MVP não
entram por antecipação.

## Restrições técnicas

- React 19 + TypeScript 5.9, Vite 7, Tailwind CSS 4, React Router 7, TanStack Query 5, Recharts 3,
  vite-plugin-pwa; pnpm.
- A API é servida na mesma origem (proxy Vite em desenvolvimento, reverse proxy em produção).
- Interface em português europeu; datas e horas de compra em Europe/Lisbon.

## Fluxo de desenvolvimento e qualidade

- spec-kit: requisito → cenário → critério de aceitação → teste (`specs/NNN-*/spec.md`).
- CI obrigatório: `tsc -b`, ESLint (incluindo jsx-a11y), Vitest, build de produção, auditoria de
  dependências e Playwright (projeto `mock`: axe, larguras de ecrã, fluxos com API simulada).
- O projeto Playwright `stack` corre localmente contra o backend real com o OIDC de teste.

## Governance

Esta constituição prevalece sobre convenções locais e não pode contradizer a constituição de produto
do Backend. Alterações exigem nova versão (SemVer) e revisão das specs afetadas.

**Version**: 1.0.0 | **Ratified**: 2026-10-15 | **Last Amended**: 2026-10-15
