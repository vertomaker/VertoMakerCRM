/**
 * ui.js - pure DOM rendering + event wiring. Talks to VertoRegistry
 * (what models exist) and VertoState (what's selected / saved) but
 * never hardcodes a model name, so new /models/*.js files show up
 * automatically in the sidebar with zero changes here.
 */
(function (global) {
  'use strict';

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const child of [].concat(children)) {
      if (child == null) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  // ------------------------------------------------------------ Sidebar
  function renderSidebar(container, { onSelect }) {
    container.innerHTML = '';
    let searchTerm = '';

    const searchWrap = el('div', { class: 'sidebar-search' }, [
      el('span', { class: 'icon', html: VertoIcons.get('search') }),
      el('input', {
        type: 'text', placeholder: 'Buscar modelo...', class: 'sidebar-search-input',
        oninput: (e) => { searchTerm = e.target.value.toLowerCase(); renderList(); },
      }),
    ]);
    container.appendChild(searchWrap);

    const listHost = el('div', { class: 'sidebar-list' });
    container.appendChild(listHost);

    function modelRow(model) {
      const isFav = VertoState.isFavorite(model.id);
      const row = el('div', { class: 'model-row', 'data-model-id': model.id }, [
        el('span', { class: 'model-icon', html: VertoIcons.get(model.icon || 'box') }),
        el('span', { class: 'model-name' }, model.name),
        el('button', {
          class: 'fav-btn' + (isFav ? ' active' : ''),
          title: 'Favoritar',
          html: VertoIcons.get(isFav ? 'starFilled' : 'star'),
          onclick: (e) => { e.stopPropagation(); VertoState.toggleFavorite(model.id); renderList(); },
        }),
      ]);
      row.addEventListener('click', () => {
        listHost.querySelectorAll('.model-row.active').forEach((r) => r.classList.remove('active'));
        row.classList.add('active');
        onSelect(model.id);
      });
      return row;
    }

    function renderList() {
      listHost.innerHTML = '';
      const all = VertoRegistry.all().filter((m) => !searchTerm || m.name.toLowerCase().includes(searchTerm));

      const favs = all.filter((m) => VertoState.isFavorite(m.id));
      if (favs.length) {
        listHost.appendChild(el('div', { class: 'sidebar-section-label' }, 'Favoritos'));
        favs.forEach((m) => listHost.appendChild(modelRow(m)));
      }

      const categories = VertoCategories.filter((c) => all.some((m) => m.category === c));
      for (const cat of categories) {
        const models = all.filter((m) => m.category === cat);
        if (!models.length) continue;
        listHost.appendChild(el('div', { class: 'sidebar-section-label' }, cat));
        models.forEach((m) => listHost.appendChild(modelRow(m)));
      }

      if (!all.length) {
        listHost.appendChild(el('div', { class: 'sidebar-empty' }, 'Nenhum modelo encontrado.'));
      }
    }

    renderList();
    return { refresh: renderList, markActive: (id) => {
      listHost.querySelectorAll('.model-row').forEach((r) => r.classList.toggle('active', r.dataset.modelId === id));
    } };
  }

  // -------------------------------------------------------- Param panel
  function paramControl(param, value, onChange) {
    const unit = param.unit || (param.type === 'number' ? 'mm' : '');

    if (param.type === 'select') {
      const select = el('select', { class: 'param-select' },
        param.options.map((opt) => el('option', { value: opt.value, ...(opt.value === value ? { selected: 'selected' } : {}) }, opt.label))
      );
      select.addEventListener('change', (e) => onChange(e.target.value));
      return el('div', { class: 'param-row' }, [
        el('label', {}, param.label),
        el('div', { class: 'param-control' }, [select]),
      ]);
    }

    if (param.type === 'boolean') {
      const checkbox = el('input', { type: 'checkbox', ...(value ? { checked: 'checked' } : {}) });
      checkbox.addEventListener('change', (e) => onChange(e.target.checked));
      return el('div', { class: 'param-row param-row-boolean' }, [
        el('label', {}, param.label),
        el('label', { class: 'switch' }, [checkbox, el('span', { class: 'slider-toggle' })]),
      ]);
    }

    if (param.type === 'text') {
      const input = el('input', { type: 'text', value: value ?? '', maxlength: param.maxLength || 40, class: 'param-text' });
      input.addEventListener('input', (e) => onChange(e.target.value));
      return el('div', { class: 'param-row' }, [
        el('label', {}, param.label),
        el('div', { class: 'param-control' }, [input]),
      ]);
    }

    // default: numeric (field + slider + unit)
    const min = param.min ?? 0, max = param.max ?? 100, step = param.step ?? 1;
    const numberInput = el('input', { type: 'number', min, max, step, value, class: 'param-number' });
    const slider = el('input', { type: 'range', min, max, step, value, class: 'param-slider' });
    const unitLabel = el('span', { class: 'param-unit' }, unit);

    function commit(v) {
      let num = parseFloat(v);
      if (isNaN(num)) num = param.default ?? min;
      num = Math.min(max, Math.max(min, num));
      numberInput.value = num;
      slider.value = num;
      onChange(num);
    }
    numberInput.addEventListener('input', (e) => commit(e.target.value));
    numberInput.addEventListener('blur', (e) => commit(e.target.value));
    slider.addEventListener('input', (e) => commit(e.target.value));

    return el('div', { class: 'param-row' }, [
      el('div', { class: 'param-row-head' }, [
        el('label', {}, param.label),
        el('div', { class: 'param-value' }, [numberInput, unitLabel]),
      ]),
      el('div', { class: 'param-control' }, [slider]),
    ]);
  }

  // -------------------------------------------------------- Bottom sheet
  /**
   * Renders a MakeLab-style bottom sheet: horizontal tabs (one per
   * parameter `group`, plus a trailing "Info" tab for the estimator),
   * a scrollable content area for the active tab, and a footer with
   * the Generate button owned by app.js.
   */
  function renderBottomSheet(refs, modelDef, params, callbacks) {
    const { tabsHost, contentHost } = refs;
    const { onChange } = callbacks;

    const groups = [];
    const groupParams = {};
    for (const p of modelDef.params) {
      const g = p.group || 'Parâmetros';
      if (!groupParams[g]) { groups.push(g); groupParams[g] = []; }
      groupParams[g].push(p);
    }
    const tabNames = [...groups, 'Info'];
    let activeTab = tabsHost.dataset.modelId === modelDef.id && tabNames.includes(tabsHost.dataset.activeTab)
      ? tabsHost.dataset.activeTab : tabNames[0];
    tabsHost.dataset.modelId = modelDef.id;
    tabsHost.dataset.activeTab = activeTab;

    function renderContent() {
      contentHost.innerHTML = '';
      if (activeTab === 'Info') {
        contentHost.appendChild(el('div', { id: 'estimator-host' }));
        if (callbacks.onInfoTabShown) callbacks.onInfoTabShown();
        return;
      }
      for (const p of groupParams[activeTab] || []) {
        if (p.showIf && !p.showIf(params)) continue;
        contentHost.appendChild(paramControl(p, params[p.key], (v) => onChange(p.key, v)));
      }
    }

    tabsHost.innerHTML = '';
    tabsHost.appendChild(el('span', { class: 'sheet-model-name' }, [
      el('span', { class: 'model-icon', html: VertoIcons.get(modelDef.icon || 'box') }),
      ' ' + modelDef.name,
    ]));
    for (const name of tabNames) {
      const tab = el('button', { class: 'sheet-tab' + (name === activeTab ? ' active' : '') }, name);
      tab.addEventListener('click', () => {
        activeTab = name;
        tabsHost.dataset.activeTab = name;
        tabsHost.querySelectorAll('.sheet-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        renderContent();
      });
      tabsHost.appendChild(tab);
    }

    renderContent();
  }

  // -------------------------------------------------------------- Modal
  function openModal({ title, bodyEl, actions = [] }) {
    const overlay = el('div', { class: 'modal-overlay' });
    const modal = el('div', { class: 'modal' }, [
      el('div', { class: 'modal-header' }, [
        el('h3', {}, title),
        el('button', { class: 'modal-close', html: VertoIcons.get('close'), onclick: () => close() }),
      ]),
      el('div', { class: 'modal-body' }, [bodyEl]),
      el('div', { class: 'modal-actions' }, actions.map((a) =>
        el('button', { class: 'btn ' + (a.primary ? 'btn-primary' : 'btn-ghost'), onclick: a.onClick }, a.label)
      )),
    ]);
    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    function close() { overlay.remove(); }
    return { close, overlay };
  }

  function toast(message, kind = 'info') {
    const host = document.getElementById('toast-host');
    if (!host) return;
    const node = el('div', { class: `toast toast-${kind}` }, message);
    host.appendChild(node);
    setTimeout(() => node.classList.add('show'), 10);
    setTimeout(() => { node.classList.remove('show'); setTimeout(() => node.remove(), 300); }, 3200);
  }

  global.VertoUI = { el, renderSidebar, renderBottomSheet, openModal, toast };
})(window);
