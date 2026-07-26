(function () {
  'use strict';

  VertoRegistry.register({
    id: 'modelo-personalizado',
    name: 'Modelo Personalizado',
    icon: 'preset',
    category: 'Personalizados',
    params: [
      { key: 'largura', label: 'Largura', type: 'number', min: 10, max: 400, step: 1, default: 100, unit: 'mm', group: 'Dimensões' },
      { key: 'profundidade', label: 'Profundidade', type: 'number', min: 10, max: 400, step: 1, default: 100, unit: 'mm', group: 'Dimensões' },
      { key: 'espessura', label: 'Espessura', type: 'number', min: 1, max: 60, step: 0.5, default: 6, unit: 'mm', group: 'Dimensões' },
      { key: 'raio', label: 'Raio dos cantos', type: 'number', min: 0, max: 60, step: 0.5, default: 6, unit: 'mm', group: 'Dimensões' },
      { key: 'furosAtivos', label: 'Ativar grade de furos', type: 'boolean', default: false, group: 'Furos' },
      { key: 'colunasFuros', label: 'Colunas de furos', type: 'number', min: 1, max: 12, step: 1, default: 4, unit: 'un', group: 'Furos', showIf: (p) => p.furosAtivos },
      { key: 'linhasFuros', label: 'Linhas de furos', type: 'number', min: 1, max: 12, step: 1, default: 4, unit: 'un', group: 'Furos', showIf: (p) => p.furosAtivos },
      { key: 'diametroFuros', label: 'Diâmetro dos furos', type: 'number', min: 1, max: 30, step: 0.5, default: 5, unit: 'mm', group: 'Furos', showIf: (p) => p.furosAtivos },
      { key: 'margemFuros', label: 'Margem da borda', type: 'number', min: 2, max: 60, step: 1, default: 12, unit: 'mm', group: 'Furos', showIf: (p) => p.furosAtivos },
      { key: 'textoAtivo', label: 'Ativar texto personalizado', type: 'boolean', default: false, group: 'Texto' },
      { key: 'texto', label: 'Texto', type: 'text', default: 'VERTOMAKER', maxLength: 30, group: 'Texto', showIf: (p) => p.textoAtivo },
      { key: 'fonteTamanho', label: 'Tamanho da fonte', type: 'number', min: 4, max: 60, step: 0.5, default: 12, unit: 'mm', group: 'Texto', showIf: (p) => p.textoAtivo },
      { key: 'modoTexto', label: 'Relevo ou gravação', type: 'select', default: 'relevo', options: [{ value: 'relevo', label: 'Relevo' }, { value: 'gravacao', label: 'Gravação' }], group: 'Texto', showIf: (p) => p.textoAtivo },
    ],
    presets: [
      { name: 'Placa em branco', params: { largura: 100, profundidade: 100, espessura: 6, raio: 6, furosAtivos: false, colunasFuros: 4, linhasFuros: 4, diametroFuros: 5, margemFuros: 12, textoAtivo: false, texto: 'VERTOMAKER', fonteTamanho: 12, modoTexto: 'relevo' } },
      { name: 'Grade de montagem 4x4', params: { largura: 120, profundidade: 120, espessura: 5, raio: 4, furosAtivos: true, colunasFuros: 4, linhasFuros: 4, diametroFuros: 4.5, margemFuros: 10, textoAtivo: false, texto: '', fonteTamanho: 12, modoTexto: 'relevo' } },
    ],
    // width(X)=largura, footprint-depth(Z)=profundidade, up-thickness(Y)=espessura
    generate(params) {
      const {
        largura, profundidade, espessura, raio,
        furosAtivos, colunasFuros, linhasFuros, diametroFuros, margemFuros,
        textoAtivo, texto, fonteTamanho, modoTexto,
      } = params;

      let mesh = new THREE.Mesh(VertoShapes.roundedBox(largura, profundidade, espessura, raio));

      if (furosAtivos) {
        const usableX = largura - 2 * margemFuros;
        const usableZ = profundidade - 2 * margemFuros;
        const tools = [];
        for (let r = 0; r < linhasFuros; r++) {
          for (let c = 0; c < colunasFuros; c++) {
            const x = -largura / 2 + margemFuros + (colunasFuros > 1 ? (usableX * c) / (colunasFuros - 1) : usableX / 2);
            const z = -profundidade / 2 + margemFuros + (linhasFuros > 1 ? (usableZ * r) / (linhasFuros - 1) : usableZ / 2);
            tools.push(VertoShapes.holeCylinder(diametroFuros, espessura + 4, new THREE.Vector3(x, espessura / 2, z), 'y'));
          }
        }
        mesh = VertoCSG.subtractMany(mesh, tools);
      }

      if (!textoAtivo || !texto || !texto.trim()) {
        return mesh.geometry;
      }

      const textDepth = Math.min(espessura * 0.4, 2);
      return VertoShapes.textGeometry(texto, fonteTamanho, textDepth).then((textGeo) => {
        if (modoTexto === 'relevo') {
          textGeo.translate(0, espessura, 0);
          return VertoShapes.mergeGeometries([mesh.geometry, textGeo]);
        }
        const tool = textGeo.clone();
        tool.translate(0, espessura - textDepth + 0.3, 0);
        return VertoCSG.subtract(mesh, new THREE.Mesh(tool)).geometry;
      });
    },
  });
})();
