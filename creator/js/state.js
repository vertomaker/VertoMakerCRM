/**
 * state.js
 * Centralized, observable application state. Persists everything the
 * spec requires (recent projects, favorites, presets, theme, viewer
 * settings) to localStorage so nothing is lost between sessions.
 * Nothing here is aware of *which* parametric models exist - it only
 * ever deals with { modelId, params } pairs, so new models never
 * require changes to this file.
 */
(function (global) {
  'use strict';

  const LS_KEYS = {
    projects: 'vtm_creator_projects',
    favorites: 'vtm_creator_favorites',
    presets: 'vtm_creator_presets',
    recents: 'vtm_creator_recents',
    theme: 'vtm_creator_theme',
    viewerPrefs: 'vtm_creator_viewer_prefs',
    lastSession: 'vtm_creator_last_session',
  };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn(`[state] Falha ao ler ${key}, usando padrão.`, e);
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[state] Falha ao gravar ${key} (armazenamento cheio?)`, e);
    }
  }
  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  const listeners = new Set();
  function emit(event, payload) {
    for (const fn of listeners) {
      try { fn(event, payload); } catch (e) { console.error(e); }
    }
  }

  // ---- Undo / redo (per current editing session, in-memory) --------
  const HISTORY_LIMIT = 50;
  let undoStack = [];
  let redoStack = [];
  let suppressHistory = false;

  const current = {
    modelId: null,
    params: {},
    projectId: null,
    projectName: 'Sem título',
  };

  function snapshot() {
    return JSON.parse(JSON.stringify(current.params));
  }

  const Store = {
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // -------------------------------------------------- current model
    setModel(modelId, params) {
      current.modelId = modelId;
      current.params = params ? JSON.parse(JSON.stringify(params)) : {};
      current.projectId = null;
      current.projectName = 'Sem título';
      undoStack = [snapshot()];
      redoStack = [];
      Store.addRecentModel(modelId);
      emit('model-changed', { modelId, params: current.params });
    },

    getModelId() { return current.modelId; },
    getParams() { return current.params; },

    setParam(key, value, opts = {}) {
      current.params[key] = value;
      if (!opts.skipHistory && !suppressHistory) {
        undoStack.push(snapshot());
        if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
        redoStack = [];
      }
      emit('params-changed', { params: current.params, key, value });
    },

    setParams(newParams, opts = {}) {
      current.params = JSON.parse(JSON.stringify(newParams));
      if (!opts.skipHistory) {
        undoStack.push(snapshot());
        if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
        redoStack = [];
      }
      emit('params-changed', { params: current.params });
    },

    undo() {
      if (undoStack.length <= 1) return false;
      redoStack.push(undoStack.pop());
      current.params = JSON.parse(JSON.stringify(undoStack[undoStack.length - 1]));
      emit('params-changed', { params: current.params });
      return true;
    },
    redo() {
      if (!redoStack.length) return false;
      const next = redoStack.pop();
      undoStack.push(next);
      current.params = JSON.parse(JSON.stringify(next));
      emit('params-changed', { params: current.params });
      return true;
    },
    canUndo() { return undoStack.length > 1; },
    canRedo() { return redoStack.length > 0; },

    // -------------------------------------------------------- projects
    listProjects() {
      return readJSON(LS_KEYS.projects, []).sort((a, b) => b.updatedAt - a.updatedAt);
    },
    saveProject(name) {
      const projects = readJSON(LS_KEYS.projects, []);
      const now = Date.now();
      if (current.projectId) {
        const idx = projects.findIndex((p) => p.id === current.projectId);
        if (idx >= 0) {
          projects[idx] = { ...projects[idx], name: name || projects[idx].name, modelId: current.modelId, params: current.params, updatedAt: now };
          writeJSON(LS_KEYS.projects, projects);
          emit('projects-changed');
          return projects[idx];
        }
      }
      const project = {
        id: uid(),
        name: name || `Projeto ${new Date(now).toLocaleString('pt-BR')}`,
        modelId: current.modelId,
        params: current.params,
        createdAt: now,
        updatedAt: now,
      };
      projects.push(project);
      writeJSON(LS_KEYS.projects, projects);
      current.projectId = project.id;
      current.projectName = project.name;
      emit('projects-changed');
      return project;
    },
    loadProject(id) {
      const project = readJSON(LS_KEYS.projects, []).find((p) => p.id === id);
      if (!project) return false;
      current.modelId = project.modelId;
      current.params = JSON.parse(JSON.stringify(project.params));
      current.projectId = project.id;
      current.projectName = project.name;
      undoStack = [snapshot()];
      redoStack = [];
      Store.addRecentProject(project.id);
      emit('model-changed', { modelId: current.modelId, params: current.params });
      return true;
    },
    deleteProject(id) {
      const projects = readJSON(LS_KEYS.projects, []).filter((p) => p.id !== id);
      writeJSON(LS_KEYS.projects, projects);
      emit('projects-changed');
    },
    newProject() {
      current.projectId = null;
      current.projectName = 'Sem título';
    },
    getProjectName() { return current.projectName; },

    // -------------------------------------------------------- recents
    addRecentModel(modelId) {
      let recents = readJSON(LS_KEYS.recents, []);
      recents = recents.filter((r) => !(r.type === 'model' && r.modelId === modelId));
      recents.unshift({ type: 'model', modelId, at: Date.now() });
      writeJSON(LS_KEYS.recents, recents.slice(0, 12));
      emit('recents-changed');
    },
    addRecentProject(projectId) {
      let recents = readJSON(LS_KEYS.recents, []);
      recents = recents.filter((r) => !(r.type === 'project' && r.projectId === projectId));
      recents.unshift({ type: 'project', projectId, at: Date.now() });
      writeJSON(LS_KEYS.recents, recents.slice(0, 12));
      emit('recents-changed');
    },
    listRecents() { return readJSON(LS_KEYS.recents, []); },

    // ------------------------------------------------------ favorites
    toggleFavorite(modelId) {
      let favs = readJSON(LS_KEYS.favorites, []);
      if (favs.includes(modelId)) favs = favs.filter((f) => f !== modelId);
      else favs.push(modelId);
      writeJSON(LS_KEYS.favorites, favs);
      emit('favorites-changed', favs);
      return favs;
    },
    isFavorite(modelId) { return readJSON(LS_KEYS.favorites, []).includes(modelId); },
    listFavorites() { return readJSON(LS_KEYS.favorites, []); },

    // -------------------------------------------------------- presets
    listPresets(modelId) {
      const all = readJSON(LS_KEYS.presets, {});
      return all[modelId] || [];
    },
    savePreset(modelId, name, params) {
      const all = readJSON(LS_KEYS.presets, {});
      if (!all[modelId]) all[modelId] = [];
      all[modelId].push({ id: uid(), name, params: JSON.parse(JSON.stringify(params)), createdAt: Date.now() });
      writeJSON(LS_KEYS.presets, all);
      emit('presets-changed', modelId);
    },
    deletePreset(modelId, presetId) {
      const all = readJSON(LS_KEYS.presets, {});
      if (all[modelId]) all[modelId] = all[modelId].filter((p) => p.id !== presetId);
      writeJSON(LS_KEYS.presets, all);
      emit('presets-changed', modelId);
    },

    // -------------------------------------------------- JSON import/export
    exportParamsJSON() {
      return JSON.stringify({ modelId: current.modelId, params: current.params, exportedAt: new Date().toISOString(), app: 'VertoMaker Creator' }, null, 2);
    },
    importParamsJSON(jsonString) {
      const data = JSON.parse(jsonString);
      if (!data || !data.modelId || !data.params) throw new Error('Arquivo JSON inválido: faltam campos "modelId" ou "params".');
      return data;
    },

    // ---------------------------------------------------------- theme
    getTheme() { return readJSON(LS_KEYS.theme, 'dark'); },
    setTheme(theme) { writeJSON(LS_KEYS.theme, theme); emit('theme-changed', theme); },

    // --------------------------------------------------- viewer prefs
    getViewerPrefs() {
      return readJSON(LS_KEYS.viewerPrefs, {
        wireframe: false, showGrid: true, showAxes: true, bgColor: '#111114', autoRotate: false,
      });
    },
    setViewerPrefs(patch) {
      const prefs = { ...Store.getViewerPrefs(), ...patch };
      writeJSON(LS_KEYS.viewerPrefs, prefs);
      emit('viewer-prefs-changed', prefs);
      return prefs;
    },

    // --------------------------------------------------- last session
    saveLastSession() {
      writeJSON(LS_KEYS.lastSession, { modelId: current.modelId, params: current.params, projectId: current.projectId, projectName: current.projectName });
    },
    loadLastSession() { return readJSON(LS_KEYS.lastSession, null); },
  };

  global.VertoState = Store;
})(window);
