(function () {
  'use strict';

  VertoRegistry.register({
    id: 'porta-celular',
    name: 'Porta Celular',
    icon: 'box',
    category: 'Escritório',
    params: [
      { key: 'largura', label: 'Largura', type: 'number', min: 40, max: 160, step: 1, default: 75, unit: 'mm', group: 'Dimensões' },
      { key: 'profundidadeBase', label: 'Profundidade da base', type: 'number', min: 30, max: 100, step: 1, default: 55, unit: 'mm', group: 'Dimensões' },
      { key: 'alturaEncosto', label: 'Altura do encosto', type: 'number', min: 30, max: 120, step: 1, default: 60, unit: 'mm', group: 'Dimensões' },
      { key: 'espessura', label: 'Espessura das paredes', type: 'number', min: 3, max: 12, step: 0.5, default: 6, unit: 'mm', group: 'Dimensões' },
      { key: 'anguloEncosto', label: 'Ângulo de apoio', type: 'number', min: 5, max: 30, step: 1, default: 12, unit: '°', group: 'Encosto' },
      { key: 'folga', label: 'Folga do encaixe (espessura do aparelho)', type: 'number', min: 6, max: 20, step: 0.5, default: 11, unit: 'mm', group: 'Encaixe' },
      { key: 'furoCabo', label: 'Diâmetro do furo p/ cabo', type: 'number', min: 0, max: 16, step: 0.5, default: 9, unit: 'mm', group: 'Encaixe' },
      { key: 'raio', label: 'Raio dos cantos', type: 'number', min: 0, max: 15, step: 0.5, default: 5, unit: 'mm', group: 'Impressão' },
    ],
    presets: [
      { name: 'Smartphone padrão', params: { largura: 75, profundidadeBase: 55, alturaEncosto: 60, espessura: 6, anguloEncosto: 12, folga: 11, furoCabo: 9, raio: 5 } },
      { name: 'Tablet', params: { largura: 130, profundidadeBase: 80, alturaEncosto: 90, espessura: 8, anguloEncosto: 15, folga: 12, furoCabo: 0, raio: 6 } },
    ],
    generate(params) {
      const { largura, profundidadeBase, alturaEncosto, espessura, anguloEncosto, folga, furoCabo, raio } = params;
      const parts = [];

      const baseGeo = VertoShapes.roundedBox(largura, profundidadeBase, espessura, raio);
      baseGeo.translate(0, 0, profundidadeBase / 2);
      parts.push(baseGeo);

      const angleRad = (anguloEncosto * Math.PI) / 180;
      const backGeo = new THREE.BoxGeometry(largura - 2, alturaEncosto, espessura);
      backGeo.translate(0, alturaEncosto / 2, espessura / 2);
      backGeo.rotateX(angleRad);
      backGeo.translate(0, espessura, profundidadeBase - espessura - 1);
      parts.push(backGeo);

      const lipHeight = 16;
      const lipShape = new THREE.Shape();
      lipShape.moveTo(0, 0);
      lipShape.lineTo(espessura * 1.3, 0);
      lipShape.lineTo(0, lipHeight);
      lipShape.closePath();
      const lipGeo = new THREE.ExtrudeGeometry(lipShape, { depth: largura - 2, bevelEnabled: false, curveSegments: 8 });
      lipGeo.rotateY(Math.PI / 2);
      const lipZ = Math.max(2, profundidadeBase - espessura - folga - espessura);
      lipGeo.translate(-(largura - 2) / 2, espessura, lipZ);
      parts.push(lipGeo);

      let merged = VertoShapes.mergeGeometries(parts);

      if (furoCabo > 0) {
        const hole = VertoShapes.holeCylinder(furoCabo, largura, new THREE.Vector3(0, espessura / 2, lipZ - espessura * 0.6), 'x');
        merged = VertoCSG.subtract(new THREE.Mesh(merged), hole).geometry;
      }
      return merged;
    },
  });
})();
