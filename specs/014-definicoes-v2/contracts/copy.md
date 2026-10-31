# Textos das Definições (português europeu)

Fonte: `DefinicoesV2.dc.html` com a tabela de substituições do `README.md` de `design-ux-v2`. Os textos de produto são propostas por confirmar pela Liz (D-Q); os que vêm do protótipo ou do código atual estão indicados.

| Elemento | Texto | Notas |
|---|---|---|
| Título | Definições | `<h1>` (já existe) |
| Cabeçalho | inicial · «Conta Google» · e-mail | protótipo; a inicial é a do nome |
| Abas | Perfil · Privacidade · Conta | `aria-label` do grupo: «Definições» |
| **Perfil, leitura** | | |
| Pessoas | Pessoas na casa · «2 pessoas» / «1 pessoa» | |
| Mercados | Onde faz compras · nomes separados por vírgula | protótipo: «Onde faz compras» |
| Meta | Meta pessoal do mês · «400,00 €» · «Um objetivo seu, não um limite.» | `formatCents`; frase do protótipo |
| Objetivos | Objetivos · nomes separados por vírgula | rótulos do onboarding |
| Por definir | «Ainda não definiu.» e o botão «Definir» | em vez de «Editar» |
| Botão | Editar (nome acessível «Editar pessoas na casa», «Editar mercados», «Editar meta pessoal», «Editar objetivos») | alvos ≥ 44 px |
| Guardado | Perfil guardado. | região `status` |
| **Perfil, edição** | | |
| Título | Editar perfil | |
| Pessoas | «Menos uma pessoa» / «Mais uma pessoa»; sem valor: «—» e «Não indicar» | sem «Ajusta as comparações» (spec 015) |
| Mercados | caixas de seleção com inicial, nome e visto | de `GET /v1/merchants` |
| Meta | campo «Meta pessoal do mês (€)», dica «Um objetivo seu, não um limite. Deixe vazio para não ter meta.» | |
| Erro da meta | A meta tem de estar entre 50 € e 800 €. | |
| Objetivos | «Organizar as minhas finanças», «Ajuda com a lista de compras», «Gastar menos nas compras» | do onboarding |
| Contagem | «N alterações por guardar» / «1 alteração por guardar» / «Sem alterações» | região `status` |
| Botões | Guardar alterações · Cancelar | |
| Descartar | «Descartar as N alterações?» · «Descartar» · «Continuar a editar» | D-Q5 |
| Mercados em erro | Não foi possível carregar os mercados. · «Tentar de novo» | |
| Erro ao guardar | Não foi possível guardar. Tente de novo. | `Notice` de erro |
| **Privacidade** | | |
| Política | Política de privacidade · «Aceite a 15 out. 2026 · versão 2026-10-15» · «Ler a política» | versão real (README) |
| Originais, título | Originais dos talões | |
| Originais, texto | Os ficheiros (fotos e PDF) são apagados automaticamente 30 dias depois de confirmar a compra. Os valores ficam nas suas contas. | protótipo sem «você» |
| Contagem | «9 ficheiros guardados agora» / «1 ficheiro guardado agora» / «Nenhum ficheiro guardado» | |
| Apagar | Apagar agora · desativado sem ficheiros | |
| Confirmação | «Apagar os ficheiros originais?» · «As compras e os valores ficam. As fotos e os PDF desaparecem e não é possível recuperá-los.» · «Apagar ficheiros» · «Cancelar» | |
| A apagar | A apagar… | `aria-busy` |
| Erro | Não foi possível apagar tudo. Faltam N compras. · «Tentar de novo» | |
| Erro da contagem | Não foi possível carregar os ficheiros guardados. · «Tentar de novo» | |
| Direitos | Os seus direitos · «Pode ver e apagar compras uma a uma, apagar só o ficheiro original ou eliminar a conta inteira quando quiser.» | protótipo |
| **Conta** | | |
| Sessão | Entrou com Google · e-mail · «Terminar sessão» | |
| Criada | Conta criada a <data>. | do ecrã atual |
| Operador | Operação · «Falhas de processamento, métricas e regras por supermercado.» · «Abrir painel do operador» | só operador; do ecrã atual |
| Eliminar | Eliminar conta · «Apaga a sua conta e todos os seus dados. Não é possível desfazer.» · «Eliminar conta…» | protótipo: «Não dá para desfazer» → pt-PT |
| **Eliminar conta (ecrã próprio)** | | |
| Título | Eliminar conta | `<h1>` |
| Aviso | Isto não pode ser desfeito · «Vamos apagar tudo o que está ligado à sua conta.» | protótipo |
| Lista | Todas as compras e talões lidos · Os ficheiros originais guardados · O seu perfil, a meta e as preferências · O acesso com esta conta Google | protótipo |
| Caixa | Compreendo que os meus dados serão eliminados e que não é possível recuperá-los. | pt-PT |
| Botões | Eliminar a minha conta · Cancelar | |
| Erro | a mensagem da API | como hoje |
| Rodapé | `<nome da aplicação> <versão>` | já existe |

## Texto proibido

«você», «dá para», «Lembretes para lançar talões», «Ajusta as comparações», «versão 1.0», «Economizar», «poupar», «orçamento», «excedeu». Os testes de texto (F-194) verificam a lista.
