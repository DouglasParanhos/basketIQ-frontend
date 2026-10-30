# Feature Specification: Definições v2 (Perfil, Privacidade e Conta)

**Feature Branch**: `014-definicoes-v2`

**Created**: 2026-10-30

**Status**: Draft (Fase 0 do plano UX v2: só histórias e critérios de aceitação; sem requisitos técnicos, plano nem tarefas)

**Input**: Especificação Funcional v1.4 §8, RF-12, RF-13; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 6, D3, D8); `Documentation/design-ux-v2/DefinicoesV2.dc.html`. Backend: `../basketIQ-backend/specs/013-perfil-utilizador` (US1, US7). Spec reestilizada: `006-definicoes-dados`.

**Convenção de rastreabilidade**: cada critério cita o RF da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`); o F-xx atribui-se na Fase 8, na faixa da experiência v2 (F-86 a F-125). Teste de cada critério: por criar, salvo os existentes adaptados.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cabeçalho da conta e abas (Priority: P1)

**Acceptance Scenarios**:

1. **Given** as Definições, **When** abrem, **Then** vêm o cabeçalho com a inicial, «Conta Google» e o e-mail, e as abas Perfil, Privacidade e Conta. — §8, RF-12
2. **Given** as abas, **When** usadas por teclado, **Then** comportam-se como no componente partilhado da spec 009. — §8
3. **Given** os lembretes semanais, **When** as Definições abrem, **Then** o interruptor não aparece. — D3 — [NEEDS CLARIFICATION: o protótipo mostra «Lembretes para lançar talões»; confirmar que se esconde]

---

### User Story 2 - Perfil: ler, editar e guardar (Priority: P1)

**Acceptance Scenarios**:

1. **Given** um perfil, **When** abre a aba, **Then** vê pessoas, mercados, meta pessoal («Um objetivo seu, não um limite») e objetivos, cada um com «Editar». — RF-13
2. **Given** um perfil vazio, **When** abre, **Then** cada bloco diz que não está definido e convida a editar. — RF-13
3. **Given** «Editar perfil», **When** a pessoa altera pessoas, mercados, meta ou objetivos, **Then** vê «N alterações por guardar» e o botão «Guardar alterações». — RF-13 — [NEEDS CLARIFICATION: o que conta como alteração (campo ou item de lista)]
4. **Given** alterações por guardar, **When** toca «Cancelar», **Then** descarta-as e volta à leitura. — RF-13 — [NEEDS CLARIFICATION: pede confirmação se houver alterações?]
5. **Given** alterações válidas, **When** toca «Guardar alterações», **Then** são enviadas, voltam à leitura e o Início usa a nova meta. — RF-13, RF-15
6. **Given** o envio falha, **When** a pessoa guarda, **Then** mantém-se em edição com o erro e sem perder as alterações. — RF-13
7. **Given** pessoas fora de 1 a 12 ou meta fora de 50 a 800 €, **When** guarda, **Then** a validação diz o limite e não envia. — RF-13
8. **Given** a meta, **When** a pessoa a apaga, **Then** o perfil fica sem meta e o Início mostra «Definir minha meta pessoal». — RF-13, RF-15
9. **Given** o consentimento da política atual em falta, **When** guarda, **Then** vê o motivo e o caminho para aceitar. — RF-12, RF-13

---

### User Story 3 - Privacidade e originais (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a aba, **When** abre, **Then** vê «Política de privacidade», a versão e a data aceites e a ligação «Ler a política». — RF-12 — [NEEDS CLARIFICATION: o protótipo mostra «versão 1.0»; o código usa a versão «2026-10-15»]
2. **Given** a aba, **When** abre, **Then** vê que os originais são apagados automaticamente 30 dias depois da confirmação e que os valores ficam. — RF-12
3. **Given** originais guardados, **When** abre, **Then** vê «N ficheiros guardados agora» e «Apagar agora». — RF-12
4. **Given** «Apagar agora», **When** a pessoa o toca, **Then** vê uma confirmação que diz a consequência (as compras e valores ficam; as fotos e PDFs desaparecem). — RF-12
5. **Given** a confirmação, **When** a pessoa a aceita, **Then** o contador passa a 0 e as compras mantêm-se. — RF-12, F-22a
6. **Given** nenhum original, **When** abre, **Then** vê «Nenhum ficheiro guardado» e o botão desativado. — RF-12
7. **Given** o apagar falha, **When** acontece, **Then** vê um erro acionável e o contador não muda. — RF-12
8. **Given** «Os seus direitos», **When** abre, **Then** lê o texto e as ações existentes. — RF-12
9. **Given** uma nova versão da política, **When** a pessoa entra, **Then** é pedida a aceitação antes de guardar dados novos. — RF-12, RF-13, D8 — [NEEDS CLARIFICATION: onde e quando aparece o novo consentimento]

---

### User Story 4 - Conta: terminar sessão e eliminar (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a aba, **When** abre, **Then** vê «Entrou com Google · e-mail» e «Terminar sessão». — RF-01, RF-12
2. **Given** «Eliminar conta…», **When** a pessoa toca, **Then** vê um ecrã próprio, «Isto não pode ser desfeito», com a lista do que desaparece. — F-23
3. **Given** a lista, **When** é lida, **Then** inclui compras e talões, ficheiros originais, perfil, meta e preferências, e o acesso com a conta Google. — F-23, RF-13 — [NEEDS CLARIFICATION: se a lista inteligente estiver ativa, as listas também desaparecem e não estão na lista do protótipo]
4. **Given** o ecrã, **When** a caixa «Compreendo que os meus dados serão eliminados…» não está marcada, **Then** o botão final está desativado. — F-23
5. **Given** a confirmação, **When** elimina, **Then** a pessoa é levada ao login e os dados desaparecem. — F-23
6. **Given** «Cancelar», **When** é tocado, **Then** volta às Definições sem eliminar nada. — F-23
7. **Given** o comportamento atual, **When** é reestilizado, **Then** não muda. — plano Fase 6

---

### User Story 5 - Qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** cada aba e o ecrã de eliminar, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
2. **Given** os testes, **When** correm, **Then** há testes de edição e cancelamento, de eliminação (F-23) e de apagar originais. — plano Fase 6
3. **Given** os textos, **When** são revistos, **Then** estão em português europeu conforme a tabela do `README.md` (por exemplo «é possível recuperá-los» em vez de «dá para recuperá-los»). — §8
4. **Given** nenhum dado de perfil, **When** a aplicação corre, **Then** nada fica em `localStorage`. — constituição IV

### Edge Cases

- Perda de rede ao guardar: o estado de edição mantém-se.
- Ações destrutivas pedem sempre confirmação explícita no próprio ecrã.

## Requirements *(mandatory)*

*Por escrever em `/speckit-clarify` e `/speckit-plan`; a Fase 0 cobre só histórias e critérios.*

## Success Criteria *(mandatory)*

*Por escrever. O plano pede: testes de edição e cancelamento, de eliminação (F-23) e de apagar originais; axe verde.*

## Assumptions

- Depende da spec 013 do backend e da spec 009 do frontend.
