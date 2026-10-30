# Feature Specification: Adicionar v2 (talão comprido, várias partes)

**Feature Branch**: `013-adicionar-v2`

**Created**: 2026-10-30

**Status**: Draft (Fase 0 do plano UX v2: só histórias e critérios de aceitação; sem requisitos técnicos, plano nem tarefas)

**Input**: Especificação Funcional v1.4 §4.2, RF-02, RF-03, RF-04, RF-05; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 5); `Documentation/design-ux-v2/AdicionarV2.dc.html`. Spec reestilizada: `002-adicionar-nota`.

**Convenção de rastreabilidade**: cada critério cita o RF da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`); o F-xx atribui-se na Fase 8, na faixa da experiência v2 (F-86 a F-125). Teste de cada critério: por criar, salvo os existentes adaptados.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ecrã Adicionar (Priority: P1)

**Why this priority**: é o botão central da aplicação.

**Independent Test**: componente com `useUpload.ts` simulado.

**Acceptance Scenarios**:

1. **Given** o ecrã, **When** abre, **Then** vê três botões grandes: «Fotografar» (abre a câmara), «Escolher imagem» (da galeria) e «Escolher PDF» (talão eletrónico). — §4.2
2. **Given** o ecrã, **When** abre, **Then** vê o aviso «Talão comprido? Tire mais de uma foto, uma parte de cada vez». — §4.2
3. **Given** o campo «Supermercado (opcional)», **When** abre, **Then** vê «Detetar sozinho» e os mercados suportados vindos da API; a escolha segue para o upload. — RF-02 — [NEEDS CLARIFICATION: o protótipo oferece 5 mercados e omite Auchan e Aldi, que são suportados]
4. **Given** um PDF ou imagem, **When** é escolhido, **Then** validam-se formato, tamanho e legibilidade e as mensagens de erro dizem a ação. — RF-03, RF-04
5. **Given** os botões, **When** medidos, **Then** têm pelo menos 44 px e o ecrã não tem scroll horizontal a 320 px. — §8

---

### User Story 2 - Várias partes do mesmo talão (Priority: P1)

**Acceptance Scenarios**:

1. **Given** uma foto tirada, **When** a pessoa toca «Adicionar outra parte», **Then** volta à captura para a parte seguinte. — §4.2
2. **Given** duas ou mais partes, **When** abre «Confirme as partes», **Then** vê cada parte com recortar e apagar. — RF-04
3. **Given** as partes, **When** a pessoa recorta ou roda uma, **Then** a edição mantém-se ao trocar de parte e ao apagar outra. — RF-04 — [NEEDS CLARIFICATION: o HANDOFF §6 (A5) regista por confirmar que as edições por foto se perdem ao trocar de foto; confirmar se afeta este ecrã]
4. **Given** o limite de partes, **When** é atingido, **Then** «Adicionar outra parte» fica desativado com explicação. — RF-04 — [NEEDS CLARIFICATION: valor de `MAX_PHOTOS`]
5. **Given** a última parte apagada, **When** isso acontece, **Then** a pessoa volta ao ecrã inicial sem upload pendente. — RF-04
6. **Given** «Enviar talão · 2 fotos», **When** é tocado, **Then** o talão é criado como uma só compra e as partes são ligadas a ela. — §4.2, RF-04
7. **Given** as partes sobrepostas, **When** são enviadas, **Then** o texto diz o que acontece com as linhas repetidas; a junção é feita no servidor. — RF-04 — [NEEDS CLARIFICATION: o protótipo diz «Juntamos as 2 fotos num só talão antes de enviar», mas a junção é do backend (`stitch.py`)]
8. **Given** uma falha de rede a meio, **When** acontece, **Then** o estado é recuperável, sem compra duplicada nem falsa conclusão. — F-24
9. **Given** uma só foto, **When** a pessoa envia, **Then** o fluxo é igual ao atual, com o novo desenho. — §4.2
10. **Given** a especificação, **When** compara «várias notas numa só operação» (fora de âmbito, §3) com várias fotos da mesma nota, **Then** a diferença está escrita. — §3 — [NEEDS CLARIFICATION: a Especificação Funcional não descreve várias fotos de uma nota]

---

### User Story 3 - Mensagem de qualidade da imagem (Priority: P2)

**Acceptance Scenarios**:

1. **Given** uma imagem desfocada, escura ou cortada, **When** o backend o deteta, **Then** a pessoa vê uma mensagem simples com a ação («Tire outra foto») sem bloquear o envio. — RF-05
2. **Given** a mensagem, **When** é lida por leitor de ecrã, **Then** é anunciada e leva ícone e texto. — §8
3. **Given** a imagem boa, **When** é enviada, **Then** não aparece mensagem. — RF-05

---

### User Story 4 - Moldura e orientação (Priority: P3)

**Acceptance Scenarios**:

1. **Given** a segunda parte, **When** a pessoa vai fotografar, **Then** vê a instrução «Parte 2 · comece onde a parte 1 acabou». — §4.2
2. **Given** a captura, **When** a câmara abre, **Then** o ecrã dá a orientação decidida para este spike. — §4.2 — [NEEDS CLARIFICATION: o plano diz que, sem câmara própria, se fica «só com a moldura de orientação», mas `capture="environment"` abre a câmara do sistema onde não se desenha moldura; uma moldura exige `getUserMedia`, que é o objeto do spike]
3. **Given** a câmara própria rejeitada pelo spike, **When** a spec é aplicada, **Then** o texto de orientação substitui a moldura. — §4.2

---

### User Story 5 - Spike escrito da câmara própria (Priority: P3)

*Entregável: um documento, sem integração.*

**Acceptance Scenarios**:

1. **Given** o spike, **When** termina, **Then** conclui se compensa a câmara própria (`getUserMedia`) com moldura, deteção de contorno e captura automática. — §4.2
2. **Given** o documento, **When** é lido, **Then** traz o peso da biblioteca (OpenCV.js ou equivalente), o desempenho em telemóveis médios e o comportamento em PWA no iOS. — §8
3. **Given** a conclusão, **When** é negativa, **Then** a Fase 5 fica só com a orientação e o documento diz porquê. — plano Fase 5
4. **Given** o spike, **When** é entregue, **Then** não há código de produção integrado. — plano Fase 5

---

### User Story 6 - Qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** cada ecrã novo, **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
2. **Given** os percursos de 1 e de várias fotos, **When** correm os e2e, **Then** passam com o novo desenho. — plano Fase 5
3. **Given** um HEIC, **When** é pré-visualizado, **Then** é convertido só para a pré-visualização e sem edição envia-se o original. — RF-04, constituição IV
4. **Given** os textos, **When** são revistos, **Then** estão em português europeu conforme a tabela do `README.md` (por exemplo «Lemos o talão e confirma os valores», «Juntamos tudo num só talão»). — §8

### Edge Cases

- Cancelar a meio com partes já tiradas: pede confirmação antes de perder as fotos.
- PDF e várias fotos não se misturam na mesma compra.

## Requirements *(mandatory)*

*Por escrever em `/speckit-clarify` e `/speckit-plan`; a Fase 0 cobre só histórias e critérios.*

## Success Criteria *(mandatory)*

*Por escrever. O plano pede: fluxo de 1 e de várias fotos igual ao atual com o novo desenho, e e2e verdes.*

## Assumptions

- Reaproveita `useUpload.ts`, `MAX_PHOTOS` e a edição de fotos já existentes.
