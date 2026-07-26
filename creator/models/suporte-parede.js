(function () {
  'use strict';

  VertoRegistry.register({
    id: 'suporte-parede',
    name: 'Suporte de Parede',
    icon: 'box',
    category: 'Oficina',
    params: [
      { key: 'largura', label: 'Largura (comprimento da peça)', type: 'number', min: 15, max: 100, step: 1, default: 30, unit: 'mm', group: 'Dimensões' },
      { key: 'alturaVertical', label: 'Altura do braço vertical', type: 'number', min: 30, max: 200, step: 1, default: 90, unit: 'mm', group: 'Dimensões' },
      { key: 'comprimentoHorizontal', label: 'Comprimento do braço horizontal', type: 'number', min: 30, max: 220, step: 1, default: 100, unit: 'mm', group: 'Dimensões' },
      { key: 'espessura', label: 'Espessura da cantoneira', type: 'number', min: 4, max: 20, step: 0.5, default: 8, unit: 'mm', group: 'Dimensões' },
      { key: 'raioFiletamento', label: 'Raio do filete interno', type: 'number', min: 0, max: 30, step: 1, default: 10, unit: 'mm', group: 'Reforço' },
      { key: 'diametroFuro', label: 'Diâmetro dos furos de fixação', type: 'number', min: 3, max: 12, step: 0.5, default: 5, unit: 'mm', group: 'Fixação' },
    ],
    presets: [
      { name: 'Suporte de prateleira', params: { largura: 30, alturaVertical: 90, comprimentoHorizontal: 100, espessura: 8, raioFiletamento: 10, diametroFuro: 5 } },
    ],
    // Extrusion axis = X (largura). Profile plane: Z (out from the wall) x Y (up the wall)
    generate(params) {
      const { largura, alturaVertical, comprimentoHorizontal, espessura, raioFiletamento, diametroFuro } = params;
      const r = Math.min(raioFiletamento, comprimentoHorizontal - espessura - 1, alturaVertical - espessura - 1);

      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(espessura, 0);
      shape.lineTo(espessura, alturaVertical - espessura - Math.max(r, 0));
      if (r > 0) {
        shape.quadraticCurveTo(espessura, alturaVertical - espessura, espessura + r, alturaVertical - espessura);
      }
      shape.lineTo(comprimentoHorizontal, alturaVertical - espessura);
      shape.lineTo(comprimentoHorizontal, alturaVertical);
      shape.lineTo(0, alturaVertical);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth: largura, bevelEnabled: false, curveSegments: 10 });
      geo.rotateY(Math.PI / 2);
      geo.scale(1, 1, -1);
      geo.translate(-largura / 2, 0, 0);
      geo.computeVertexNormals();

      let mesh = new THREE.Mesh(geo);
      const holeVert1 = VertoShapes.holeCylinder(diametroFuro, espessura + 4, new THREE.Vector3(0, alturaVertical * 0.22, espessura / 2), 'x');
      const holeVert2 = VertoShapes.holeCylinder(diametroFuro, espessura + 4, new THREE.Vector3(0, alturaVertical * 0.75, espessura / 2), 'x');
      const holeHoriz = VertoShapes.holeCylinder(diametroFuro, espessura + 4, new THREE.Vector3(0, alturaVertical - espessura / 2, comprimentoHorizontal * 0.8), 'x');
      mesh = VertoCSG.subtractMany(mesh, [holeVert1, holeVert2, holeHoriz]);

      return mesh.geometry;
    },
  });
})();
