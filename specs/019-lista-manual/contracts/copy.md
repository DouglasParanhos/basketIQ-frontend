# Contrato de textos da lista de compras

Português europeu, voz calma, clara, honesta e prática. «**Supermercado**», nunca «mercado». Cor nunca sozinha. Os textos aprovados (09/11/2026) usam-se **exatamente**.

## Textos aprovados
- Título «Lista de compras»; subtítulo «N produtos · K no carrinho».
- Campo «Supermercado» / «Estimativa»; nota «N valores de outros supermercados».
- Linha de aviso «Preços esperados, não de hoje. Não inclui os «Já tenho».»; com N: «Não inclui os N «Já tenho».»
- «Ver evolução».
- Menu: «Editar» · «Já tenho em casa» («Fica na lista, sem entrar na compra.») · «Voltar a pôr na compra» («Volta a contar na estimativa.») · «Excluir da lista».
- Aviso: «[Produto] removido da lista.» + «Desfazer».
- Folha: «Adicionar à lista», campo «Produto», «Adicionar», «Para a próxima compra» («Produtos que costuma comprar por esta altura.»), «Já tenho em casa», «Concluído».
- Carimbo: «Sem informação».
- Sem ligação: «Sem ligação · a guardar quando voltar».

## Textos novos desta implementação (a rever pela Liz)
- Valor vindo de outro supermercado: «~ 0,82 € · Pingo Doce» (o nome e a data na evolução).
- Vazia: «A sua lista está vazia.» + «Adicionar».
- Erro: «Não foi possível carregar a lista.» + «Tentar de novo».
- «i» (**para validar no fim**): a casinha marca um produto que já tem em casa: fica na lista para ver o preço e não entra na estimativa, a menos que o ponha no carrinho. Os valores são o último preço que pagou, nos seus talões, no supermercado escolhido; se nunca comprou lá, mostramos o último que pagou noutro supermercado, assinalado com «~». Sem dados, fica em branco. Não são preços de hoje na loja.

## Palavras proibidas (teste F-335, `banned()`)
Urgência e escassez («só hoje», «últimas unidades», «não perca», «corra»); culpa («está a perder», «desperdício»); vocabulário que o produto não usa («poupar», «poupa», «poupou», «economizar», «caro», «mais barato», «melhor supermercado», «compre no»); comparações «acima/abaixo» e «preço de hoje» como afirmação.
