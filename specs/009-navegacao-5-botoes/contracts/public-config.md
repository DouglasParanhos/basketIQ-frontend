# Contrato: configuração pública (`GET /v1/config`)

Consumidor: `useAppConfig()` / `useSmartListEnabled()` em `src/config/appConfig.tsx`.

## Resposta (sem sessão)

```json
{ "app_name": "Super Mercado", "smart_list_enabled": false }
```

| Campo | Estado hoje | Estado após a spec 013 do backend (US8) |
|---|---|---|
| `app_name` | presente, em `schema.d.ts` | presente |
| `smart_list_enabled` | **ausente** | presente; falso por omissão (`SMART_LIST_ENABLED`) |

## Regras do cliente

1. `smart_list_enabled === true` mostra o destino **Lista**; qualquer outro caso (campo em falta, `false`, pedido em curso, erro) esconde-o.
2. O pedido é o mesmo que já dá o nome da aplicação (`queryKey: ["app-config"]`, `staleTime` de 1 h): não se acrescenta nenhum pedido.
3. Enquanto a configuração não chega a barra tem quatro destinos; quando chega com a opção verdadeira a Lista aparece sem ação da pessoa. Uma mudança posterior no backend só se vê numa nova leitura (novo carregamento ou fim da validade da cache de 1 h).
4. O cliente não escreve esta opção em lado nenhum.

## Dados de teste

- `src/test/server.ts`: handler por omissão devolve `{ app_name: "Super Mercado" }` (sem o campo → Lista escondida). Os testes da Lista usam `server.use(...)` com `smart_list_enabled: true`.
- `e2e/mock/api.ts`: `FakeState.smartList?: boolean` serve o campo.
