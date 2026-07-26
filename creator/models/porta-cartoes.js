(function () {
  'use strict';

  VertoRegistry.register({
    id: 'porta-cartoes',
    name: 'Porta Cartões',
    icon: 'box',
    category: 'Escritório',
    params: [
      { key: 'largura', label: 'Largura', type: 'number', min: 40, max: 160, step: 1, default: 70, unit: 'mm', group: 'Dimensões' },
      { key: 'profundidade', label: 'Profundidade da base', type: 'number', min: 30, max: 120, step: 1, default: 50, unit: 'mm', group: 'Dimensões' },
      { key: 'altura', label: 'Altura', type: 'number', min: 25, max: 100, step: 1, default: 45, unit: 'mm', group: 'Dimensões' },
      { key: 'raio', label: 'Raio dos cantos', type: 'number', min: 0, max: 20, step: 0.5, default: 6, unit: 'mm', group: 'Dimensões' },
      { key: 'anguloSlot', label: 'Ângulo do slot', type: 'number', min: 5, max: 40, step: 1, default: 20, unit: '°', group: 'Slot' },
      { key: 'larguraSlot', label: 'Largura do slot (espessura dos cartões)', type: 'number', min: 1, max: 20, step: 0.5, default: 3, unit: 'mm', group: 'Slot' },
      { key: 'tolerancia', label: 'Tolerância de encaixe', type: 'number', min: 0, max: 2, step: 0.05, default: 0.2, unit: 'mm', group: 'Slot' },
      { key: 'profundidadeSlot', label: 'Profundidade do slot', type: 'number', min: 10, max: 60, step: 1, default: 30, unit: 'mm', group: 'Slot' },
    ],
    presets: [
      { name: 'Cartões de visita', params: { largura: 70, profundidade: 50, altura: 45, raio: 6, anguloSlot: 20, larguraSlot: 3, tolerancia: 0.2, profundidadeSlot: 28 } },
      { name: 'Celular + cartões', params: { largura: 90, profundidade: 65, altura: 55, raio: 8, anguloSlot: 16, larguraSlot: 10, tolerancia: 0.3, profundidadeSlot: 35 } },
    ],
    generate(params) {
      const { largura, profundidade, altura, raio, anguloSlot, larguraSlot, tolerancia, profundidadeSlot } = params;

      const baseMesh = new THREE.Mesh(VertoShapes.roundedBox(largura, profundidade, altura, raio));

      const slotWidth = larguraSlot + tolerancia;
      const toolGeo = new THREE.BoxGeometry(largura - Math.max(raio, 4), profundidadeSlot, slotWidth);
      const angleRad = (anguloSlot * Math.PI) / 180;
      toolGeo.rotateX(-angleRad);
      // Push the slot in from the top-back edge, angled forward like a real card-holder groove.
      toolGeo.translate(0, altura - profundidadeSlot * Math.cos(angleRad) * 0.5 + 4, profundidade / 2 - profundidadeSlot * Math.sin(angleRad) * 0.5);

      const toolMesh = new THREE.Mesh(toolGeo);
      const result = VertoCSG.subtract(baseMesh, toolMesh);
      return result.geometry;
    },
  });
})();
