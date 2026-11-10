# Contrato de API da lista de compras

**Estado: implementado no backend** (ramo `feat/lista-compras`); o `openapi.json` manda e este ficheiro resume-o. Tudo atrás de `smart_list_enabled` (404 se desligada), de sessão com consentimento e de CSRF nos pedidos que escrevem.

Uma só lista por utilizador (`/current`); a tabela deixa espaço para várias. Todos os pedidos que escrevem devolvem **a lista inteira** (`ShoppingListOut`), para o ecrã se reconciliar com uma só resposta.

| Pedido | Para quê |
|---|---|
| `GET /v1/lists/current` | a lista: itens por categoria, estimativas |
| `PUT /v1/lists/current/merchant` `{merchant}` | escolher o supermercado (um dos suportados) |
| `POST /v1/lists/current/items` | acrescentar: `name`, `quantity`, `unit`, `category?`, `already_have`, `product_id?` |
| `PATCH /v1/lists/current/items/{id}` | editar (`name`, `quantity`, `unit`, `category`), `checked`, `already_have` |
| `DELETE /v1/lists/current/items/{id}` | excluir (lógico, 24 h) |
| `POST /v1/lists/current/items/{id}/restore` | Desfazer, na mesma posição |
| `GET /v1/lists/current/items/{id}/evolution?months=` | evolução: pontos, Última vez, Menor, Maior, `has_history` |
| `GET /v1/lists/current/suggestions` | «Para a próxima compra» |
| `GET /v1/lists/articles` | já existia; fonte das sugestões |

## `ShoppingListOut`
`merchant` (escolhido), `categories[{id,name}]` (ordem do ecrã), `items[]`, `estimates[]` (todos os supermercados, ordem fixa), `items_total`, `checked_count`, `already_have_excluded`.

- **Item**: `id`, `name`, `category`, `category_name`, `quantity` (texto), `unit`, `checked`, `already_have`, `product_id`, `expected`.
- **`expected`** (nulo = sem valor): `price_cents` (por unidade da linha), `price_basis` (`un|kg|l`), `date`, `merchant`, `merchant_name`, `other_merchant` (verdadeiro quando vem de outro supermercado), `source: own_receipts`.
- **Estimativa** `{merchant, merchant_name, total_cents, items_with_price, other_merchant_values}`: soma `preço × quantidade` dos itens que não são «já tenho» mais os «já tenho» que estão no carrinho.

## Regras que o ecrã assume
- O valor é **o último preço pago** (líquido de descontos) no supermercado escolhido; se não houver, o último pago noutro (`other_merchant`); se não houver nenhum, `expected = null`. Nunca é média.
- `checked` e `already_have` são independentes.
- Uma categoria só aceita as 14 conhecidas; mudar o nome volta a ligar o item a um produto comprado e recalcula a categoria, salvo se a categoria for enviada.
- Sem ranking entre supermercados.
