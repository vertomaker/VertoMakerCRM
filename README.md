# VertoMaker Creator

Editor paramétrico de objetos 3D para impressão, com visualização em
tempo real (Three.js) e exportação em **STL**, **OBJ** e **3MF**
compatível com Bambu Studio, OrcaSlicer, PrusaSlicer e Cura.

Funciona **100% offline após o primeiro carregamento das bibliotecas**,
abrindo `index.html` diretamente no navegador - sem servidor, sem passo
de build. (As bibliotecas de terceiros - Three.js e suas extensões
clássicas - são carregadas de um CDN público na primeira vez; depois
disso o navegador as mantém em cache.)

## Estrutura de pastas

```
creator/
├── index.html                 # shell da aplicação, único ponto de entrada
├── css/
│   └── style.css              # design system (tokens, layout, tema claro/escuro)
├── js/
│   ├── registry.js            # registro central de modelos (o "plugin system")
│   ├── icons.js                # ícones SVG inline
│   ├── csg.js                  # motor CSG (união/subtração/interseção) - sem dependências externas
│   ├── shapes.js                # helpers geométricos reaproveitados pelos modelos
│   ├── estimator.js             # volume, peso, tempo de impressão, filamento, custo
│   ├── exporter.js               # exportadores STL / OBJ / 3MF (próprios, sem addons ESM)
│   ├── state.js                   # estado global: undo/redo, projetos, favoritos, presets, JSON
│   ├── viewer.js                   # cena Three.js, câmera, controles, grade, eixos, captura de imagem
│   ├── ui.js                        # renderização de sidebar, painel de parâmetros, modais
│   └── app.js                        # bootstrap - conecta tudo, sem conhecer nenhum modelo específico
├── models/                    # BIBLIOTECA PARAMÉTRICA - um arquivo por modelo
│   ├── _TEMPLATE.js           # copie este arquivo para criar um modelo novo
│   ├── caixa-parametrica.js
│   ├── organizador.js
│   ├── chaveiro.js
│   ├── porta-controle.js
│   ├── porta-celular.js
│   ├── suporte-headset.js
│   ├── suporte-notebook.js
│   ├── gancho.js
│   ├── vaso.js
│   ├── placa-texto.js
│   ├── suporte-parede.js
│   ├── porta-cartoes.js
│   └── modelo-personalizado.js
├── icons/                     # reservado para ícones customizados (PNG/SVG) de modelos futuros
└── assets/                    # reservado para outros recursos estáticos (fontes, texturas, etc.)
```

## Cache do navegador (importante ao atualizar arquivos)

Todos os `<link>`/`<script>` locais em `index.html` têm um sufixo
`?v=AAAAMMDDx` (ex.: `css/style.css?v=20260727a`). Isso existe porque
navegadores (e o `<iframe>` do painel principal) guardam CSS/JS em
cache agressivamente - sem esse sufixo, depois de editar um arquivo o
usuário pode continuar vendo a versão antiga por dias.

**Sempre que editar qualquer arquivo em `css/`, `js/` ou `models/`,
troque o valor de `?v=...` em TODAS as tags de `creator/index.html`**
(pode ser qualquer string nova, ex. incrementar a letra final ou usar
a data do dia). Se o `creator/` estiver embutido via `<iframe>` no
painel principal, atualize também o `?v=...` do `src` do iframe em
`index.html` (busque por `criador3d-frame`).

## Como adicionar um novo modelo (sem tocar em mais nada)

1. Copie `models/_TEMPLATE.js` para `models/meu-modelo.js`.
2. Preencha `id`, `name`, `icon`, `category`, `params` e a função `generate(params)`.
3. Adicione uma linha em `index.html`, na seção "Modelos":
   ```html
   <script src="models/meu-modelo.js"></script>
   ```

Pronto. O modelo aparece automaticamente na barra lateral (agrupado pela
categoria escolhida), o painel de parâmetros é gerado automaticamente a
partir do array `params`, e os exportadores/estimador/undo-redo/JSON já
funcionam para qualquer modelo sem alterações adicionais.

Nenhum outro arquivo (`registry.js`, `ui.js`, `app.js`, etc.) precisa
ser editado - esse é o ponto central do design: a "biblioteca
paramétrica" é um plugin system.

## Categorias disponíveis

`Organização`, `Decoração`, `Escritório`, `Games`, `Ferramentas`,
`Oficina`, `Cozinha`, `Personalizados`, `Natal`, `Halloween`, `Geek`,
`Infantil` (definidas em `js/registry.js`, em `VertoCategories`).

## Notas técnicas importantes

- **Three.js pinado na versão r146.** Essa foi a última versão do
  Three.js publicada com o build clássico `three.min.js` (não-módulo)
  **e** os addons clássicos (`examples/js/...`) ao mesmo tempo. Versões
  mais novas do Three.js só distribuem ES Modules, que o Chrome recusa
  a carregar quando a página é aberta via `file://` (erro de CORS) -
  por isso a decisão de fixar a versão, garantindo que "abrir o
  `index.html` e pronto" realmente funcione em qualquer navegador.
  Para atualizar a versão do Three.js no futuro, será necessário migrar
  para ES Modules (`type="module"`) e passar a servir os arquivos por
  um servidor local (ex.: `npx serve`), pois o modo `file://` deixará
  de funcionar.
- **CSG próprio** (`js/csg.js`): implementação compacta baseada em
  árvore BSP (união/subtração/interseção) escrita do zero, sem
  depender de bibliotecas externas de terceiros - evita problemas de
  versão/CDN e mantém o app 100% autocontido.
- **Exportadores próprios** (`js/exporter.js`): STL binário, OBJ texto
  e 3MF (contêiner ZIP + XML montado manualmente, sem compressão, o
  que é válido pela especificação 3MF e aceito por todos os slicers
  citados no briefing).
- **1 unidade Three.js = 1 mm** em todo o app.
- **Texto 3D** (`js/shapes.js`, função `textGeometry`) depende do
  carregamento assíncrono de uma fonte (`FontLoader`); por isso,
  `generate()` pode retornar tanto uma `THREE.BufferGeometry` quanto
  uma `Promise<THREE.BufferGeometry>` - o `app.js` já trata os dois
  casos.

## Integração com o painel principal do Vertomaker

O Creator foi propositalmente mantido como uma aplicação separada e
autocontida (e não incorporado ao arquivo único do painel principal).
Isso significa que:

- Atualizar o Creator (adicionar modelo, corrigir bug, mudar visual)
  nunca exige tocar no `index.html` do painel principal.
- O painel principal só precisa apontar para `creator/index.html`
  (por link em nova aba ou `<iframe>`) - veja o trecho já adicionado
  ao menu lateral do painel principal (item "Criador 3D", seção
  "Ferramentas").
- Basta publicar a pasta `creator/` junto com o restante do site
  (ex.: GitHub Pages) em `seusite.com/creator/`.
