/**
 * app.js - boots the whole application. This is the only file that
 * "knows" about all the other subsystems; it never hardcodes a list
 * of models (that always comes from VertoRegistry).
 */
(function () {
  'use strict';

  let viewer = null;
  let regenToken = 0; // guards against out-of-order async (text) regenerations
  let dirty = false;  // true when params changed since the last successful generation
  let lastGeometry = null;

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheEls();
    applyTheme(VertoState.getTheme());

    viewer = VertoViewer.create(els.viewportHost);
    const prefs = VertoState.getViewerPrefs();
    setToolbarState(prefs);
    viewer.setDimensionsVisible(prefs.showDimensions);

    wireTopbar();
    wireViewerToolbar();
    wireMobileSidebarToggle();
    wireBottomSheet();

    const sidebarApi = VertoUI.renderSidebar(els.sidebar, { onSelect: selectModel });
    els.sidebarApi = sidebarApi;

    VertoState.on(onStateEvent);

    bootstrapInitialModel(sidebarApi);
    window.addEventListener('beforeunload', () => VertoState.saveLastSession());
  }

  function cacheEls() {
    els.sidebar = document.getElementById('sidebar');
    els.viewportHost = document.getElementById('viewport-host');
    els.loading = document.getElementById('viewer-loading');
    els.projectNameTag = document.getElementById('project-name-tag');
    els.btnUndo = document.getElementById('btn-undo');
    els.btnRedo = document.getElementById('btn-redo');
    els.sheet = document.getElementById('bottom-sheet');
    els.sheetTabs = document.getElementById('sheet-tabs');
    els.sheetContent = document.getElementById('sheet-content');
    els.btnGenerate = document.getElementById('btn-generate');
    els.backdrop = document.getElementById('mobile-backdrop');
  }

  function bootstrapInitialModel(sidebarApi) {
    const last = VertoState.loadLastSession();
    const all = VertoRegistry.all();
    if (last && VertoRegistry.get(last.modelId)) {
      VertoState.setModel(last.modelId, last.params);
    } else if (all.length) {
      VertoState.setModel(all[0].id);
    }
    if (VertoState.getModelId()) sidebarApi.markActive(VertoState.getModelId());
  }

  // ---------------------------------------------------------- Model select
  function selectModel(modelId) {
    const def = VertoRegistry.get(modelId);
    if (!def) return;
    const defaults = {};
    for (const p of def.params) defaults[p.key] = p.default;
    VertoState.setModel(modelId, defaults);
    if (window.matchMedia('(max-width: 980px)').matches) closeSidebarDrawer();
  }

  function onStateEvent(event, payload) {
    if (event === 'model-changed') {
      const def = VertoRegistry.get(VertoState.getModelId());
      if (!def) return;
      els.sidebarApi.markActive(def.id);
      renderSheet();
      updateProjectTag();
      regenerate(); // initial view for a freshly selected model
    } else if (event === 'params-changed') {
      renderSheet();
      if (payload && payload.immediate) {
        regenerate();
      } else {
        setDirty(true);
      }
    } else if (event === 'theme-changed') {
      applyTheme(VertoState.getTheme());
    } else if (event === 'favorites-changed') {
      els.sidebarApi.refresh();
    }
    updateUndoRedoButtons();
  }

  function renderSheet() {
    const def = VertoRegistry.get(VertoState.getModelId());
    if (!def) return;
    VertoUI.renderBottomSheet(
      { tabsHost: els.sheetTabs, contentHost: els.sheetContent },
      def,
      VertoState.getParams(),
      { onChange: onParamChange, onInfoTabShown: () => renderEstimatorIfPossible() }
    );
  }

  function onParamChange(key, value) {
    VertoState.setParam(key, value);
  }

  function setDirty(state) {
    dirty = state;
    els.btnGenerate.classList.toggle('dirty', state);
  }

  // --------------------------------------------------------- Regeneration
  function regenerate() {
    const def = VertoRegistry.get(VertoState.getModelId());
    if (!def) return;
    const myToken = ++regenToken;
    els.loading.classList.add('show');
    let result;
    try {
      result = def.generate(VertoState.getParams());
    } catch (err) {
      console.error('[app] Erro ao gerar geometria:', err);
      VertoUI.toast('Erro ao gerar o modelo: ' + err.message, 'error');
      els.loading.classList.remove('show');
      return;
    }
    Promise.resolve(result).then((geometry) => {
      if (myToken !== regenToken) return; // a newer regeneration superseded this one
      viewer.setGeometry(geometry, { fit: false });
      lastGeometry = geometry;
      renderEstimatorIfPossible();
      els.loading.classList.remove('show');
      setDirty(false);
    }).catch((err) => {
      console.error('[app] Erro ao gerar geometria:', err);
      VertoUI.toast('Erro ao gerar o modelo: ' + err.message, 'error');
      els.loading.classList.remove('show');
    });
  }

  // ------------------------------------------------------------ Estimator
  const estimatorSettings = { material: 'PLA', infillPercent: 20, wallLoops: 3, layerHeight: 0.2, printSpeedMmS: 60, filamentPriceKg: 120, energyPriceKwh: 0.75, printerWatts: 120 };

  function renderEstimatorIfPossible() {
    const host = document.getElementById('estimator-host');
    if (!host || !lastGeometry) return;
    const r = VertoEstimator.estimate({ geometry: lastGeometry, ...estimatorSettings });
    host.innerHTML = '';
    const card = VertoUI.el('div', { class: 'estimator-card' }, [
      VertoUI.el('h3', {}, 'Estimativas'),
      VertoUI.el('div', { class: 'estimator-grid' }, [
        estimatorItem(r.volumeCm3.toFixed(1) + ' cm³', 'Volume'),
        estimatorItem(r.weightG.toFixed(1) + ' g', 'Peso'),
        estimatorItem(VertoEstimator.formatTime(r.timeHours), 'Tempo de impressão'),
        estimatorItem(r.filamentMeters.toFixed(2) + ' m', 'Filamento'),
        estimatorItem('R$ ' + r.costTotal.toFixed(2), 'Custo estimado'),
        estimatorItem(`${r.dims.x.toFixed(0)}×${r.dims.y.toFixed(0)}×${r.dims.z.toFixed(0)} mm`, 'Dimensões'),
      ]),
    ]);
    host.appendChild(card);
  }
  function estimatorItem(val, lbl) {
    return VertoUI.el('div', { class: 'estimator-item' }, [
      VertoUI.el('span', { class: 'val' }, val),
      VertoUI.el('span', { class: 'lbl' }, lbl),
    ]);
  }

  // ---------------------------------------------------------------- Topbar
  function wireTopbar() {
    document.getElementById('btn-new').addEventListener('click', () => {
      const def = VertoRegistry.get(VertoState.getModelId());
      if (def) selectModel(def.id);
      VertoState.newProject();
      updateProjectTag();
      VertoUI.toast('Novo projeto iniciado.');
    });

    document.getElementById('btn-open').addEventListener('click', openProjectsModal);
    document.getElementById('btn-save').addEventListener('click', openSaveModal);
    document.getElementById('btn-export-stl').addEventListener('click', () => doExport('stl'));
    document.getElementById('btn-export-3mf').addEventListener('click', () => doExport('3mf'));
    document.getElementById('btn-export-obj').addEventListener('click', () => doExport('obj'));
    document.getElementById('btn-presets').addEventListener('click', openPresetsModal);
    document.getElementById('btn-json-export').addEventListener('click', exportJSON);
    document.getElementById('btn-json-import').addEventListener('click', importJSON);
    document.getElementById('btn-screenshot').addEventListener('click', captureScreenshot);

    els.btnUndo.addEventListener('click', () => VertoState.undo());
    els.btnRedo.addEventListener('click', () => VertoState.redo());

    document.getElementById('btn-theme').addEventListener('click', () => {
      const next = VertoState.getTheme() === 'dark' ? 'light' : 'dark';
      VertoState.setTheme(next);
    });
  }

  function updateUndoRedoButtons() {
    els.btnUndo.disabled = !VertoState.canUndo();
    els.btnRedo.disabled = !VertoState.canRedo();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.innerHTML = VertoIcons.get(theme === 'dark' ? 'sun' : 'moon');
  }

  function updateProjectTag() {
    if (els.projectNameTag) els.projectNameTag.textContent = VertoState.getProjectName();
  }

  // --------------------------------------------------------------- Export
  function doExport(kind) {
    const geometry = viewer.getGeometry();
    if (!geometry) { VertoUI.toast('Nenhum modelo para exportar.', 'error'); return; }
    if (dirty) { VertoUI.toast('Há alterações não geradas - toque em "Gerar" antes de exportar.', 'error'); return; }
    const def = VertoRegistry.get(VertoState.getModelId());
    const name = (def ? def.name : 'modelo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').toLowerCase();
    if (kind === 'stl') VertoExporter.triggerDownload(VertoExporter.exportSTL(geometry, name), `${name}.stl`);
    if (kind === 'obj') VertoExporter.triggerDownload(VertoExporter.exportOBJ(geometry, name), `${name}.obj`);
    if (kind === '3mf') VertoExporter.triggerDownload(VertoExporter.export3MF(geometry, name), `${name}.3mf`);
    VertoUI.toast(`Exportado como .${kind}`, 'success');
  }

  function captureScreenshot() {
    const dataUrl = viewer.captureImage();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'vertomaker-preview.png';
    a.click();
    VertoUI.toast('Imagem capturada.', 'success');
  }

  // ------------------------------------------------------------ JSON I/O
  function exportJSON() {
    const json = VertoState.exportParamsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    VertoExporter.triggerDownload(blob, 'vertomaker-parametros.json');
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = VertoState.importParamsJSON(reader.result);
          if (!VertoRegistry.get(data.modelId)) throw new Error(`Modelo "${data.modelId}" não encontrado.`);
          VertoState.setModel(data.modelId, data.params);
          VertoUI.toast('Parâmetros importados.', 'success');
        } catch (err) {
          VertoUI.toast('Falha ao importar JSON: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  // --------------------------------------------------------- Projects UI
  function openSaveModal() {
    const input = VertoUI.el('input', { type: 'text', value: VertoState.getProjectName(), placeholder: 'Nome do projeto' });
    const body = VertoUI.el('div', { class: 'field' }, [VertoUI.el('label', {}, 'Nome do projeto'), input]);
    const modal = VertoUI.openModal({
      title: 'Salvar projeto',
      bodyEl: body,
      actions: [
        { label: 'Cancelar', onClick: () => modal.close() },
        { label: 'Salvar', primary: true, onClick: () => {
          VertoState.saveProject(input.value.trim() || undefined);
          updateProjectTag();
          VertoUI.toast('Projeto salvo.', 'success');
          modal.close();
        } },
      ],
    });
    input.focus();
  }

  function openProjectsModal() {
    const projects = VertoState.listProjects();
    const list = VertoUI.el('div', {});
    if (!projects.length) {
      list.appendChild(VertoUI.el('div', { class: 'sidebar-empty' }, 'Nenhum projeto salvo ainda.'));
    }
    for (const p of projects) {
      const def = VertoRegistry.get(p.modelId);
      const row = VertoUI.el('div', { class: 'list-row' }, [
        VertoUI.el('div', {}, [
          VertoUI.el('div', { class: 'name' }, p.name),
          VertoUI.el('div', { class: 'meta' }, `${def ? def.name : p.modelId} · ${new Date(p.updatedAt).toLocaleString('pt-BR')}`),
        ]),
        VertoUI.el('div', { class: 'list-row-actions' }, [
          VertoUI.el('button', { html: VertoIcons.get('open'), title: 'Abrir', onclick: () => { VertoState.loadProject(p.id); updateProjectTag(); modal.close(); VertoUI.toast('Projeto carregado.', 'success'); } }),
          VertoUI.el('button', { html: VertoIcons.get('trash'), title: 'Excluir', onclick: () => { VertoState.deleteProject(p.id); row.remove(); } }),
        ]),
      ]);
      list.appendChild(row);
    }
    const modal = VertoUI.openModal({ title: 'Projetos recentes', bodyEl: list, actions: [{ label: 'Fechar', primary: true, onClick: () => modal.close() }] });
  }

  // ---------------------------------------------------------- Presets UI
  function openPresetsModal() {
    const def = VertoRegistry.get(VertoState.getModelId());
    if (!def) return;
    const list = VertoUI.el('div', {});

    const builtIn = def.presets || [];
    const custom = VertoState.listPresets(def.id);

    function row(name, params, deletable, onDelete) {
      return VertoUI.el('div', { class: 'list-row' }, [
        VertoUI.el('div', { class: 'name' }, name),
        VertoUI.el('div', { class: 'list-row-actions' }, [
          VertoUI.el('button', { html: VertoIcons.get('open'), title: 'Aplicar', onclick: () => { VertoState.setParams(params, { immediate: true }); modal.close(); VertoUI.toast(`Preset "${name}" aplicado.`, 'success'); } }),
          deletable ? VertoUI.el('button', { html: VertoIcons.get('trash'), title: 'Excluir', onclick: onDelete }) : null,
        ]),
      ]);
    }
    if (builtIn.length) list.appendChild(VertoUI.el('div', { class: 'sidebar-section-label' }, 'Presets do modelo'));
    builtIn.forEach((p) => list.appendChild(row(p.name, p.params, false)));

    list.appendChild(VertoUI.el('div', { class: 'sidebar-section-label' }, 'Meus presets'));
    if (!custom.length) list.appendChild(VertoUI.el('div', { class: 'sidebar-empty' }, 'Nenhum preset salvo.'));
    custom.forEach((p) => {
      const r = row(p.name, p.params, true, () => { VertoState.deletePreset(def.id, p.id); r.remove(); });
      list.appendChild(r);
    });

    const nameInput = VertoUI.el('input', { type: 'text', placeholder: 'Nome do novo preset' });
    list.appendChild(VertoUI.el('div', { class: 'field', style: 'margin-top:14px' }, [VertoUI.el('label', {}, 'Salvar parâmetros atuais como preset'), nameInput]));

    const modal = VertoUI.openModal({
      title: 'Presets - ' + def.name,
      bodyEl: list,
      actions: [
        { label: 'Fechar', onClick: () => modal.close() },
        { label: 'Salvar preset atual', primary: true, onClick: () => {
          if (!nameInput.value.trim()) { VertoUI.toast('Dê um nome ao preset.', 'error'); return; }
          VertoState.savePreset(def.id, nameInput.value.trim(), VertoState.getParams());
          VertoUI.toast('Preset salvo.', 'success');
          modal.close();
        } },
      ],
    });
  }

  // ---------------------------------------------------------- Viewer bar
  function wireViewerToolbar() {
    const btnWire = document.getElementById('btn-wireframe');
    const btnSolid = document.getElementById('btn-solid');
    const btnGrid = document.getElementById('btn-grid');
    const btnAxes = document.getElementById('btn-axes');
    const btnDims = document.getElementById('btn-dimensions');
    const btnReset = document.getElementById('btn-reset-view');

    btnWire.addEventListener('click', () => { viewer.setWireframe(true); VertoState.setViewerPrefs({ wireframe: true }); setToolbarState(VertoState.getViewerPrefs()); });
    btnSolid.addEventListener('click', () => { viewer.setWireframe(false); VertoState.setViewerPrefs({ wireframe: false }); setToolbarState(VertoState.getViewerPrefs()); });
    btnGrid.addEventListener('click', () => {
      const prefs = VertoState.setViewerPrefs({ showGrid: !VertoState.getViewerPrefs().showGrid });
      viewer.setGrid(prefs.showGrid); setToolbarState(prefs);
    });
    btnAxes.addEventListener('click', () => {
      const prefs = VertoState.setViewerPrefs({ showAxes: !VertoState.getViewerPrefs().showAxes });
      viewer.setAxes(prefs.showAxes); setToolbarState(prefs);
    });
    btnDims.addEventListener('click', () => {
      const prefs = VertoState.setViewerPrefs({ showDimensions: !VertoState.getViewerPrefs().showDimensions });
      viewer.setDimensionsVisible(prefs.showDimensions); setToolbarState(prefs);
    });
    btnReset.addEventListener('click', () => viewer.resetView());

    document.getElementById('bg-color-input').addEventListener('input', (e) => {
      viewer.setBackground(e.target.value);
      VertoState.setViewerPrefs({ bgColor: e.target.value });
    });
  }

  function setToolbarState(prefs) {
    document.getElementById('btn-wireframe').classList.toggle('active', prefs.wireframe);
    document.getElementById('btn-solid').classList.toggle('active', !prefs.wireframe);
    document.getElementById('btn-grid').classList.toggle('active', prefs.showGrid);
    document.getElementById('btn-axes').classList.toggle('active', prefs.showAxes);
    document.getElementById('btn-dimensions').classList.toggle('active', prefs.showDimensions);
    const bg = document.getElementById('bg-color-input');
    if (bg) bg.value = prefs.bgColor;
  }

  // --------------------------------------------------------- Bottom sheet
  function wireBottomSheet() {
    const handle = document.getElementById('sheet-handle');
    handle.addEventListener('click', () => {
      const collapsed = els.sheet.dataset.state === 'peek';
      els.sheet.dataset.state = collapsed ? 'expanded' : 'peek';
    });
    els.btnGenerate.addEventListener('click', () => regenerate());
  }

  // ----------------------------------------------------- Mobile sidebar
  function wireMobileSidebarToggle() {
    const btn = document.getElementById('btn-toggle-sidebar');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = els.sidebar.classList.contains('open');
      isOpen ? closeSidebarDrawer() : openSidebarDrawer();
    });
    if (els.backdrop) els.backdrop.addEventListener('click', closeSidebarDrawer);
  }
  function openSidebarDrawer() {
    els.sidebar.classList.add('open');
    if (els.backdrop) els.backdrop.classList.add('show');
  }
  function closeSidebarDrawer() {
    els.sidebar.classList.remove('open');
    if (els.backdrop) els.backdrop.classList.remove('show');
  }
})();
