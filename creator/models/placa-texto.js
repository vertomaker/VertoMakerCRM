(function () {
  'use strict';

  VertoRegistry.register({
    id: 'placa-texto',
    name: 'Placa com Texto',
    icon: 'box',
    category: 'Decoração',
    params: [
      { key: 'largura', label: 'Largura', type: 'number', min: 40, max: 400, step: 1, default: 160, unit: 'mm', group: 'Dimensões' },
      { key: 'altura', label: 'Altura', type: 'number', min: 20, max: 200, step: 1, default: 60, unit: 'mm', group: 'Dimensões' },
      { key: 'espessura', label: 'Espessura da base', type: 'number', min: 2, max: 15, step: 0.5, default: 4, unit: 'mm', group: 'Dimensões' },
      { key: 'raio', label: 'Raio dos cantos', type: 'number', min: 0, max: 40, step: 0.5, default: 8, unit: 'mm', group: 'Dimensões' },
      { key: 'texto', label: 'Texto personalizado', type: 'text', default: 'VERTOMAKER', maxLength: 26, group: 'Gravação' },
      { key: 'fonteTamanho', label: 'Tamanho da fonte', type: 'number', min: 6, max: 60, step: 0.5, default: 18, unit: 'mm', group: 'Gravação' },
      { key: 'modo', label: 'Relevo ou gravação', type: 'select', default: 'relevo', options: [{ value: 'relevo', label: 'Relevo (em alto-relevo)' }, { value: 'gravacao', label: 'Gravação (entalhado)' }], group: 'Gravação' },
      { key: 'furosParede', label: 'Furos para pendurar na parede', type: 'boolean', default: true, group: 'Fixação' },
      { key: 'diametroFuro', label: 'Diâmetro dos furos', type: 'number', min: 3, max: 10, step: 0.5, default: 4.5, unit: 'mm', group: 'Fixação', showIf: (p) => p.furosParede },
    ],
    presets: [
      { name: 'Placa Vertomaker', params: { largura: 180, altura: 60, espessura: 4, raio: 10, texto: 'VERTOMAKER', fonteTamanho: 18, modo: 'relevo', furosParede: true, diametroFuro: 4.5 } },
    ],
    // width(X)=largura, footprint-depth(Z)=altura, up-thickness(Y)=espessura
    generate(params) {
      const { largura, altura, espessura, raio, texto, fonteTamanho, modo, furosParede, diametroFuro } = params;

      let baseMesh = new THREE.Mesh(VertoShapes.roundedBox(largura, altura, espessura, raio));
      if (furosParede) {
        const margin = Math.max(raio, diametroFuro) + 5;
        const holeL = VertoShapes.holeCylinder(diametroFuro, espessura + 4, new THREE.Vector3(-largura / 2 + margin, espessura / 2, -altura / 2 + margin), 'y');
        const holeR = VertoShapes.holeCylinder(diametroFuro, espessura + 4, new THREE.Vector3(largura / 2 - margin, espessura / 2, -altura / 2 + margin), 'y');
        baseMesh = VertoCSG.subtractMany(baseMesh, [holeL, holeR]);
      }

      const textDepth = Math.min(espessura * 0.5, 2);
      return VertoShapes.textGeometry(texto, fonteTamanho, textDepth).then((textGeo) => {
        if (modo === 'relevo') {
          textGeo.translate(0, espessura, 0);
          return VertoShapes.mergeGeometries([baseMesh.geometry, textGeo]);
        }
        const tool = textGeo.clone();
        tool.translate(0, espessura - textDepth + 0.3, 0);
        return VertoCSG.subtract(baseMesh, new THREE.Mesh(tool)).geometry;
      });
    },
  });
})();
