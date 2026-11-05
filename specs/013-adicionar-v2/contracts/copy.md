# Textos: Adicionar v2 (013), português europeu

Fonte: `Documentation/design-ux-v2/AdicionarV2.dc.html` com a tabela «protótipo → produto» do `README.md` aplicada; vocabulário «talão» (spec 009). Sem «você», «a gente», «nota» (onde o vocabulário é «talão»), «mais barato».

## Ecrã inicial

| Onde | Texto |
|---|---|
| Título (`h1`) | Adicionar talão |
| Subtítulo | Lemos o talão e confirma os valores. |
| Grupo de mercados (`aria-label`) | Supermercado (opcional) |
| Primeiro chip | Detetar sozinho |
| Mercados | os nomes de `GET /v1/merchants` (inicial no azulejo) |
| Mercados em falta | Não foi possível carregar os supermercados. Pode enviar na mesma. |
| Botão principal | Fotografar / Abre a câmara |
| Botão | Escolher imagem / Da galeria do telemóvel |
| Botão | Escolher PDF / Talão eletrónico por e-mail |
| Aviso | **Talão comprido?** Tire mais de uma foto, uma parte de cada vez. Juntamos tudo num só talão. |
| Dica (mantida) | Para uma boa leitura: talão inteiro na imagem, sobre um fundo escuro, sem sombras nem reflexos. |

## Ecrã das partes

| Onde | Texto |
|---|---|
| Título (`h1`) | Confirme as partes |
| Botão de voltar (`aria-label`) | Voltar |
| Cada parte | Parte 1, Parte 2, … (nome do ficheiro e tamanho em MB por baixo, texto pequeno) |
| Ações da parte | Recortar · Apagar · Subir a parte N · Descer a parte N |
| Adicionar | Adicionar outra parte |
| Galeria | Escolher da galeria |
| Orientação | Parte 2 · comece onde a parte 1 acabou |
| Limite | No máximo 6 fotos por talão. |
| Mercado | Supermercado (opcional) · Detetar sozinho |
| Junção (2 ou mais partes) | Juntamos as 2 fotos num só talão antes de enviar. Se as partes se sobrepuserem, cuidamos das linhas repetidas. |
| Enviar | Enviar talão · 2 fotos (com uma: Enviar talão) |
| A enviar | A enviar a foto 2 de 3 / A enviar · progresso «Progresso do envio» |
| Sem pré-visualização | Não é possível pré-visualizar esta imagem neste navegador. Pode enviá-la na mesma. |
| Mistura PDF e fotos | Só é possível juntar fotografias a uma fotografia. |
| Ficheiro não suportado | Este tipo de ficheiro não é suportado. Escolha um PDF, JPEG, PNG ou HEIC. |
| Descartar | Descartar as 3 fotos? · Descartar · Continuar a editar |

## Editor de uma parte

*Substituído pela spec 017 (2026-11-05): ver `../../017-camara-recorte/contracts/copy.md`.*

| Onde | Texto |
|---|---|
| Título (`h2`) | Recortar a parte 2 |
| Controlos (mantidos) | Rodar para a esquerda · Rodar para a direita · Formato do recorte (Original, Talão estreito, Talão largo) · Zoom |
| Fechar | Concluir |

## Estados do envio (mantidos)

| Estado | Texto |
|---|---|
| Duplicado | Este talão parece já ter sido importado · Guardar nova versão · Ver a compra existente · «Se não quiser importar de novo, escolha outro ficheiro.» |
| Falha | O envio não terminou · «A compra fica guardada e o envio retoma de onde parou.» · Tentar novamente |

## Aviso de qualidade (detalhe da compra)

| Onde | Texto |
|---|---|
| Título | A fotografia pode ser melhorada |
| Corpo | os `message` do backend, separados por espaço |
| Ação | Tire outra foto (ligação a `/adicionar`) |

## Câmara própria (US4)

Fonte no código: `src/features/capture/hints.ts` (`LIVE_TEXT`, `STILL_TEXT`) e `CameraCapture.tsx`. Um conselho de cada vez, por esta prioridade:

| Situação | Código | Texto |
|---|---|---|
| Pouca luz no papel | `too_dark` | Está escuro: procure mais luz |
| Nenhum talão na imagem | `no_receipt` | Aponte a câmara para o talão |
| Papel e superfície igualmente claros | `bad_background` | Pouse o talão num fundo escuro: assim vemos onde acaba |
| Talão a sair por um dos lados | `cut_side` | O talão está cortado de lado: centre-o |
| Talão mais largo do que a imagem | `too_close` | Afaste um pouco a câmara |
| Talão a sair em cima ou em baixo (só foto única) | `cut_ends` | O talão não cabe: afaste-se ou fotografe por partes |
| Talão estreito demais (menos de 600 px na foto, com 10 % de folga) | `too_far` | Aproxime a câmara do talão |
| Imagem tremida ou desfocada | `blurry` | Imagem tremida ou desfocada: segure firme |
| Tudo bem (e a foto é tirada sozinha) | `ok` | Talão detetado · segure firme |

| Onde | Texto |
|---|---|
| Diálogo (`aria-label`) | Fotografar o talão |
| Título | Talão inteiro na imagem (foto única) · Parte N (partes seguintes) |
| Partes | Linhas já fotografadas (sobre o fundo da parte anterior) · Parte N · comece onde a parte N-1 acabou |
| Botões | Tirar a foto · Fechar a câmara (depois de cada foto a câmara fecha e volta «Confirme as partes») |
| Sem acesso | A aplicação não tem acesso à câmara. Pode dar acesso nas definições do navegador ou usar a câmara do telemóvel. |
| Sem câmara | Não foi possível abrir a câmara neste navegador. |
| Recurso | Usar a câmara do telemóvel |

## Verificação de cada foto (US5, no ecrã das partes)

| Código | Texto |
|---|---|
| `too_dark` | A foto está escura. |
| `too_far` | O talão ficou pequeno na foto: aproxime-se ou fotografe-o por partes. |
| `blurry` | A foto está tremida ou desfocada. |
| Fecho | Pode enviá-la na mesma. |
| Ação | Fotografar de novo (`aria-label`: Fotografar de novo a parte N) |

**Não aparece:** «Captura automática» (a foto também é tirada sozinha, mas o ecrã não o anuncia com este texto); «Enviar nota»; a frase «Se os valores não estiverem certos, tire uma nova fotografia.» (a ação substitui-a).
