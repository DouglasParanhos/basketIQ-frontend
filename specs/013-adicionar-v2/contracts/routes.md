# Rotas: Adicionar v2 (013)

Sem rotas novas nem parâmetros novos. `/adicionar` já existe em `src/App.tsx`, dentro do layout com a barra de 5 destinos, **fora** das abas de Talões.

| Rota | Ecrã | Estado |
|---|---|---|
| `/adicionar` | Adicionar talão | ecrã inicial (sem partes) ou «Confirme as partes» (com partes); o estado vive no componente, não no URL |
| `/compras/:id` | detalhe da compra | destino depois de um envio com sucesso (como hoje) |

Regras:

- O estado das partes **não** vai para o URL (os ficheiros só existem em memória); recarregar `/adicionar` volta ao ecrã inicial.
- «Voltar» do ecrã das partes volta ao ecrã inicial (com confirmação se há partes); não navega.
- O botão «Voltar» do navegador e a barra inferior mantêm o comportamento de hoje (sem bloqueio).
- «Ver a compra existente» (duplicado) leva a `/compras/:id`; «Tire outra foto» (aviso de qualidade) leva a `/adicionar`.
- Título e foco: `<h1>` «Adicionar talão» no ecrã inicial; `<h1>` «Confirme as partes» no ecrã das partes (um só `h1` por ecrã); a edição de uma parte usa `<h2>` «Recortar a parte N».
