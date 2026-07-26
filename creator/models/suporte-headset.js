(function () {
  'use strict';

  VertoRegistry.register({
    id: 'suporte-headset',
    name: 'Suporte para Headset',
    icon: 'box',
    category: 'Games',
    params: [
      { key: 'diametroBase', label: 'Diâmetro da base', type: 'number', min: 60, max: 200, step: 1, default: 110, unit: 'mm', group: 'Base' },
      { key: 'alturaBase', label: 'Altura da base', type: 'number', min: 5, max: 30, step: 0.5, default: 12, unit: 'mm', group: 'Base' },
      { key: 'diametroPoste', label: 'Diâmetro do poste', type: 'number', min: 10, max: 40, step: 1, default: 22, unit: 'mm', group: 'Poste' },
      { key: 'alturaPoste', label: 'Altura do poste', type: 'number', min: 100, max: 320, step: 1, default: 200, unit: 'mm', group: 'Poste' },
      { key: 'raioGancho', label: 'Raio do gancho', type: 'number', min: 20, max: 60, step: 1, default: 38, unit: 'mm', group: 'Gancho' },
      { key: 'espessuraGancho', label: 'Espessura do gancho (tubo)', type: 'number', min: 6, max: 24, step: 1, default: 14, unit: 'mm', group: 'Gancho' },
      { key: 'arco', label: 'Abertura do arco', type: 'number', min: 140, max: 300, step: 5, default: 220, unit: '°', group: 'Gancho' },
    ],
    presets: [
      { name: 'Padrão de mesa', params: { diametroBase: 110, alturaBase: 12, diametroPoste: 22, alturaPoste: 200, raioGancho: 38, espessuraGancho: 14, arco: 220 } },
    ],
    generate(params) {
      const { diametroBase, alturaBase, diametroPoste, alturaPoste, raioGancho, espessuraGancho, arco } = params;
      const parts = [];

      const baseGeo = new THREE.CylinderGeometry(diametroBase / 2, diametroBase / 2 * 1.06, alturaBase, 40);
      baseGeo.translate(0, alturaBase / 2, 0);
      parts.push(baseGeo);

      const poleGeo = new THREE.CylinderGeometry(diametroPoste / 2, diametroPoste / 2, alturaPoste, 28);
      poleGeo.translate(0, alturaBase + alturaPoste / 2, 0);
      parts.push(poleGeo);

      const arcRad = (arco * Math.PI) / 180;
      const hookGeo = new THREE.TorusGeometry(raioGancho, espessuraGancho / 2, 14, 40, arcRad);
      hookGeo.rotateZ(Math.PI); // start the open end pointing down-forward
      hookGeo.rotateX(Math.PI / 2);
      hookGeo.translate(0, alturaBase + alturaPoste + raioGancho * 0.3, raioGancho * 0.15);
      parts.push(hookGeo);

      return VertoShapes.mergeGeometries(parts);
    },
  });
})();
