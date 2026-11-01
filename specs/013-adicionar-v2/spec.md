# Feature Specification: Adicionar v2 (talão comprido, várias partes)

**Feature Branch**: `013-adicionar-v2`

**Created**: 2026-10-30

**Status**: Especificada em 2026-10-31 (Fase 5 do plano UX v2). **Sem bloqueio de contrato:** o fluxo de envio já existe (`upload-init`, `/photos`, `upload-url`, `process`) e `GET /v1/merchants` também; só muda a interface. A câmara própria (moldura e captura automática) é um *spike* separado, **fora desta implementação** (US5 é um documento).

**Input**: Especificação Funcional v1.4 §4.2, RF-02, RF-03, RF-04, RF-05; `Documentation/Super Mercado_—_Plano_de_Implementação_UX_v2.md` (Fase 5); `Documentation/design-ux-v2/AdicionarV2.dc.html` (layout) e `README.md` (textos pt-PT, tabela «não se implementa»); HANDOFF UX v2 §6 (A5). Spec reestilizada: `002-adicionar-nota`. Backend: `specs/002-ingestao-upload` e `009` do backend (envio, fotos, junção).

**Convenção de rastreabilidade**: cada critério cita o RF da Especificação Funcional. Os testes do frontend levam o identificador no nome (`F-xx: …`). Identificadores **F-200 a F-205**, um por história (a 012 usa F-195 a F-199; a faixa fica fechada). Os testes atuais do Adicionar mantêm os seus ids e são adaptados: `F-04` (envio de PDF), `F-06` (câmara traseira), `F-08` (ficheiro não suportado), `F-17` (duplicado), `F-24` (falha de rede) e `F-31` (várias fotos). Os cenários de junção, qualidade e duplicados são «Verificado no Backend»; aqui verifica-se o que o ecrã mostra, valida e envia.

**Fora desta spec:** a câmara própria com moldura, deteção de contorno e captura automática (spike, US5); a verificação de qualidade da imagem no cliente (a deteção é do backend e depois do envio, US3); várias notas **diferentes** numa só operação (§3, ver Clarifications); mercados com logótipos.

## Clarifications

### Session 2026-10-31

Respostas deduzidas dos documentos (plano UX v2, README de design, HANDOFF, código e contrato atuais) e verificadas no código do backend (só leitura), dadas sem supervisão. Fecham os marcadores de clarificação do rascunho; não deixam decisão de produto nova (cada resposta tem fonte).

- Q: De onde vêm os mercados do campo opcional? → A: de `GET /v1/merchants` (os 7 suportados, incluindo Auchan e Aldi), com o hook `useMerchants` que já existe (spec 010). O ecrã atual usa a lista fixa `MERCHANT_OPTIONS` de `format.ts`; deixa de a usar aqui. O protótipo mostra 5 mercados e omite dois: o README manda usar a API.
- Q: Qual é o limite de partes? → A: 6 (`MAX_PHOTOS` em `src/lib/upload.ts`), igual ao `upload_max_photos` do backend. O backend devolve `requirements.max_photos` no `upload-init`, mas só depois do primeiro envio, por isso o cliente usa a constante (se divergirem, o servidor recusa e a mensagem do erro aparece).
- Q: Quem junta as partes? → A: o servidor (`stitch.py`, RF-04). O ecrã não promete que o cliente junta: «Juntamos tudo num só talão» (README); o texto sobre linhas repetidas descreve o que o servidor faz.
- Q: Várias partes e «várias notas numa só operação» (§3, fora de âmbito) são a mesma coisa? → A: não. **Várias partes** são fotografias do **mesmo** talão comprido, enviadas como uma só compra; **várias notas** seriam talões diferentes numa só operação e continuam fora de âmbito. A Especificação Funcional não descreve as várias fotos de uma nota (nota para a próxima versão do Funcional).
- Q: Como se orienta a segunda parte sem câmara própria? → A: `capture="environment"` abre a câmara do sistema e não permite desenhar moldura. Fica o texto «Parte 2 · comece onde a parte 1 acabou», no ecrã das partes, junto a «Adicionar outra parte» (plano Fase 5: «só com o texto de orientação»). A moldura depende do spike.
- Q: A edição de uma parte mantém-se ao trocar de parte (A5 do HANDOFF)? → A: tem de manter-se, e o que se vê tem de ser o que se envia. Hoje o `ImageEditor` guarda o recorte, o zoom, a rotação e o formato em estado interno e remonta ao trocar de foto (`key={active.id}`), enquanto o `AddPage` guarda só `edit` (`rotation`, `area`, `changed`) por foto: ao voltar a uma parte editada o editor reabre sem a edição e a foto pode seguir sem ela (ou com ela, sem se ver). Um teste novo que falha primeiro fixa o comportamento; o estado da edição passa a viver com a parte.
- Q: Onde aparece a mensagem de qualidade da imagem? → A: no detalhe da compra, **depois** do envio: os avisos (`WarningOut {code, message}`: `blurry`, `low_resolution`, `too_dark`, `low_text`, `low_ocr_confidence`) saem do processamento (`pipeline/quality.py`, «nunca rejeita») e o `ReceiptPage` já mostra o aviso «A fotografia pode ser melhorada». Não há verificação no cliente antes de enviar; o aviso nunca bloqueia nada. A US3 trata do desenho, do anúncio e da ação «Tire outra foto» nesse ecrã.
- Q: O que mostra o ecrã das partes com uma só foto? → A: o mesmo ecrã «Confirme as partes» com uma parte (o desenho não tem um ecrã à parte para uma foto), com «Adicionar outra parte» disponível; o fluxo e o envio são os de hoje. «Adicionar outra parte» não aparece com PDF (PDF e fotos não se misturam).
- Q: As setas de subir e descer partes mantêm-se? → A: sim: a ordem das partes é a ordem do talão e a lógica atual (F-31) não muda; o desenho não as mostra, mas o plano manda não alterar a lógica.
- Q: Que acontece ao voltar ou cancelar com partes tiradas? → A: pede confirmação no próprio ecrã («Descartar as N fotos?», «Descartar» e «Continuar a editar») antes de as perder; sem partes, sai de imediato (rascunho, Edge Cases).
- Q: Os rótulos mudam? → A: sim, para o vocabulário «Talões» (§8, spec 009): título «Adicionar talão», botão «Enviar talão» (hoje «Enviar nota»), campo «Supermercado (opcional)» com «Detetar sozinho» (hoje «Loja (opcional)» e «Detetar automaticamente»).
- Q: Como se comporta «Recortar» num ecrã pequeno? → A: (leitura do código e do desenho, sem decisão nova) «Recortar» abre o `ImageEditor` atual (rodar, zoom e formato do recorte, `h-[55dvh]`) **no lugar** da lista de partes, com o título «Recortar a parte N» e o botão «Concluir» (≥ 44 px); «Concluir» volta à lista e a edição fica com a parte. O editor mantém o que já faz: o ficheiro original segue se nada mudou.
- Q: O que acontece a «Adicionar outra parte», «Apagar», «Recortar» e às setas durante um envio em curso ou depois de um erro? → A: (leitura do código) durante o envio (`hashing`, `uploading`, `starting`) ficam desativados, como hoje (`busy`). Depois de um erro ou de um duplicado, continuam ativos; acrescentar, apagar ou reordenar uma parte trata-se como outro envio (`upload.reset()`, como hoje), e só «Tentar novamente» retoma a compra pendente.
- Q: Onde se escolhe o mercado no ecrã das partes? → A: (leitura do desenho) no ecrã inicial, em chips (grupo de opções «Supermercado (opcional)» com «Detetar sozinho» e os mercados da API, cada um com ≥ 44 px); no ecrã das partes, num campo «Supermercado (opcional)» com a mesma escolha, ligado ao mesmo estado (o cartão com seta do desenho).
- Q: Qual é o texto do aviso de qualidade e da ação? → A: (leitura do código) o título atual «A fotografia pode ser melhorada», o `message` de cada aviso tal como o backend o envia (português do backend: «A imagem parece desfocada.», «A imagem está demasiado escura.», …) e a ação «Tire outra foto», uma ligação a `/adicionar` com ≥ 44 px, no lugar da frase solta de hoje. O `Notice` já tem ícone, texto e `role="status"`.
- Q: Como se anunciam os erros ao escolher um ficheiro? → A: (leitura do código) com `Notice` de erro (`role="alert"`), no ecrã inicial e no ecrã das partes, com a mensagem de `validateFile` ou «No máximo 6 fotos por talão.» / «Só é possível juntar fotografias a uma fotografia.».
- Q: Para onde vai o foco ao abrir e fechar a edição de uma parte, ao apagar e ao adicionar? → A: (leitura do padrão da spec 014) ao abrir «Recortar», o foco vai ao título «Recortar a parte N»; ao «Concluir», volta ao botão «Recortar» dessa parte; ao apagar uma parte, vai ao título «Confirme as partes»; ao adicionar uma parte, ao botão «Recortar» da parte nova.
- **Decisões de produto novas: nenhuma.** Todas as respostas acima vêm do código, do desenho ou do padrão já usado nas specs 010 e 014; nenhuma muda o que a Liz decidiu.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ecrã Adicionar (Priority: P1)

**Why this priority**: é o botão central da aplicação.

**Independent Test**: componente com `useUpload.ts` simulado e a API de mercados simulada.

**Acceptance Scenarios**:

1. **Given** o ecrã, **When** abre, **Then** vê o título «Adicionar talão», o subtítulo «Lemos o talão e confirma os valores.» e três botões grandes: «Fotografar» (abre a câmara traseira, o principal), «Escolher imagem» (da galeria) e «Escolher PDF» (talão eletrónico). — §4.2, F-06
2. **Given** o ecrã, **When** abre, **Then** vê o aviso «Talão comprido? Tire mais de uma foto, uma parte de cada vez. Juntamos tudo num só talão.» — §4.2
3. **Given** o campo «Supermercado (opcional)», **When** abre, **Then** vê «Detetar sozinho» (escolhido) e os mercados de `GET /v1/merchants`, por texto e inicial, sem logótipos; a escolha segue para o envio (`merchant_hint`). — RF-02, README
4. **Given** a lista de mercados em falta (erro ou a carregar), **When** abre, **Then** o envio continua possível com «Detetar sozinho» e o campo avisa que os mercados não carregaram. — RF-02
5. **Given** um PDF ou imagem, **When** é escolhido, **Then** validam-se formato, tamanho (15 MB) e legibilidade, e as mensagens de erro dizem a ação. — RF-03, RF-04, F-08
6. **Given** os botões, **When** medidos, **Then** têm pelo menos 44 px e o ecrã não tem scroll horizontal a 320 px. — §8
7. **Given** a câmara negada ou indisponível, **When** a pessoa toca «Fotografar», **Then** pode escolher um ficheiro em vez disso. — F-06

---

### User Story 2 - Várias partes do mesmo talão (Priority: P1)

**Acceptance Scenarios**:

1. **Given** uma foto escolhida, **When** abre «Confirme as partes», **Then** vê cada parte com a pré-visualização, «Recortar» e «Apagar», e o botão «Adicionar outra parte» com o texto «Parte 2 · comece onde a parte 1 acabou». — §4.2, RF-04
2. **Given** «Adicionar outra parte», **When** a pessoa a toca, **Then** abre a câmara (ou a galeria) para a parte seguinte, que se junta às anteriores. — §4.2
3. **Given** as partes, **When** a pessoa recorta, roda ou aplica o formato a uma, **Then** a edição mantém-se e vê-se ao trocar de parte, ao apagar outra e ao subir ou descer partes, e o que se envia é o que se vê. — RF-04, HANDOFF A5
4. **Given** o limite de 6 partes, **When** é atingido, **Then** «Adicionar outra parte» fica desativado com a explicação «No máximo 6 fotos por talão.». — RF-04
5. **Given** a última parte apagada, **When** isso acontece, **Then** a pessoa volta ao ecrã inicial sem envio pendente. — RF-04
6. **Given** «Enviar talão · 2 fotos», **When** é tocado, **Then** o talão é criado como uma só compra e as partes são ligadas a ela, pela ordem mostrada (`upload-init` com a primeira e `/photos` com as outras). — §4.2, RF-04
7. **Given** as partes sobrepostas, **When** são enviadas, **Then** o texto diz o que acontece («Juntamos as 2 fotos num só talão antes de enviar. Se as partes se sobrepuserem, cuidamos das linhas repetidas.») e a junção é feita no servidor. — RF-04
8. **Given** uma falha de rede a meio, **When** acontece, **Then** o estado é recuperável («Tentar novamente»), sem compra duplicada nem falsa conclusão, e as partes já enviadas não se enviam outra vez. — F-24
9. **Given** uma só foto, **When** a pessoa envia, **Then** o fluxo é igual ao atual, com o novo desenho, e o botão diz «Enviar talão». — §4.2
10. **Given** várias fotos do mesmo talão e «várias notas numa só operação» (fora de âmbito, §3), **When** a spec as compara, **Then** a diferença está escrita (Clarifications): partes de **um** talão sim; talões diferentes numa só operação não. — §3
11. **Given** uma parte HEIC, **When** é pré-visualizada, **Then** converte-se só para a pré-visualização e, sem edição, envia-se o original. — RF-04, constituição IV
12. **Given** a primeira parte um PDF, ou uma foto já escolhida e depois um PDF, **When** a pessoa os mistura, **Then** a mistura é recusada com a explicação «Só é possível juntar fotografias a uma fotografia.». — F-31
13. **Given** um duplicado suspeito, **When** a pessoa envia, **Then** vê o aviso, os dados da compra existente e «Guardar nova versão» como hoje. — F-17

---

### User Story 3 - Mensagem de qualidade da imagem (Priority: P2)

A deteção é do backend e acontece depois do envio, por isso a mensagem vive no detalhe da compra.

**Acceptance Scenarios**:

1. **Given** uma imagem desfocada, escura, pequena ou cortada, **When** o backend a assinala (`quality_warnings`), **Then** o detalhe da compra mostra uma mensagem simples com a ação («Tire outra foto») e o texto de cada aviso, sem bloquear a revisão nem a confirmação. — RF-05
2. **Given** a mensagem, **When** é lida por leitor de ecrã, **Then** é anunciada e leva ícone e texto. — §8
3. **Given** uma imagem boa, **When** é enviada, **Then** não aparece mensagem. — RF-05
4. **Given** a mensagem, **When** a pessoa a lê, **Then** a ação «Adicionar talão» leva ao ecrã de envio. — RF-05

---

### User Story 4 - Câmara própria com orientação ao vivo (Priority: P2)

*Decisão (2026-11-01, Douglas): a câmara própria (`getUserMedia`) avança sem o spike; a deteção é um porte em TypeScript das regras do backend (`preprocess.py`, `quality.py`), sem OpenCV.js, calibrado nas fotos reais e nas suas variantes. Código: `src/features/capture/`. Substitui a «Orientação sem moldura» e o spike (US5) desta spec.*

**Acceptance Scenarios**:

1. **Given** «Fotografar» (ou «Adicionar outra parte») num navegador com câmara, **When** é tocado, **Then** abre a câmara própria (traseira) em ecrã inteiro, com a imagem rodeada por uma borda amarela que fica verde quando o talão está bem. — §4.2
2. **Given** a câmara aberta, **When** o talão está longe, perto demais, cortado de lado, a sair em cima ou em baixo (foto única), sobre um fundo claro, com pouca luz ou tremido, **Then** o ecrã diz o que fazer com o texto de `contracts/copy.md`, um conselho de cada vez, sem piscar. — §4.2, RF-05
3. **Given** o talão inteiro, perto o suficiente e nítido, **When** a câmara o vê, **Then** mostra «Talão detetado · pode fotografar». — §4.2
4. **Given** qualquer conselho, **When** a pessoa toca no obturador, **Then** a foto é tirada (a orientação avisa, nunca bloqueia), a câmara fecha e aparece «Confirme as partes»: um talão que cabe numa foto não pede mais nada. — RF-05, RF-04, US2.1
5. **Given** «Adicionar outra parte» (ou «Fotografar de novo» numa parte), **When** a câmara abre, **Then** vê no topo o fundo da parte anterior com «Linhas já fotografadas» e `nextPartText` («Parte 2 · comece onde a parte 1 acabou»); numa parte o talão pode sair em cima e em baixo sem aviso. — §4.2, RF-04
6. **Given** a câmara própria recusada ou indisponível, **When** a pessoa toca «Fotografar», **Then** vê porquê e «Usar a câmara do telemóvel», que abre a câmara do sistema (`capture="environment"`, F-06); na mesma sessão não volta a pedir. — F-06
7. **Given** a câmara aberta, **When** a aplicação vai para segundo plano ou a câmara fecha, **Then** a câmara é desligada e volta ao regressar. — constituição IV
8. **Given** um leitor de ecrã, **When** o conselho muda, **Then** é anunciado (no máximo a cada 2,5 s); alvos de pelo menos 44 px; o ecrã passa o axe. — §8

---

### User Story 5 - Verificação de cada foto antes do envio (Priority: P2)

**Acceptance Scenarios**:

1. **Given** uma foto (câmara própria, câmara do sistema ou galeria), **When** entra nas partes, **Then** o dispositivo verifica-a com as regras de que o backend avisa (talão pequeno na foto — menos de 600 px de largura —, escura, tremida). — RF-05
2. **Given** uma parte com aviso, **When** aparece no ecrã das partes, **Then** vê o motivo, «Pode enviá-la na mesma.» e «Fotografar de novo», que põe a nova foto no lugar dela; o envio nunca é bloqueado. — RF-05
3. **Given** uma imagem que o navegador não descodifica (HEIC) ou uma captura de ecrã, **When** é escolhida, **Then** não há aviso falso. — RF-05

---

### User Story 6 - Qualidade (Priority: P1)

**Acceptance Scenarios**:

1. **Given** cada ecrã novo (inicial, partes, edição de uma parte, confirmação ao descartar), **When** corre o axe em claro e escuro de 320 a 820 px, **Then** não há violações. — §8, §10
2. **Given** os percursos de 1 e de várias fotos, **When** correm os e2e com a API simulada, **Then** passam com o novo desenho. — plano Fase 5
3. **Given** um HEIC, **When** é pré-visualizado, **Then** é convertido só para a pré-visualização e sem edição envia-se o original. — RF-04, constituição IV
4. **Given** os textos, **When** são revistos, **Then** estão em português europeu conforme a tabela do `README.md` (por exemplo «Lemos o talão e confirma os valores», «Juntamos tudo num só talão», «Confirme as partes») e sem «você», «a gente» nem «nota» onde o vocabulário é «talão». — §8
5. **Given** os controlos (Recortar, Apagar, subir, descer, mercados, enviar), **When** são medidos, **Then** têm pelo menos 44 px e o foco é visível; a ordem de Tab segue a ordem visual. — §8
6. **Given** os estados de envio (a enviar, duplicado, falha), **When** mudam, **Then** são anunciados por leitor de ecrã (região `status` ou `alert`) e não dependem da cor. — §8
7. **Given** o ecrã, **When** é usado, **Then** nada fica em `localStorage` nem `sessionStorage` (fotos só em memória). — constituição IV

### Edge Cases

- Cancelar a meio com partes já tiradas: pede confirmação antes de perder as fotos.
- PDF e várias fotos não se misturam na mesma compra.
- Ficheiro vazio, de tipo não suportado ou com mais de 15 MB: recusado com a ação a tomar, sem sair do ecrã atual.
- Sétima parte: «Adicionar outra parte» desativado; os botões «Escolher imagem» do ecrã inicial já não existem nesse ponto.
- Pré-visualização impossível (HEIC que o navegador não converte): aviso «Não é possível pré-visualizar esta imagem neste navegador. Pode enviá-la na mesma.»; «Recortar» fica desativado para essa parte.
- Apagar a parte que está a ser recortada: sai da edição e mostra as restantes.
- Falha de rede ao enviar a segunda parte: retoma sem repetir a primeira (F-24).
- Duplicado: a ação «Ver a compra existente» leva a `/compras/:id` como hoje.
- Depois de uma falha de envio, acrescentar, apagar ou reordenar uma parte começa outro envio com a mesma primeira parte: o backend trata a compra abandonada (apagada ao fim de 24 h) como duplicado e o ecrã mostra o aviso habitual, onde «Guardar nova versão» conclui o envio (comportamento de hoje, não muda).
- Sair do ecrã (navegação) com um envio em curso: o envio já iniciado conclui-se; sem partes por enviar, não há aviso.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O ecrã inicial MUST ter o título «Adicionar talão», o subtítulo «Lemos o talão e confirma os valores.», o aviso «Talão comprido?…» e os três botões grandes Fotografar (principal), Escolher imagem e Escolher PDF, cada um com ≥ 44 px e sem scroll horizontal a 320 px. — US1.1, US1.2, US1.6
- **FR-002**: «Fotografar» MUST abrir o campo de ficheiro com `capture="environment"` e `accept="image/*"`; se a câmara falhar, a pessoa MUST poder escolher um ficheiro. — US1.7, F-06
- **FR-003**: O campo «Supermercado (opcional)» MUST oferecer «Detetar sozinho» (por defeito) e os mercados de `GET /v1/merchants` por texto e inicial, MUST enviar o escolhido como `merchant_hint` e MUST NOT usar a lista fixa de `format.ts`; com a lista em falta, o envio MUST continuar possível. — US1.3, US1.4
- **FR-004**: A validação do ficheiro (tipo, vazio, 15 MB) MUST manter-se (`validateFile`) com mensagens que dizem a ação. — US1.5, F-08
- **FR-005**: Depois de escolhido o primeiro ficheiro, o ecrã «Confirme as partes» MUST mostrar cada parte com pré-visualização, «Recortar» e «Apagar», e «Adicionar outra parte» com o texto de orientação da parte seguinte; MUST manter as setas de subir e descer e o texto do estado do envio. — US2.1, US2.2, US4.1
- **FR-006**: «Adicionar outra parte» MUST estar desativado com explicação no limite de 6 (`MAX_PHOTOS`) e MUST NOT aparecer com PDF; PDF e fotos MUST NOT misturar-se. — US2.4, US2.12
- **FR-007**: A edição de cada parte (rotação, recorte, zoom e formato) MUST manter-se e ver-se ao trocar de parte, ao reordenar e ao apagar outra, e o ficheiro enviado MUST ser o que a pessoa vê (edição aplicada só às partes editadas; as outras seguem o original). — US2.3
- **FR-008**: Apagar a última parte MUST voltar ao ecrã inicial e deixar o envio limpo (`upload.reset()`); apagar ou reordenar partes MUST limpar um envio pendente, como hoje. — US2.5
- **FR-009**: «Enviar talão · N fotos» (e «Enviar talão» com uma) MUST usar `useUpload` sem mudar a lógica: hash, `upload-init`, uma chamada `/photos` por parte seguinte, `upload-url` ao retomar, `process` com `Idempotency-Key`, junção no servidor, duplicado (F-17) e retoma sem duplicar (F-24). — US2.6, US2.8, US2.13
- **FR-010**: O texto sobre a junção MUST dizer que o servidor junta as partes e cuida das linhas repetidas, e MUST NOT prometer uma junção no cliente. — US2.7
- **FR-011**: Voltar ou cancelar com partes MUST pedir confirmação no ecrã («Descartar as N fotos?», «Descartar», «Continuar a editar») antes de as perder; sem partes, sai de imediato. — Edge Cases
- **FR-012**: HEIC MUST converter-se só para a pré-visualização; sem edição envia-se o original. — US2.11, US6.3
- **FR-013**: O detalhe da compra MUST mostrar os avisos de qualidade (`quality_warnings`) numa mensagem simples com ícone e texto, lida por leitor de ecrã (`role="status"` ou equivalente), com o texto de cada aviso, a ação «Tire outra foto» (ligação a `/adicionar`) e sem bloquear a revisão nem a confirmação; sem avisos, nada aparece. — US3
- **FR-014**: Todo o texto MUST estar em português europeu conforme a tabela do `README.md` e o vocabulário «Talões» («Adicionar talão», «Enviar talão», «Supermercado (opcional)», «Detetar sozinho»); os mercados MUST aparecer por texto e inicial. — US6.4
- **FR-015**: O estado do envio (a enviar com progresso, duplicado, falha) MUST ser anunciado por leitor de ecrã e MUST NOT depender só da cor; a ordem de Tab MUST seguir a ordem visual. — US6.5, US6.6
- **FR-016**: Fotos e edições MUST ficar só em memória: nada em `localStorage` nem `sessionStorage`; os URLs de pré-visualização MUST libertar-se ao sair. — US6.7, constituição IV
- **FR-017**: A câmara própria (moldura, deteção de contorno, captura automática) MUST NOT ser integrada; o spike (US5) é um documento. — US5
- **FR-018**: «Recortar» MUST abrir o editor no lugar da lista de partes, com o título «Recortar a parte N» e «Concluir»; o foco MUST ir ao título ao abrir e ao botão «Recortar» da parte ao fechar. Durante o envio (`hashing`, `uploading`, `starting`), «Adicionar outra parte», «Apagar», «Recortar» e as setas MUST ficar desativados; depois de um erro ou duplicado, MUST ficar ativos (e tratam-se como outro envio). — US2.3, US6.5
- **FR-019**: O aviso de qualidade MUST ter o título «A fotografia pode ser melhorada», os `message` do backend e a ação «Tire outra foto» (ligação a `/adicionar`, ≥ 44 px). — US3.1, US3.4

### Key Entities

- **Parte** (estado local do ecrã): `id`, ficheiro, tipo efetivo (`effectiveType`), URL de pré-visualização (ou erro de pré-visualização) e **edição** (rotação, recorte, zoom, formato e «alterada»); vive só em memória.
- **Mercado** (`MerchantOut` de `GET /v1/merchants`): `id` e `name`; o escolhido vai em `merchant_hint`.
- **Envio** (`useUpload`): fase (`idle`, `hashing`, `uploading`, `starting`, `done`, `duplicate`, `failed`), progresso, parte atual, duplicado e a compra pendente; já existe e não muda.
- **Requisitos de ficheiro** (`FileRequirements`): `max_bytes`, `accepted_types`, `max_pdf_pages`, `max_photos`; devolvidos no `upload-init` e iguais às constantes do cliente.
- **Aviso de qualidade** (`WarningOut`): `code` e `message`, no detalhe da compra.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O percurso de uma foto (escolher, enviar) mantém o número de passos de hoje: de abrir o ecrã a enviar são no máximo 3 toques (Fotografar ou Escolher imagem, Enviar talão) mais a fotografia (F-200, F-201).
- **SC-002**: O percurso de 2 partes chega ao envio em no máximo 5 toques depois da primeira foto (Adicionar outra parte, a foto, Enviar talão) e cria **uma** compra com as duas partes, na ordem mostrada (F-201, F-31).
- **SC-003**: Em 100 % dos testes de edição, o ficheiro enviado de cada parte corresponde à edição mostrada (editada: JPEG renderizado; não editada: o original) depois de trocar, reordenar e apagar partes (F-201).
- **SC-004**: Uma falha de rede a meio nunca cria uma segunda compra nem repete uma parte já enviada (F-24, F-201).
- **SC-005**: Os 7 mercados da API aparecem no campo opcional, incluindo Auchan e Aldi (F-200).
- **SC-006**: Zero violações do axe em cada ecrã, em claro e escuro, a 320, 375, 430 e 820 px, sem scroll horizontal a 320 px, e todos os controlos com ≥ 44 px (F-205).
- **SC-007**: Os testes existentes F-04, F-06, F-08, F-17, F-24 e F-31 passam adaptados; `lint`, `typecheck`, Vitest e `e2e:mock` passam.

## Assumptions

- Depende da spec 010 (`useMerchants`), da spec 009 (vocabulário e navegação) e do backend da spec 002/009 (envio, fotos, junção, avisos), todos já enviados. Os tipos já estão em `src/api/schema.d.ts`.
- O ecrã das partes e o ecrã inicial são **o mesmo ecrã `/adicionar`** em dois estados (sem partes e com partes); não há rotas novas. A edição de uma parte abre no próprio ecrã e fecha com «Concluir».
- As leituras do desenho que a spec adota (sem decisão de produto nova): chips de mercados no ecrã inicial e um campo equivalente no ecrã das partes, ligados ao mesmo estado; o título «Confirme as partes» também com uma parte; as setas de subir e descer mantêm-se; «Parte N · comece onde a parte N−1 acabou» no ecrã das partes.
- O aviso de qualidade não é verificado no cliente (RF-05 do backend: «avisa e sugere, nunca rejeita»).
- O spike da câmara própria é uma entrega separada (plano Fase 5, esforço S) e não bloqueia esta spec.
- **Identificadores de teste:** F-200 a F-205 (aprovados na distribuição de 2026-10-31, por confirmar no fecho do Funcional §12.4); `traceability.py` do backend não muda.

## Identificadores de teste (constituição VII)

| ID | O que verifica | Critérios | Tarefas |
|---|---|---|---|
| F-200 | Ecrã inicial: título, três botões, aviso, mercados da API, validação, câmara traseira, 44 px | US1.1 a US1.7 | por definir em `/speckit-tasks` |
| F-201 | Várias partes: confirmar, editar mantendo a edição, limite, apagar, enviar numa só compra, retoma, duplicado, HEIC | US2.1 a US2.13 | por definir |
| F-202 | Mensagem de qualidade no detalhe da compra | US3.1 a US3.4 | por definir |
| F-203 | Orientação sem moldura | US4.1 a US4.3 | por definir |
| F-204 | Spike escrito (documento; adiado) | US5.1 a US5.4 | adiada |
| F-205 | Qualidade: axe, larguras, texto, alvos, anúncios, sem armazenamento | US6.1 a US6.7 | por definir |
