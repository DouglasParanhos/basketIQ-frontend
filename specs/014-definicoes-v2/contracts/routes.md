# Contrato: rotas e URL das Definições

| Rota | Estado | Acesso | Barra |
|---|---|---|---|
| `/definicoes` | redireciona (`replace`) para `/definicoes/perfil` | sessão + consentimento + onboarding concluído | Sim («Definições») |
| `/definicoes/perfil` | nova (aba Perfil) | idem | Sim |
| `/definicoes/privacidade` | nova (aba Privacidade) | idem | Sim |
| `/definicoes/conta` | nova (aba Conta) | idem | Sim |
| `/definicoes/conta/eliminar` | nova, ecrã próprio fora do layout das abas | idem | Sim |
| `/privacidade` | existente, pública, não muda (política e consentimento) | — | Não |
| `/operador` | existente, não muda | operador | — |

O layout das abas (`SettingsLayout`) fica sob a `RequireOnboarding` e o `AppShell`, como a `TaloesLayout`. As abas são os caminhos (`SegmentedTabs`, `id` = caminho) e a ativa deduz-se do `pathname`.

## URL

- `?editar=meta` em `/definicoes/perfil`: abre o Perfil em modo de edição com o foco no campo da meta. Qualquer outro valor de `editar` abre o modo de edição sem foco especial. Ao guardar ou cancelar, o parâmetro sai do URL (`replace`).
- Entrar na edição a partir de «Editar» não altera o URL.
- O estado de edição (alterações por guardar) **não** vai para o URL (dados pessoais, constituição IV).

## Ligações

| Elemento | Destino |
|---|---|
| «Ler a política» | `/privacidade` |
| Início, «Definir a minha meta pessoal» (spec 011) | `/definicoes/perfil?editar=meta` (a constante é dessa spec; muda quando esta for implementada) |
| «Eliminar conta…» | `/definicoes/conta/eliminar` |
| «Cancelar» na eliminação | `/definicoes/conta` |
| Painel do operador (só operador) | `/operador` |

## Foco e título

- `<h1>` «Definições» no layout; o ecrã de eliminar tem o seu `<h1>` «Eliminar conta». As abas não repetem o `<h1>`.
- Ao entrar em edição, o foco vai para o bloco escolhido (ou a meta com `?editar=meta`); ao guardar, o foco vai para o título do Perfil e a região `status` anuncia «Perfil guardado.»; ao cancelar, volta ao botão «Editar» do bloco de onde se saiu.
