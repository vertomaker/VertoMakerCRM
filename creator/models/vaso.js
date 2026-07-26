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

      // Outer profile: base -> belly (widest point) -> mouth, using smooth control points.
      const outer = [
        new THREE.Vector2(Math.max(rBase - 4, 1), 0),
        new THREE.Vector2(rBase, baseEspessura),
        new THREE.Vector2(rBarriga, bellyY),
        new THREE.Vector2(rBoca, altura),
      ];
      const outerCurve = new THREE.SplineCurve(outer).getPoints(28);

      // Inner profile (offset inward by wall thickness) mirrored back down to form the rim + floor,
      // producing a single closed "U" profile so LatheGeometry yields one manifold solid.
      const innerBoca = Math.max(rBoca - parede, 1);
      const innerBarriga = Math.max(rBarriga - parede, 1);
      const innerBase = Math.max(rBase - parede, 1);
      const inner = [
        new THREE.Vector2(innerBoca, altura),
        new THREE.Vector2(innerBarriga, bellyY),
        new THREE.Vector2(innerBase, baseEspessura + 0.6),
        new THREE.Vector2(Math.max(innerBase - 4, 0.5), baseEspessura),
      ];
      const innerCurve = new THREE.SplineCurve(inner).getPoints(28);

      const profile = [...outerCurve, ...innerCurve];
      const geo = new THREE.LatheGeometry(profile, Math.round(segmentos));
      geo.computeVertexNormals();
      return geo;
    },
  });
})();
