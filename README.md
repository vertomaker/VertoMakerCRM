# VertoMaker CRM

Sistema de gestão para a operação de impressão 3D **Vertomaker**: tarefas, clientes, estoque, financeiro, orçamentos e ferramentas para quem imprime. É um PWA de arquivo único (`index.html`), sem framework e sem servidor, com todos os dados salvos no navegador.

## Como funciona

- **App:** `index.html` (interface, dados e ferramentas num só arquivo), `sw.js` (cache offline, rede primeiro), `manifest.webmanifest` e ícones.
- **Dados:** `localStorage`, chave `vtm_db`. Backup e restauração por JSON em Configurações.
- **Módulos separados:** `creator/` (Criador 3D, aberto por iframe) e `nfc.html` (Tags NFC).
- **Publicação:** GitHub Pages.

## Módulos

| Área | Módulos |
|---|---|
| Gestão | Painel de Controle, Tarefas, Clientes (funil Kanban), Estatísticas, Calendário, Estoque, Financeiro |
| Orçamentos | Gerador de Orçamento, Histórico de Orçamentos |
| Ferramentas | Calculadora 3D, Criador 3D, Catálogo de Peças, Misturador de Cores, VertoColor Lab, Prompts Bonecos, Links Úteis, Tags NFC, Cortador 3D |
| Sistema | Configurações, Atualizações, Instalar App |

### Cortador 3D

Divide modelos STL/OBJ no próprio navegador, sem enviar arquivos para nenhum servidor.

- Importação com limpeza da malha (solda tolerante, normais invertidas, aviso de malha aberta)
- Corte por plano ou corte livre por pontos
- Encaixes: pino solto (folga padrão 0,15 mm por lado), degrau com ressalto, chave anti-rotação e eixo da perna
- Peças exportadas com a face de corte para baixo

## Como atualizar o app

1. Substitua `index.html` (e `sw.js`, se mudou).
2. Em `index.html`, adicione a nova versão **no topo** de `VTM_CHANGELOG` (módulo Atualizações).
3. Registre a mesma versão na seção **Histórico de versões** abaixo.

## Histórico de versões

### v1.4.0 — 26/11/2026
- Cortador 3D: limpeza da malha na importação, corte livre por pontos com encaixes (pino, degrau, chave, eixo da perna) e mensagens de erro mais claras
- Área 3D do Cortador fixa ao rolar o painel
- Calculadora 3D e Orçamento responsivos no celular, com barra fixa de total
- Painel de Controle com dados reais de produção; tarefas com material do estoque e vários materiais
- Módulo Atualizações passou a ser alimentado por uma lista (`VTM_CHANGELOG`)

### v1.3.0 — Out/2026
- Tags NFC, VertoColor Lab e Criador 3D

### v1.2.0 — 13/03/2025
- Lançamento: modais reais, estoque, financeiro, orçamento com texto para WhatsApp, prompts, links, guias e configurações

## Em breve

- Estatísticas: A receber e mais vendidos
- Geradores 3D
- Otimizador de Projetos
- Vitrine pública
- Paint
- Cortador: rabo de andorinha deslizante, seleção por pintura, importar 3MF

## Criador 3D

A documentação do editor paramétrico (estrutura de pastas, como criar modelos, cache `?v=` e notas técnicas) fica em [`creator/README.md`](creator/README.md).
