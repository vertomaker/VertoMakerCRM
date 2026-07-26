(function () {
  'use strict';

  VertoRegistry.register({
    id: 'suporte-notebook',
    name: 'Suporte para Notebook',
    icon: 'box',
    category: 'Escritório',
    params: [
      { key: 'largura', label: 'Largura', type: 'number', min: 100, max: 400, step: 1, default: 260, unit: 'mm', group: 'Dimensões' },
      { key: 'profundidade', label: 'Profundidade', type: 'number', min: 80, max: 260, step: 1, default: 180, unit: 'mm', group: 'Dimensões' },
      { key: 'alturaFrente', label: 'Altura frontal', type: 'number', min: 10, max: 60, step: 1, default: 20, unit: 'mm', group: 'Dimensões' },
      { key: 'alturaTras', label: 'Altura traseira', type: 'number', min: 30, max: 140, step: 1, default: 75, unit: 'mm', group: 'Dimensões' },
      { key: 'furos', label: 'Quantidade de furos de ventilação', type: 'number', min: 0, max: 24, step: 1, default: 8, unit: 'un', group: 'Ventilação' },
      { key: 'diametroFuros', label: 'Diâmetro dos furos', type: 'number', min: 5, max: 30, step: 1, default: 14, unit: 'mm', group: 'Ventilação' },
    ],
    presets: [
      { name: 'Notebook 15"', params: { largura: 280, profundidade: 190, alturaFrente: 20, alturaTras: 80, furos: 10, diametroFuros: 15 } },
    ],
    // Extrusion axis = X (largura); profile plane = Z (profundidade) x Y (altura)
    generate(params) {
      const { largura, profundidade, alturaFrente, alturaTras, furos, diametroFuros } = params;

      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(profundidade, 0);
      shape.lineTo(profundidade, alturaTras);
      shape.lineTo(0, alturaFrente);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth: largura, bevelEnabled: false, curveSegments: 4 });
      geo.rotateY(Math.PI / 2);
      geo.translate(-largura / 2, 0, 0);
      // After rotateY(90): new X = old Z (extrude, [0,largura] -> [0,largura], then centered by translate)
      // new Z = -old X (profile depth axis, [0,-profundidade]); flip so it reads [0, profundidade] forward.
      geo.scale(1, 1, -1);
      geo.computeVertexNormals();

      let mesh = new THREE.Mesh(geo);

      if (furos > 0) {
        const cols = Math.max(2, Math.ceil(Math.sqrt(furos * (largura / Math.max(profundidade, 1)))));
        const rows = Math.max(1, Math.ceil(furos / cols));
        const marginX = largura * 0.12, marginZ = profundidade * 0.22;
        const usableX = largura - 2 * marginX;
        const usableZ = profundidade - 2 * marginZ;
        let placed = 0;
        const tools = [];
        for (let r = 0; r < rows && placed < furos; r++) {
          for (let c = 0; c < cols && placed < furos; c++) {
            const x = -largura / 2 + marginX + (cols > 1 ? (usableX * c) / (cols - 1) : usableX / 2);
            const z = marginZ + (rows > 1 ? (usableZ * r) / (rows - 1) : usableZ / 2);
            const localHeight = alturaFrente + ((alturaTras - alturaFrente) * z) / profundidade;
            const hole = VertoShapes.holeCylinder(diametroFuros, localHeight + 10, new THREE.Vector3(x, localHeight / 2, z), 'y');
            tools.push(hole);
            placed++;
          }
        }
        mesh = VertoCSG.subtractMany(mesh, tools);
      }

      return mesh.geometry;
    },
  });
})();
