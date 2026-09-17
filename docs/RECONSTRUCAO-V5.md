# Reconstrução controlada — versão 5

## Objetivo
Reconstruir a aplicação de forma incremental, preservando a versão atual no `main` e evitando alterações destrutivas.

## Estado inicial
- A branch `reconstrucao-v5` parte do commit anterior ao problema que substituiu `js/modules/carrinho.js`.
- O `carrinho.js` original está presente nesta branch.
- Nenhuma alteração será feita diretamente no `main` durante a reconstrução.

## Ordem de execução
1. Auditar a estrutura e as dependências atuais.
2. Validar o carrinho original e seus contratos com `CartStore`, checkout e interface.
3. Criar testes unitários para as regras do carrinho.
4. Corrigir problemas de acessibilidade e contraste.
5. Validar os fluxos principais com testes E2E.
6. Revisar o workflow de CI e a publicação.
7. Só depois avaliar a migração ou remoção de módulos legados.

## Regras de segurança
- Não substituir arquivos existentes sem ler o conteúdo completo e verificar dependências.
- Não excluir módulos legados durante a fase de validação.
- Não fazer deploy automaticamente.
- Não considerar a reconstrução pronta sem execução real dos testes.

## Pendências conhecidas
- Confirmar a integridade completa do carrinho original.
- Revisar o carregamento duplicado dos módulos de carrinho.
- Corrigir e validar o tema escuro no checkout e no cardápio.
- Investigar a falha do workflow de publicação.
