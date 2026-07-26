(function () {
  'use strict';

  VertoRegistry.register({
    id: 'gancho',
    name: 'Gancho',
    icon: 'box',
    category: 'Ferramentas',
    params: [
      { key: 'larguraPlaca', label: 'Largura da placa', type: 'number', min: 20, max: 100, step: 1, default: 40, unit: 'mm', group: 'Placa de fixação' },
      { key: 'alturaPlaca', label: 'Altura da placa', type: 'number', min: 30, max: 140, step: 1, default: 60, unit: 'mm', group: 'Placa de fixação' },
      { key: 'espessuraPlaca', label: 'Espessura da placa', type: 'number', min: 3, max: 12, step: 0.5, default: 5, unit: 'mm', group: 'Placa de fixação' },
      { key: 'diametroFuro', label: 'Diâmetro dos furos de fixação', type: 'number', min: 3, max: 10, step: 0.5, default: 4.5, unit: 'mm', group: 'Placa de fixação' },
      { key: 'raio', label: 'Raio dos cantos', type: 'number', min: 0, max: 20, step: 0.5, default: 6, unit: 'mm', group: 'Placa de fixação' },
      { key: 'comprimentoBraco', label: 'Comprimento do braço', type: 'number', min: 15, max: 80, step: 1, default: 35, unit: 'mm', group: 'Gancho' },
      { key: 'diametroBraco', label: 'Diâmetro do braço', type: 'number', min: 6, max: 20, step: 1, default: 10, unit: 'mm', group: 'Gancho' },
      { key: 'curvatura', label: 'Raio de curvatura da ponta', type: 'number', min: 8, max: 30, step: 1, default: 14, unit: 'mm', group: 'Gancho' },
    ],
    presets: [
      { name: 'Gancho de ferramentas', params: { larguraPlaca: 40, alturaPlaca: 60, espessuraPlaca: 5, diametroFuro: 4.5, raio: 6, comprimentoBraco: 35, diametroBraco: 10, curvatura: 14 } },
    ],
    generate(params) {
      const { larguraPlaca, alturaPlaca, espessuraPlaca, diametroFuro, raio, comprimentoBraco, diametroBraco, curvatura } = params;
      const parts = [];

      const plateGeo = VertoShapes.roundedBox(larguraPlaca, espessuraPlaca, alturaPlaca, raio);
      parts.push(plateGeo);

      const armY = alturaPlaca * 0.62;
      const armGeo = new THREE.CylinderGeometry(diametroBraco / 2, diametroBraco / 2, comprimentoBraco, 20);
      armGeo.rotateX(Math.PI / 2);
      armGeo.translate(0, armY, espessuraPlaca + comprimentoBraco / 2);
      parts.push(armGeo);

      const hookGeo = new THREE.TorusGeometry(curvatura, diametroBraco / 2, 12, 32, Math.PI * 1.35);
      hookGeo.rotateX(Math.PI / 2);
      hookGeo.rotateY(Math.PI);
      hookGeo.translate(0, armY + curvatura * 0.15, espessuraPlaca + comprimentoBraco);
      parts.push(hookGeo);

      let merged = VertoShapes.mergeGeometries(parts);

      const holeMargin = Math.max(raio, diametroFuro) + 3;
      const holeTop = VertoShapes.holeCylinder(diametroFuro, espessuraPlaca + 4, new THREE.Vector3(0, alturaPlaca - holeMargin, 0), 'z');
      const holeBottom = VertoShapes.holeCylinder(diametroFuro, espessuraPlaca + 4, new THREE.Vector3(0, holeMargin, 0), 'z');
      merged = VertoCSG.subtractMany(new THREE.Mesh(merged), [holeTop, holeBottom]);

      return merged.geometry;
    },
  });
})();
