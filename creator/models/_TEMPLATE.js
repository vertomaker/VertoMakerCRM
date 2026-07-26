/**
 * _TEMPLATE.js
 * ------------------------------------------------------------------
 * COPY THIS FILE to add a new parametric model. Rename it, fill in
 * the fields below, then add ONE line to index.html:
 *
 *   <script src="models/meu-modelo.js"></script>
 *
 * That is the only change required anywhere else in the app - the
 * sidebar, parameter panel, viewer, exporters and estimator all pick
 * the model up automatically through VertoRegistry.
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  VertoRegistry.register({
    id: 'meu-modelo',                 // unique slug (no spaces/accents)
    name: 'Meu Modelo',               // display name in the sidebar
    icon: 'box',                      // key from icons.js (see VertoIcons)
    category: 'Personalizados',       // must be one of VertoCategories

    // Every parameter shown in the right-hand panel. Supported types:
    //   'number'  -> slider + numeric field + unit (mm)
    //   'select'  -> dropdown, needs `options: [{value,label}]`
    //   'boolean' -> on/off switch
    //   'text'    -> free text input (e.g. custom engraved text)
    params: [
      { key: 'largura', label: 'Largura', type: 'number', min: 10, max: 300, step: 1, default: 80, unit: 'mm', group: 'Dimensões' },
      { key: 'altura', label: 'Altura', type: 'number', min: 5, max: 200, step: 1, default: 40, unit: 'mm', group: 'Dimensões' },
      { key: 'profundidade', label: 'Profundidade', type: 'number', min: 5, max: 300, step: 1, default: 60, unit: 'mm', group: 'Dimensões' },
      { key: 'parede', label: 'Espessura das paredes', type: 'number', min: 0.8, max: 10, step: 0.1, default: 2.4, unit: 'mm', group: 'Impressão' },
      { key: 'raio', label: 'Raio dos cantos', type: 'number', min: 0, max: 30, step: 0.5, default: 3, unit: 'mm', group: 'Impressão' },
    ],

    // Optional built-in presets offered in the "Presets" menu.
    presets: [
      { name: 'Padrão', params: { largura: 80, altura: 40, profundidade: 60, parede: 2.4, raio: 3 } },
    ],

    /**
     * Build the solid. Must return either:
     *   - a THREE.BufferGeometry, or
     *   - a Promise<THREE.BufferGeometry>  (e.g. when using text/fonts)
     * All values are already clamped to [min,max] by the UI.
     */
    generate(params) {
      const geo = VertoShapes.roundedBox(params.largura, params.profundidade, params.altura, params.raio);
      return geo;
    },
  });
})();
