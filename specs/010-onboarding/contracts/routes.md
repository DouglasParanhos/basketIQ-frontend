# Contrato de rotas: onboarding

## Tabela

| Caminho | Ecrã | Acesso | Dentro do AppShell |
|---|---|---|---|
| `/boas-vindas` | `OnboardingPage` (lazy) | sessão + consentimento atual; **só** quem não concluiu o onboarding (quem concluiu vai para `/`; refazer é do Perfil, spec 014) | Não (ecrã inteiro, sem barra de navegação) |
| todas as rotas privadas existentes (`/`, `/compras…`, `/produtos…`, `/adicionar`, `/definicoes`) | inalteradas | sessão + consentimento + **onboarding concluído** | Sim |
| `/operador` | inalterada | sessão + consentimento + papel de operador; **fora** da guarda de onboarding | Sim |
| `/login`, `/privacidade` | inalteradas | públicas | — |

## Ordem das guardas (de fora para dentro)

1. `RequireSession`: sem sessão → `/login`; consentimento em falta ou de versão antiga → `/privacidade` (com `state.from`). **O consentimento vem antes do onboarding** (US3.2).
2. `RequireOnboarding`, **acima** do AppShell (só nas rotas de utilizador; `/operador` e `*` ficam fora). Enquanto decide não se vê a barra de navegação (I3, R14):
   - perfil a carregar → `Spinner`, sem renderizar a página (US3.5);
   - `onboarding_completed_at` nulo → `<Navigate to="/boas-vindas" replace />` (US3.1, US3.7);
   - leitura do perfil falhou → deixa passar (US3.6);
   - concluído → `<Outlet/>`.
3. Em `/boas-vindas`: o primeiro perfil que chega decide uma vez: concluído → `<Navigate to="/" replace />` (US3.4). Depois disso uma cache atualizada não desvia a pessoa de «Tudo pronto» (R3 do research).

## Navegação dentro do percurso

- Sem parâmetros de URL nem `state` de rota; o passo vive em memória (R13).
- «Ir para o início» navega para `/` com `replace`; a cache `["profile"]` já foi atualizada pelo `PATCH`.
- Em `/privacidade`, depois de aceitar, a página já navega para `state.from` ou `/`; a guarda trata o resto.

## Testes de rota

- Conta sem conclusão abre `/compras` → termina em `/boas-vindas` (F-115).
- Com o perfil a carregar não se vê a barra de navegação (F-115, US3.8).
- Conta concluída abre `/boas-vindas` → termina em `/`.
- Perfil em falha 500 → a página pedida abre (sem bloqueio).
- Política desatualizada e onboarding por concluir → primeiro `/privacidade`.
- Operador sem onboarding abre `/operador` sem ser desviado.

## Estrutura da tabela de rotas (R14)

```text
/login, /privacidade                         públicas
Protected                                    sessão + consentimento, sem shell
├── /boas-vindas                             OnboardingPage (lazy)
└── RequireOnboarding
    └── AppShell (errorElement)
        └── /, /compras…, /produtos…, /adicionar, /definicoes
AppShell (errorElement)
├── Protected admin → /operador
└── *                                        não encontrado
```
