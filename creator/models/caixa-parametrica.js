(function () {
  'use strict';

  VertoRegistry.register({
    id: 'caixa-parametrica',
    name: 'Caixa Paramétrica',
    icon: 'box',
    category: 'Organização',
    params: [
      { key: 'largura', label: 'Largura', type: 'number', min: 20, max: 300, step: 1, default: 100, unit: 'mm', group: 'Dimensões' },
      { key: 'profundidade', label: 'Profundidade', type: 'number', min: 20, max: 300, step: 1, default: 70, unit: 'mm', group: 'Dimensões' },
      { key: 'altura', label: 'Altura', type: 'number', min: 10, max: 200, step: 1, default: 40, unit: 'mm', group: 'Dimensões' },
      { key: 'parede', label: 'Espessura das paredes', type: 'number', min: 0.8, max: 8, step: 0.1, default: 2.4, unit: 'mm', group: 'Impressão' },
      { key: 'baseEspessura', label: 'Espessura da base', type: 'number', min: 0.8, max: 8, step: 0.1, default: 2.0, unit: 'mm', group: 'Impressão' },
      { key: 'raio', label: 'Raio dos cantos', type: 'number', min: 0, max: 25, step: 0.5, default: 5, unit: 'mm', group: 'Impressão' },
      { key: 'divisorias', label: 'Quantidade de divisórias', type: 'number', min: 0, max: 6, step: 1, default: 1, unit: 'un', group: 'Organização interna' },
      { key: 'divisoriaEspessura', label: 'Espessura das divisórias', type: 'number', min: 0.8, max: 6, step: 0.1, default: 2.0, unit: 'mm', group: 'Organização interna' },
    ],
    presets: [
      { name: 'Caixa pequena', params: { largura: 80, profundidade: 60, altura: 30, parede: 2, baseEspessura: 1.6, raio: 4, divisorias: 0, divisoriaEspessura: 2 } },
      { name: 'Organizador de parafusos', params: { largura: 140, profundidade: 90, altura: 35, parede: 2.2, baseEspessura: 2, raio: 5, divisorias: 3, divisoriaEspessura: 1.8 } },
    ],
    generate(params) {
      const { largura, profundidade, altura, parede, baseEspessura, raio, divisorias, divisoriaEspessura } = params;
      const shellGeo = VertoShapes.roundedBoxShell(largura, profundidade, altura, parede, raio, baseEspessura);

      const parts = [shellGeo];
      if (divisorias > 0) {
        const innerW = largura - 2 * parede;
        const innerD = profundidade - 2 * parede;
        const innerH = altura - baseEspessura;
        const step = innerW / (divisorias + 1);
        for (let i = 1; i <= divisorias; i++) {
          const x = -largura / 2 + parede + step * i;
          const dividerGeo = new THREE.BoxGeometry(divisoriaEspessura, innerH - 0.4, innerD - 0.4);
          dividerGeo.translate(x, baseEspessura + innerH / 2, 0);
          parts.push(dividerGeo);
        }
      }
      return VertoShapes.mergeGeometries(parts);
    },
  });
})();
