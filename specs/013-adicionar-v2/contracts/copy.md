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

**Não aparece:** «Talão detetado · mantenha firme», «Captura automática» e qualquer moldura (spike); «Enviar nota»; a frase «Se os valores não estiverem certos, tire uma nova fotografia.» (a ação substitui-a).
