(function () {
  'use strict';

  VertoRegistry.register({
    id: 'chaveiro',
    name: 'Chaveiro',
    icon: 'star',
    category: 'Personalizados',
    params: [
      { key: 'largura', label: 'Largura', type: 'number', min: 20, max: 120, step: 1, default: 55, unit: 'mm', group: 'Dimensões' },
      { key: 'altura', label: 'Altura', type: 'number', min: 10, max: 80, step: 1, default: 22, unit: 'mm', group: 'Dimensões' },
      { key: 'espessura', label: 'Espessura', type: 'number', min: 2, max: 12, step: 0.5, default: 4, unit: 'mm', group: 'Dimensões' },
      { key: 'raio', label: 'Raio dos cantos', type: 'number', min: 0, max: 20, step: 0.5, default: 6, unit: 'mm', group: 'Dimensões' },
      { key: 'furoDiametro', label: 'Diâmetro do furo (argola)', type: 'number', min: 3, max: 12, step: 0.5, default: 5, unit: 'mm', group: 'Argola' },
      { key: 'texto', label: 'Texto personalizado', type: 'text', default: 'VERTO', maxLength: 14, group: 'Gravação' },
      { key: 'fonteTamanho', label: 'Tamanho da fonte', type: 'number', min: 4, max: 20, step: 0.5, default: 9, unit: 'mm', group: 'Gravação' },
      { key: 'modo', label: 'Relevo ou gravação', type: 'select', default: 'relevo', options: [{ value: 'relevo', label: 'Relevo (em alto-relevo)' }, { value: 'gravacao', label: 'Gravação (entalhado)' }], group: 'Gravação' },
    ],
    presets: [
      { name: 'Chaveiro Vertomaker', params: { largura: 60, altura: 24, espessura: 4, raio: 8, furoDiametro: 5, texto: 'VERTOMAKER', fonteTamanho: 7, modo: 'relevo' } },
    ],
    // width(X)=largura, footprint-depth(Z)=altura, up-thickness(Y)=espessura
    generate(params) {
      const { largura, altura, espessura, raio, furoDiametro, texto, fonteTamanho, modo } = params;

      const baseGeo = VertoShapes.roundedBox(largura, altura, espessura, raio);
      const holeX = -largura / 2 + Math.max(raio, furoDiametro / 2 + 2) + 1;
      const holeMesh = VertoShapes.holeCylinder(furoDiametro, espessura + 4, new THREE.Vector3(holeX, espessura / 2, 0), 'y');
      const drilled = VertoCSG.subtract(new THREE.Mesh(baseGeo), holeMesh);

      const textDepth = Math.min(espessura * 0.4, 1.6);
      return VertoShapes.textGeometry(texto, fonteTamanho, textDepth).then((textGeo) => {
        const offsetX = 3; // keep text clear of the ring hole
        if (modo === 'relevo') {
          textGeo.translate(offsetX, espessura, 0);
          return VertoShapes.mergeGeometries([drilled.geometry, textGeo]);
        }
        // gravação: subtract the text volume, cut into the top surface
        const tool = textGeo.clone();
        tool.translate(offsetX, espessura - textDepth + 0.3, 0);
        const toolMesh = new THREE.Mesh(tool);
        return VertoCSG.subtract(drilled, toolMesh).geometry;
      });
    },
  });
})();
