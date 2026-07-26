(function () {
  'use strict';

  VertoRegistry.register({
    id: 'vaso',
    name: 'Vaso',
    icon: 'box',
    category: 'Decoração',
    params: [
      { key: 'diametroBase', label: 'Diâmetro da base', type: 'number', min: 30, max: 200, step: 1, default: 70, unit: 'mm', group: 'Perfil' },
      { key: 'diametroBoca', label: 'Diâmetro da boca', type: 'number', min: 20, max: 220, step: 1, default: 90, unit: 'mm', group: 'Perfil' },
      { key: 'diametroBarriga', label: 'Diâmetro máximo (barriga)', type: 'number', min: 30, max: 260, step: 1, default: 120, unit: 'mm', group: 'Perfil' },
      { key: 'altura', label: 'Altura', type: 'number', min: 40, max: 300, step: 1, default: 150, unit: 'mm', group: 'Perfil' },
      { key: 'parede', label: 'Espessura das paredes', type: 'number', min: 0.8, max: 8, step: 0.1, default: 2.4, unit: 'mm', group: 'Impressão' },
      { key: 'baseEspessura', label: 'Espessura da base', type: 'number', min: 1, max: 10, step: 0.5, default: 3, unit: 'mm', group: 'Impressão' },
      { key: 'segmentos', label: 'Suavidade (segmentos radiais)', type: 'number', min: 12, max: 96, step: 4, default: 48, unit: 'un', group: 'Impressão' },
    ],
    presets: [
      { name: 'Vaso clássico', params: { diametroBase: 70, diametroBoca: 90, diametroBarriga: 120, altura: 150, parede: 2.4, baseEspessura: 3, segmentos: 48 } },
      { name: 'Vaso tulipa', params: { diametroBase: 50, diametroBoca: 130, diametroBarriga: 80, altura: 180, parede: 2, baseEspessura: 3, segmentos: 56 } },
    ],
    generate(params) {
      const { diametroBase, diametroBoca, diametroBarriga, altura, parede, baseEspessura, segmentos } = params;
      const rBase = diametroBase / 2, rBoca = diametroBoca / 2, rBarriga = diametroBarriga / 2;
      const bellyY = altura * 0.55;

      const innerBoca = Math.max(rBoca - parede, 1);
      const innerBarriga = Math.max(rBarriga - parede, 1);
      const innerBase = Math.max(rBase - parede, 1);

      // Smooth curved sections for the outer and inner walls only - the
      // bottom, rim-top and interior-floor segments are straight lines.
      const outerWall = new THREE.SplineCurve([
        new THREE.Vector2(rBase, 0),
        new THREE.Vector2(rBarriga, bellyY),
        new THREE.Vector2(rBoca, altura),
      ]).getPoints(24);

      const innerWall = new THREE.SplineCurve([
        new THREE.Vector2(innerBoca, altura),
        new THREE.Vector2(innerBarriga, bellyY),
        new THREE.Vector2(innerBase, baseEspessura),
      ]).getPoints(24);

      // A single continuous, CLOSED profile - both ends pinned to the
      // rotation axis (radius 0) so LatheGeometry produces a real,
      // watertight solid: flat bottom -> outer wall up -> rim top ->
      // inner wall down -> flat interior floor -> back to the axis.
      const profile = [
        new THREE.Vector2(0, 0),           // bottom center (closes automatically)
        ...outerWall,                       // (rBase,0) up to (rBoca,altura)
        ...innerWall,                       // (innerBoca,altura) down to (innerBase,baseEspessura)
        new THREE.Vector2(0, baseEspessura), // interior floor center (closes automatically)
      ];

      const geo = new THREE.LatheGeometry(profile, Math.round(segmentos));
      geo.computeVertexNormals();
      return geo;
    },
  });
})();
