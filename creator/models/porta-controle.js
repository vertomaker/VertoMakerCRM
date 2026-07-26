(function () {
  'use strict';

  VertoRegistry.register({
    id: 'porta-controle',
    name: 'Porta Controle',
    icon: 'box',
    category: 'Games',
    params: [
      { key: 'largura', label: 'Largura', type: 'number', min: 40, max: 200, step: 1, default: 90, unit: 'mm', group: 'Dimensões' },
      { key: 'profundidadeBase', label: 'Profundidade da base', type: 'number', min: 40, max: 160, step: 1, default: 80, unit: 'mm', group: 'Dimensões' },
      { key: 'espessuraBase', label: 'Espessura da base', type: 'number', min: 3, max: 15, step: 0.5, default: 6, unit: 'mm', group: 'Dimensões' },
      { key: 'alturaEncosto', label: 'Altura do encosto', type: 'number', min: 30, max: 150, step: 1, default: 70, unit: 'mm', group: 'Encosto' },
      { key: 'espessuraEncosto', label: 'Espessura do encosto', type: 'number', min: 3, max: 15, step: 0.5, default: 6, unit: 'mm', group: 'Encosto' },
      { key: 'anguloEncosto', label: 'Ângulo de apoio', type: 'number', min: 0, max: 40, step: 1, default: 18, unit: '°', group: 'Encosto' },
      { key: 'folga', label: 'Folga do encaixe (slot)', type: 'number', min: 8, max: 40, step: 0.5, default: 20, unit: 'mm', group: 'Encaixe' },
      { key: 'alturaLip', label: 'Altura da aba frontal', type: 'number', min: 6, max: 30, step: 0.5, default: 14, unit: 'mm', group: 'Encaixe' },
      { key: 'raio', label: 'Raio dos cantos', type: 'number', min: 0, max: 15, step: 0.5, default: 4, unit: 'mm', group: 'Impressão' },
    ],
    presets: [
      { name: 'Padrão (Xbox/PS)', params: { largura: 90, profundidadeBase: 80, espessuraBase: 6, alturaEncosto: 70, espessuraEncosto: 6, anguloEncosto: 18, folga: 20, alturaLip: 14, raio: 4 } },
    ],
    // X = largura (width, extrusion direction), Z = depth (front->back), Y = up
    generate(params) {
      const { largura, profundidadeBase, espessuraBase, alturaEncosto, espessuraEncosto, anguloEncosto, folga, alturaLip, raio } = params;

      const parts = [];

      // Base plate, front edge at z=0, back edge at z=profundidadeBase
      const baseGeo = VertoShapes.roundedBox(largura, profundidadeBase, espessuraBase, raio);
      baseGeo.translate(0, 0, profundidadeBase / 2);
      parts.push(baseGeo);

      // Backrest: starts at the back of the base, leaning forward by anguloEncosto degrees from vertical
      const angleRad = (anguloEncosto * Math.PI) / 180;
      const backGeo = new THREE.BoxGeometry(largura - 2, alturaEncosto, espessuraEncosto);
      backGeo.translate(0, alturaEncosto / 2, espessuraEncosto / 2); // pivot at its own bottom-front edge
      backGeo.rotateX(angleRad); // lean top backward
      backGeo.translate(0, espessuraBase, profundidadeBase - espessuraEncosto - 1);
      parts.push(backGeo);

      // Front lip: small wedge that stops the controller grip from sliding forward
      const lipZ = Math.max(2, profundidadeBase - espessuraEncosto - folga - espessuraEncosto);
      const lipShape = new THREE.Shape();
      lipShape.moveTo(0, 0);
      lipShape.lineTo(espessuraEncosto * 1.4, 0);
      lipShape.lineTo(0, alturaLip);
      lipShape.closePath();
      const lipGeo = new THREE.ExtrudeGeometry(lipShape, { depth: largura - 2, bevelEnabled: false, curveSegments: 8 });
      lipGeo.rotateY(Math.PI / 2);
      lipGeo.translate(-(largura - 2) / 2, espessuraBase, lipZ);
      parts.push(lipGeo);

      return VertoShapes.mergeGeometries(parts);
    },
  });
})();
