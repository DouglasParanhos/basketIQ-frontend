# Contrato de rotas (UI)

Rotas depois da spec 009. «Protegida» = dentro de `RequireSession`. «Layout» = rota de layout.

| Caminho | Elemento | Protegida | Layout | Destino ativo | Mudança |
|---|---|---|---|---|---|
| `/login` | `LoginPage` | não | — | — | nenhuma |
| `/privacidade` | `PrivacyPage` | não | — | — | nenhuma |
| `/` | `HomeRoute`: com parâmetros do Resumo → `Navigate` para `/compras/resumo` (mesma `search`, `replace`); sem parâmetros → `HomePage` | sim | `AppShell` | Início | **era o Resumo** |
| `/compras` | `ReceiptsPage` | sim | `TaloesLayout` | Talões | passa a ter abas |
| `/compras/resumo` | `DashboardPage` (sem alterações) | sim | `TaloesLayout` | Talões | **nova**; antes `/` |
| `/produtos` | `ProductsPage` | sim | `TaloesLayout` | Talões | passa a ter abas |
| `/compras/:id` | `ReceiptPage` | sim | — | Talões | nenhuma |
| `/produtos/:id` | `ProductPage` | sim | — | Talões | nenhuma |
| `/adicionar` | `AddPage` | sim | — | Adicionar | nenhuma |
| `/definicoes` | `SettingsPage` | sim | — | Definições | nenhuma |
| `/operador` | `AdminPage` | sim (admin) | — | — | nenhuma |
| `/lista` | **não existe na Fase 1** | — | — | Lista | «não encontrado» (`*`) |
| `*` | `RouteError` («Voltar ao início») | — | — | — | texto da ligação |

Regras:
- `/compras/resumo` é estático e tem prioridade sobre `/compras/:id`; um teste garante que «resumo» nunca chega a `ReceiptPage`.
- Parâmetros do Resumo reconhecidos em `/`: `periodo`, `de`, `ate`, `mercado`, `produto`, `produto_nome`.
- Ligações internas que apontavam para o Resumo em `/` (`ReceiptPage` → «Início» continua a apontar para `/`, que agora é o Início).
- Voltar do navegador: os redirecionamentos usam `replace`, por isso não deixam `/` no histórico.
