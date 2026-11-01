# Specification Quality Checklist: Início

**Purpose**: Validar a completude e a qualidade da spec antes do plano
**Created**: 2026-10-31
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Sem detalhes de implementação além do contrato (os nomes dos campos e do endpoint vêm da spec 014 do backend e são o contrato; não há bibliotecas nem estrutura de código)
- [x] Centrada no valor para a pessoa (meta, média, vazios)
- [x] Escrita para quem não é técnico (histórias em «Given/When/Then» com textos do ecrã)
- [x] Secções obrigatórias preenchidas

## Requirement Completeness

- [x] Sem marcadores [NEEDS CLARIFICATION] (os 3 que restavam foram resolvidos com a resposta recomendada e foram depois decididos ou confirmados pela Liz a 2026-10-31, ver Clarifications)
- [x] Requisitos testáveis e sem ambiguidade (FR-001 a FR-014)
- [x] Critérios de sucesso mensuráveis
- [x] Critérios de sucesso sem detalhes de implementação (SC-006 cita `lint`/`typecheck`, como nas specs 009 e 010)
- [x] Cenários de aceitação definidos (US1 a US6)
- [x] Casos limite identificados
- [x] Âmbito delimitado (lista e comparação entre mercados fora)
- [x] Dependências e pressupostos identificados (bloqueada pela spec 014 do backend)

## Feature Readiness

- [x] Todos os requisitos têm critérios de aceitação
- [x] As histórias cobrem os fluxos principais
- [x] A funcionalidade cumpre os resultados mensuráveis
- [x] Sem detalhes de implementação na spec

## Notes

- Contrato do backend: só existe como texto; a forma de `weeks[]`, `by_merchant[]` e `recent_receipts[]`, os meses com dados, o mínimo de meses e o saldo da meta não estão definidos. Perguntas no relatório da análise.
