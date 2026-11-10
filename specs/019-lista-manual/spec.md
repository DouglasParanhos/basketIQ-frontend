# Feature Specification: Lista de compras (ecrãs G1 a G6)

**Feature Branch**: `feat/lista-compras`

**Created**: 2026-11-08 · **Rewritten**: 2026-11-09 (the first version diverged from the approved design)

**Status**: Approved plan, in implementation. The design is the one the Liz approved in the «Claude task» (screens **G1a/G1b/G1c, G2, G3, G4, G5, G6**, artefact «Super Mercado · Lista de compras»); the prompt of 09/11/2026 and her answers rule where they differ from older documents.

**Input**: Especificação Funcional v1.5 RF-16 and RF-17 (revised on 09/11); `specs/015-lista-inteligente` (the first increment, `GET /v1/lists/articles`, stays as the source of «Para a próxima compra»); backend `GET/POST/PATCH/DELETE /v1/lists/current…` (contract in `contracts/lista-api.md`).

**Rastreabilidade**: each criterion cites the decision of the prompt (D1 to D15) and the screen (G1 to G6). Tests carry the id in the name (`F-xx: …`). Band **F-300 to F-339** (backend F-300 to F-312; this feature F-313 to F-339), registered in the Plano de Testes §5.1.

**Scope**: screen `/lista`, behind `smart_list_enabled` (the option also covers this list). **One list only**, no «Manual/Inteligente» tabs. Suggestions are not on the list: they are only in the «Adicionar» sheet. The list lives on the server; nothing is kept in `localStorage`, `sessionStorage` or the service worker. European Portuguese; «supermercado», never «mercado».

## Decisions that shape every screen

- **D2** Products are grouped by category, each group with its title (alphabetical, «Outros» last).
- **D3** The box on the left is «no carrinho»: the item stays where it is, struck through and semi-transparent.
- **D4** «Já tenho em casa» is not «no carrinho»: the item stays in its group to show its price, is **not** struck through, has a pastel sage background, is semi-transparent and has a small house icon (accessible name «Já tenho em casa»); **no text** says it on the row. It does not count in the estimate unless it is put in the cart.
- **D5/D6** Three dots on every item: **Editar**; **Já tenho em casa** (when set: **Voltar a pôr na compra**); **Excluir da lista**. Excluding removes at once, with «[Produto] removido da lista.» and **Desfazer** (at least 10 s, no focus stolen, restores the same position). No confirmation dialog.
- **D7/D8** The row shows one value per product: **the last price paid** (net of discounts) at the chosen supermarket; if there is none, the last paid at another supermarket, shown with «~», its name and its date. Nothing is compared («acima/abaixo»), and the person is never asked for the price seen in the shop. It is never an average. The screen calls it «preço esperado» and says it is not today's price.
- **D9/D10** «Ver evolução» opens a panel **under the item, on the same screen**. No data: the stamp «Sem informação» (text + icon), the value is «—», no arrow and no chart; nothing is invented.
- **D11** The «i» next to «Preços esperados, não de hoje. Não inclui os «Já tenho».» opens a block explaining the house, where the values come from (**what exists today**: the person's receipts; the last price paid at another supermarket when the chosen one has none) and that they are not today's prices. **The text is marked for validation at the end** and changes when other sources exist.
- **D12** Field **Supermercado** (name + estimate) opens a choice of **all** the supermarkets the app knows, each with its estimate.
- **D13** Floating button «Adicionar» opens the sheet.
- **D14** Sage is one token (`--color-have`), easy to swap.
- **D15** Out of scope: price seen in the shop, observations after the receipt, price alerts, several supermarkets in one trip, the full smart list.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The list and the cart (G1) — P1

1. **Given** items, **When** the list opens, **Then** they are in category groups with a title; each row has a native checkbox, the name, a subtitle (quantity and unit), the value and the three dots. — F-313, D2, G1
2. **Given** the checkbox, **When** it is ticked, **Then** the item **stays in the same place**, struck through, semi-transparent, with a tick icon; the header says «N produtos · K no carrinho». — F-314, D3, G1
3. **Given** the field Supermercado, **When** it is opened, **Then** a native radio group lists every supermarket with its estimate (and «N valores de outros supermercados» when there are), the choice changes the estimate and the values, and the focus goes back to the field. — F-315, D12, G1
4. **Given** the estimate, **When** it is shown, **Then** the line «Preços esperados, não de hoje. Não inclui os «Já tenho».» is next to the «i», and the estimate counts what is not at home plus what is at home but in the cart. — F-316, D4, D11
5. **Given** each state, **When** it is shown, **Then** there is a loading skeleton, an empty state with «Adicionar» as the way out, a no-connection state and an error with «Tentar de novo». — F-317, G1
6. **Given** no connection, **When** the person ticks or adds, **Then** the change shows on screen, a notice says «Sem ligação · a guardar quando voltar», it is sent when the connection returns, and nothing is written to the device. — F-318, D13

### User Story 2 - «Já tenho», the three dots, delete and undo (G3, G4, G6) — P1

1. **Given** «Já tenho em casa», **When** it is set, **Then** the row has the sage background, the house, no strike-through, no text, and does not count in the estimate; the note says «Não inclui os N «Já tenho»». — F-319, D4
2. **Given** the three dots, **When** opened, **Then** the menu has Editar / Já tenho em casa (or Voltar a pôr na compra) / Excluir da lista, `aria-haspopup="menu"`, `role="menuitem"`, Esc closes and returns the focus, the arrows move, targets of at least 44 px. — F-320, D5, G6
3. **Given** «Já tenho em casa» is set, **When** the menu opens, **Then** the item says «Voltar a pôr na compra» («Volta a contar na estimativa.»); otherwise «Fica na lista, sem entrar na compra.». — F-321, D5
4. **Given** «Excluir da lista», **When** chosen, **Then** the item leaves at once, «[Produto] removido da lista.» with «Desfazer» shows for at least 10 s (`role="status"`, focus not taken), and «Desfazer» puts it back in the **same position**. — F-322, D6, G4
5. **Given** «Editar», **When** chosen, **Then** the sheet opens with the name, quantity, unit and **category** of the item, and saving changes the row. — F-323, D5
6. **Given** the «i», **When** it is opened, **Then** the block explains the house, where the values come from and that they are not today's prices, has «Fechar» and `aria-expanded`. — F-324, D11, G3

### User Story 3 - «Ver evolução» (G2) — P1

1. **Given** an item with purchases, **When** «Ver evolução ⌄» is touched, **Then** a panel opens under the item without leaving the list, with Esperado, Última vez, Menor and Maior, the chart, and the **list of purchases** (date, supermarket, price, quantity). — F-325, D9, G2
2. **Given** the panel, **When** it is shown, **Then** it covers the last six months, with no period to choose; if none of the purchases is in them, the older ones are shown. — F-326, D9
3. **Given** purchases at several supermarkets, **When** the chart is drawn, **Then** every point is the person's own purchase, filled, in the colour of its supermarket, with a legend (a hollow grey point is reserved for the price base, which does not exist yet). — F-327, D9
4. **Given** no data, **When** the item has no purchases, **Then** the stamp «Sem informação» shows where the evolution would be, the value is «—», and there is no arrow and no chart. — F-328, D10
5. **Given** the chart, **When** a screen reader reads it, **Then** the purchases listed under it (date, supermarket, price, quantity) are the same data in text; there is no second copy as a table. — F-329, D9, §8

### User Story 4 - «Adicionar» (G5) — P1

1. **Given** the floating button «Adicionar», **When** it is touched, **Then** a modal sheet opens: the focus goes to the field «Produto», stays inside, `Esc` closes it and the focus returns to the button. — F-330, D13, G5
2. **Given** the sheet, **When** a product is written and «Adicionar» is touched, **Then** it joins the list, the sheet stays open for more, and the box «Já tenho em casa» (with a line that says it stays on the list, without entering the estimate or the purchase) sets that state. «Concluído» closes. — F-331, D13
3. **Given** the history, **When** the sheet opens, **Then** «Para a próxima compra» («Produtos que costuma comprar por esta altura.») has «+» buttons, and an added suggestion leaves the section. — F-332, D13
4. **Given** no history, **When** the sheet opens, **Then** the section «Para a próxima compra» is not shown. — F-333, D13

### User Story 5 - Quality — P1

1. **Given** each state (empty, with items, loading, error, panel open, sheet open, menu open), **When** axe runs in light and dark from 320 to 820 px, **Then** there are no violations and no horizontal scroll. — F-334, §8
2. **Given** the text, **When** it is reviewed, **Then** none of the banned words appears («poupe», «poupar», «mais barato», «caro», «só hoje», «não perca»…), there is no «acima/abaixo» comparison, no field for the price seen in the shop, and no «preço de hoje» stated as a fact. — F-335, D7, `banned()`
3. **Given** the option is off, **When** `/lista` opens, **Then** «não encontrado». — F-336
4. **Given** ticking, adding, removing and undoing, **When** they happen, **Then** each is announced in the live region (`useAnnounce`). — F-337
5. **Given** every control, **When** measured, **Then** it has at least 44 px of touch target and AA contrast; nothing is told by colour alone. — F-338
6. **Given** the screen, **When** it is read, **Then** it says «supermercado» wherever it names a shop. — F-339

## Requirements *(mandatory)*

- **FR-001** The list lives on the server; nothing is kept on the device.
- **FR-002** Money comes in cents and is formatted only for display (`src/lib/format.ts`); plural with `plural()`.
- **FR-003** The value always has its origin on screen when it is not the chosen supermarket's («~», name, date); `null` shows «—», never an invented number.
- **FR-004** No ranking, order or «mais barato» between supermarkets; the estimates come in a fixed order.
- **FR-005** Accessibility: WCAG 2.2 AA, native controls, focus managed in the sheet, the menu and the undo notice, announcements with `useAnnounce`, `prefers-reduced-motion` respected, 320 px and dark mode.
- **FR-006** The price is `expected_price` on the server, in one place, so the rule can change without touching the screen.

## Success Criteria

- **SC-001** A person with history builds a list of five items by tapping suggestions, without writing a letter.
- **SC-002** F-313 to F-339 pass, axe finds nothing, and `e2e:mock` stays green.
- **SC-003** None of the banned words is on the screen.

## Assumptions

- The categories are by keyword rules for now (Passo C1 replaces them) and can be corrected by hand.
- The values are the person's own receipts only. The text of the «i» is to be validated at the end and changes when there are other sources.
- «Supermercado» is adopted across the app (separate change, `fix/glossario-supermercado`).
