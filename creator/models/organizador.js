(function () {
  'use strict';

  VertoRegistry.register({
    id: 'organizador',
    name: 'Organizador',
    icon: 'grid',
    category: 'Organização',
    params: [
      { key: 'largura', label: 'Largura', type: 'number', min: 40, max: 320, step: 1, default: 160, unit: 'mm', group: 'Dimensões' },
      { key: 'profundidade', label: 'Profundidade', type: 'number', min: 30, max: 250, step: 1, default: 100, unit: 'mm', group: 'Dimensões' },
      { key: 'altura', label: 'Altura', type: 'number', min: 15, max: 150, step: 1, default: 45, unit: 'mm', group: 'Dimensões' },
      { key: 'parede', label: 'Espessura das paredes', type: 'number', min: 0.8, max: 8, step: 0.1, default: 2.2, unit: 'mm', group: 'Impressão' },
      { key: 'baseEspessura', label: 'Espessura da base', type: 'number', min: 0.8, max: 8, step: 0.1, default: 2.0, unit: 'mm', group: 'Impressão' },
      { key: 'raio', label: 'Raio dos cantos', type: 'number', min: 0, max: 20, step: 0.5, default: 4, unit: 'mm', group: 'Impressão' },
      { key: 'colunas', label: 'Colunas (divisórias verticais)', type: 'number', min: 1, max: 8, step: 1, default: 3, unit: 'un', group: 'Compartimentos' },
      { key: 'linhas', label: 'Linhas (divisórias horizontais)', type: 'number', min: 1, max: 6, step: 1, default: 1, unit: 'un', group: 'Compartimentos' },
    ],
    presets: [
      { name: 'Porta canetas 3x1', params: { largura: 150, profundidade: 90, altura: 40, parede: 2, baseEspessura: 2, raio: 4, colunas: 3, linhas: 1 } },
      { name: 'Grade de parafusos 4x3', params: { largura: 200, profundidade: 140, altura: 30, parede: 2, baseEspessura: 2, raio: 3, colunas: 4, linhas: 3 } },
    ],
    generate(params) {
      const { largura, profundidade, altura, parede, baseEspessura, raio, colunas, linhas } = params;
      const shellGeo = VertoShapes.roundedBoxShell(largura, profundidade, altura, parede, raio, baseEspessura);
      const innerW = largura - 2 * parede;
      const innerD = profundidade - 2 * parede;
      const innerH = altura - baseEspessura;
      const wallT = Math.max(parede * 0.7, 1.2);

      const parts = [shellGeo];
      for (let i = 1; i < colunas; i++) {
        const x = -largura / 2 + parede + (innerW / colunas) * i;
        const geo = new THREE.BoxGeometry(wallT, innerH - 0.4, innerD - 0.4);
        geo.translate(x, baseEspessura + innerH / 2, 0);
        parts.push(geo);
      }
      for (let j = 1; j < linhas; j++) {
        const z = -profundidade / 2 + parede + (innerD / linhas) * j;
        const geo = new THREE.BoxGeometry(innerW - 0.4, innerH - 0.4, wallT);
        geo.translate(0, baseEspessura + innerH / 2, z);
        parts.push(geo);
      }
      return VertoShapes.mergeGeometries(parts);
    },
  });
})();
