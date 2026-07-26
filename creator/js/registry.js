/**
 * registry.js
 * ------------------------------------------------------------------
 * Central registry for parametric models.
 *
 * HOW TO ADD A NEW MODEL (without touching any other file):
 *   1. Copy /models/_TEMPLATE.js to /models/my-model.js
 *   2. Fill in id, name, icon, category, params[] and generate()
 *   3. Add <script src="models/my-model.js"></script> to index.html
 *      (that is the ONLY line you ever need to touch outside /models)
 *
 * Every model file calls VertoRegistry.register({...}) at load time.
 * Nothing else in the app needs to know the model exists ahead of time.
 * ------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  const models = [];
  const byId = new Map();

  const VertoRegistry = {
    /**
     * Register a parametric model definition.
     * @param {Object} def
     * @param {string}   def.id        unique slug, e.g. "caixa-parametrica"
     * @param {string}   def.name      display name, e.g. "Caixa Paramétrica"
     * @param {string}   def.icon      inline SVG string or icon key (see icons.js)
     * @param {string}   def.category  one of VertoCategories
     * @param {Array}    def.params    parameter descriptors (see _TEMPLATE.js)
     * @param {Function} def.generate  (params) => THREE.BufferGeometry
     * @param {Function} [def.validate] (params) => params (clamp / fix invalid combos)
     */
    register(def) {
      if (!def || !def.id) {
        console.error('[VertoRegistry] Modelo inválido, "id" é obrigatório.', def);
        return;
      }
      if (byId.has(def.id)) {
        console.warn(`[VertoRegistry] Modelo "${def.id}" já registrado - substituindo.`);
        const idx = models.findIndex((m) => m.id === def.id);
        if (idx >= 0) models.splice(idx, 1);
      }
      models.push(def);
      byId.set(def.id, def);
    },

    all() {
      return models.slice();
    },

    get(id) {
      return byId.get(id) || null;
    },

    byCategory(category) {
      return models.filter((m) => m.category === category);
    },

    categories() {
      const set = new Set(models.map((m) => m.category));
      return Array.from(set);
    },
  };

  global.VertoRegistry = VertoRegistry;

  // Canonical category list (used to group the sidebar even before
  // any model of that category has been registered yet).
  global.VertoCategories = [
    'Organização',
    'Decoração',
    'Escritório',
    'Games',
    'Ferramentas',
    'Oficina',
    'Cozinha',
    'Personalizados',
    'Natal',
    'Halloween',
    'Geek',
    'Infantil',
  ];
})(window);
