/**
 * icons.js
 * Minimalist line-icon set (24x24 viewBox, stroke-based) so the whole
 * app never depends on external icon fonts or image requests.
 * Usage: VertoIcons.get('save') -> returns an <svg>...</svg> string
 */
(function (global) {
  'use strict';

  const stroke = 'stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"';

  const ICONS = {
    logo: `<svg viewBox="0 0 32 32"><path d="M16 2 L29 9 V23 L16 30 L3 23 V9 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 2 V16 L29 9" ${stroke}/><path d="M16 16 L3 9" ${stroke}/><path d="M16 16 V30" ${stroke}/></svg>`,
    new: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" ${stroke}/></svg>`,
    open: `<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" ${stroke}/></svg>`,
    save: `<svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H5Z" ${stroke}/><path d="M8 3v6h8V3M8 21v-7h8v7" ${stroke}/></svg>`,
    stl: `<svg viewBox="0 0 24 24"><path d="M12 2 21 7v10L12 22 3 17V7Z" ${stroke}/><path d="M12 12 21 7M12 12 3 7M12 12v10" ${stroke}/></svg>`,
    obj: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" ${stroke}/><path d="M12 3v18M3 12h18" ${stroke}/></svg>`,
    threemf: `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ${stroke}/><path d="M8 9h8M8 12h8M8 15h5" ${stroke}/></svg>`,
    sun: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" ${stroke}/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" ${stroke}/></svg>`,
    moon: `<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" ${stroke}/></svg>`,
    undo: `<svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5" ${stroke}/><path d="M4 12h11a5 5 0 0 1 0 10h-1" ${stroke}/></svg>`,
    redo: `<svg viewBox="0 0 24 24"><path d="M15 7l5 5-5 5" ${stroke}/><path d="M20 12H9a5 5 0 0 0 0 10h1" ${stroke}/></svg>`,
    wireframe: `<svg viewBox="0 0 24 24"><path d="M12 3 21 8v8l-9 5-9-5V8Z" ${stroke}/><path d="M12 3v18M3 8l9 5 9-5" ${stroke}/></svg>`,
    solid: `<svg viewBox="0 0 24 24"><path d="M12 3 21 8v8l-9 5-9-5V8Z" fill="currentColor" opacity=".18" ${stroke}/></svg>`,
    grid: `<svg viewBox="0 0 24 24"><path d="M3 9h18M3 15h18M9 3v18M15 3v18" ${stroke}/><rect x="3" y="3" width="18" height="18" rx="1" ${stroke}/></svg>`,
    axes: `<svg viewBox="0 0 24 24"><path d="M4 20V4M4 20h16M4 20L14 9" ${stroke}/></svg>`,
    camera: `<svg viewBox="0 0 24 24"><path d="M4 8h3l2-2h6l2 2h3v11H4Z" ${stroke}/><circle cx="12" cy="13.5" r="3.4" ${stroke}/></svg>`,
    star: `<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.1 1.4-6.3-4.8-4.3 6.4-.6Z" ${stroke}/></svg>`,
    starFilled: `<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.1 1.4-6.3-4.8-4.3 6.4-.6Z" fill="currentColor" ${stroke}/></svg>`,
    clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" ${stroke}/><path d="M12 7v5l3.5 2" ${stroke}/></svg>`,
    json: `<svg viewBox="0 0 24 24"><path d="M8 4c-2 0-3 1-3 3v3c0 1-1 2-2 2 1 0 2 1 2 2v3c0 2 1 3 3 3M16 4c2 0 3 1 3 3v3c0 1 1 2 2 2-1 0-2 1-2 2v3c0 2-1 3-3 3" ${stroke}/></svg>`,
    preset: `<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" ${stroke}/><circle cx="19" cy="18" r="1.6" fill="currentColor"/></svg>`,
    ruler: `<svg viewBox="0 0 24 24"><path d="M3 16 8 21 21 8 16 3Z" ${stroke}/><path d="M7 14l2 2M10 11l2 2M13 8l2 2" ${stroke}/></svg>`,
    weight: `<svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 1 3 3H9a3 3 0 0 1 3-3Z" ${stroke}/><path d="M6 8h12l2 12H4Z" ${stroke}/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19" ${stroke}/></svg>`,
    chevron: `<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" ${stroke}/></svg>`,
    search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" ${stroke}/><path d="M21 21l-4.3-4.3" ${stroke}/></svg>`,
    trash: `<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" ${stroke}/></svg>`,
    box: `<svg viewBox="0 0 24 24"><path d="M12 3 20 7.5v9L12 21 4 16.5v-9Z" ${stroke}/><path d="M12 3v9m0 9v-9M4 7.5 12 12l8-4.5" ${stroke}/></svg>`,
    menu: `<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" ${stroke}/></svg>`,
    sparkle: `<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" fill="currentColor" ${stroke}/><path d="M19 3l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" fill="currentColor"/></svg>`,
  };

  global.VertoIcons = {
    get(name) {
      return ICONS[name] || ICONS.box;
    },
  };
})(window);
