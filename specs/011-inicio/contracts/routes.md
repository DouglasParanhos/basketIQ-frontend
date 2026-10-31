# Contrato: rota e URL do Início

| Rota | Estado | Acesso | Barra |
|---|---|---|---|
| `/` | reescrita (hoje página provisória) | sessão + consentimento + onboarding concluído (guarda da spec 010) | Sim |

## URL

- `/?mes=YYYY-MM`: mês mostrado. Ausente ou inválido → mês corrente de Lisboa (sem redirecionamento; o URL fica como está).
- `/` com qualquer parâmetro do Resumo (`periodo`, `de`, `ate`, `mercado`, `produto`, `produto_nome`) → `Navigate` para `/compras/resumo` com os mesmos parâmetros e `replace` (spec 009, F-96). **Mantém-se igual**; `mes` não é um parâmetro do Resumo.
- «Mês anterior» e «Mês seguinte» mudam `mes` com `push`. «Mês seguinte» fica desativado no mês corrente (D-P5, aprovado).

## Ligações a partir do Início

| Elemento | Destino |
|---|---|
| «Adicionar talão» (estado vazio) | `/adicionar` |
| «Ver todas» (últimas compras) | `/compras` |
| «Definir a minha meta pessoal» | `/definicoes` até a spec 014 do frontend fixar a edição da meta no Perfil (D-P8) |
| uma última compra | `/compras/:id`; as que requerem revisão ou estão em processamento: a confirmar com C14 |

## Foco e título

- Título `<h1>` «Início»; o resto do ecrã não tem outro `<h1>`. O foco não se move sozinho ao mudar de mês; o rótulo do mês é uma região `aria-live="polite"` que anuncia o mês novo.
