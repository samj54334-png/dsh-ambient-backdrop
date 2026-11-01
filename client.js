/**
 * Client half of the ambient-backdrop bundle.
 *
 * Paints a fixed gradient — or the user's own picture — behind the shell and
 * turns the two big base surfaces (the application base and the sidebar fill)
 * into translucent theme colours so the artwork reads through them. Everything
 * else — dialogs, menus, cards, code blocks, input pills — keeps the stock
 * opaque tokens, so readability does not depend on the chosen artwork.
 *
 * The picture is stored as a Blob in this browser's IndexedDB; nothing is
 * uploaded and the host never touches it.
 */
window.__ModuleLoader__.load({
  id: 'dsh-ambient-backdrop',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PKG = 'dsh-ambient-backdrop';
    const NS = PKG;
    const PREFS_KEY = PKG + ':prefs';
    const DB_NAME = PKG;
    const DB_STORE = 'assets';
    const IMAGE_KEY = 'background';
    const MAX_FILE_BYTES = 30 * 1024 * 1024;
    const MAX_OPACITY = 70;
    const MAX_VEIL = 92;
    const MAX_BLUR = 40;
    const DEFAULT_PREFS = { preset: 'aurora', opacity: 40, veil: 55, blur: 20 };

    // Gradients are picked so the worst part of each palette still leaves the
    // shell's primary/secondary labels comfortably readable at veil 0.
    const PRESETS = [
      { id: 'image' },
      { id: 'aurora', dark: ['#071a23', '#241140'], light: ['#e6f7f2', '#efe9fb'] },
      { id: 'abyss', dark: ['#04131f', '#0b3342'], light: ['#e2f1fb', '#eef8fa'] },
      { id: 'dusk', dark: ['#1c0f24', '#3c1812'], light: ['#fdece5', '#f6e7f0'] },
      { id: 'forest', dark: ['#07160e', '#1d2b10'], light: ['#e8f4e4', '#f6f2e1'] },
      { id: 'graphite', dark: ['#0a0b0f', '#22252d'], light: ['#f3f4f6', '#e7e9ee'] },
      { id: 'off' },
    ];

    const COPY = {
      zh: {
        nav: '氛围背景',
        title: '氛围背景',
        intro:
          '半透明亚克力：每个面板、弹窗和菜单都会叠加磨砂与透明底色，背景从所有层里透出来。',
        presetLabel: '背景样式',
        opacityLabel: '面板透明度',
        opacityHint:
          '调低更透、磨砂后面更明显；调高更接近原生实心界面。弹窗和菜单留了更高的底色，保证字清楚。',
        blurLabel: '磨砂强度',
        blurHint: '0 关闭磨砂；20–30 是亚克力的常见范围，越高越糊。',
        imageLabel: '背景图片',
        imageHint: '图片只保存在这台机器的浏览器里，不会上传，也不会写进项目目录。',
        imageEmpty: '还没有选择图片',
        imageDrop: '也可以把图片拖到这里',
        imagePick: '选择图片',
        imageReplace: '更换图片',
        imageRemove: '移除图片',
        veilLabel: '图片遮罩',
        veilHint: '遮罩越浓，图片越淡、字越清楚；调低更能看清图片。',
        notImage: '请选择图片文件（PNG / JPEG / WebP / GIF / AVIF）。',
        tooBig: '图片太大了（上限 30 MB），换一张小一点的吧。',
        storageFail: '保存失败，浏览器存储可能已满：',
        unsupported: '当前环境不支持 IndexedDB，图片无法保存。',
        note: '选择会立即保存，下次打开自动恢复。',
        preset_off: '关闭',
        preset_image: '图片',
        preset_aurora: '极光',
        preset_abyss: '深海',
        preset_dusk: '暮色',
        preset_forest: '松林',
        preset_graphite: '石墨',
      },
      en: {
        nav: 'Ambient backdrop',
        title: 'Ambient backdrop',
        intro:
          'Translucent acrylic: every panel, dialog and menu stacks a frosted tint, so the backdrop shows through all layers.',
        presetLabel: 'Backdrop',
        opacityLabel: 'Panel transparency',
        opacityHint:
          'Lower is more transparent; higher is closer to the stock solid shell. Dialogs and menus keep a stronger tint for legibility.',
        blurLabel: 'Frost strength',
        blurHint: '0 turns frosting off; 20–30 is the usual acrylic range.',
        imageLabel: 'Background picture',
        imageHint:
          'The picture stays in this browser on this machine — never uploaded, never written to the project.',
        imageEmpty: 'No picture yet',
        imageDrop: '…or drop a picture here',
        imagePick: 'Choose a picture',
        imageReplace: 'Replace picture',
        imageRemove: 'Remove picture',
        veilLabel: 'Picture veil',
        veilHint:
          'A stronger veil fades the picture and keeps text sharp; lower shows more of the picture.',
        notImage: 'Please pick an image file (PNG / JPEG / WebP / GIF / AVIF).',
        tooBig: 'That picture is too large (30 MB limit). Try a smaller one.',
        storageFail: 'Could not save — browser storage may be full: ',
        unsupported: 'IndexedDB is unavailable here, so the picture cannot be stored.',
        note: 'Changes save instantly and come back next time.',
        preset_off: 'Off',
        preset_image: 'Picture',
        preset_aurora: 'Aurora',
        preset_abyss: 'Abyss',
        preset_dusk: 'Dusk',
        preset_forest: 'Forest',
        preset_graphite: 'Graphite',
      },
    };

    const UI_CSS = `
.dab-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 640px;
  padding: 2px 0 8px;
}
.dab-head-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
  margin: 0 0 4px;
}
.dab-head-intro {
  font-size: 12px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
  margin: 0;
}
.dab-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dab-field-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
}
.dab-field-value {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.dab-field-hint {
  font-size: 12px;
  line-height: 1.55;
  color: var(--dsw-alias-label-secondary);
}
.dab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
  gap: 10px;
}
.dab-card {
  appearance: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  cursor: pointer;
  text-align: left;
}
.dab-card:hover {
  background: var(--dsw-alias-bg-layer-2);
}
.dab-card[aria-pressed='true'] {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary);
}
.dab-swatch {
  display: block;
  height: 54px;
  border-radius: 7px;
  background-size: cover;
  background-position: center;
}
.dab-swatch-off {
  background: repeating-linear-gradient(
    135deg,
    var(--dsw-alias-bg-layer-2) 0 6px,
    var(--dsw-alias-bg-layer-1) 6px 12px
  );
}
.dab-swatch-image {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.dab-swatch-image[data-has-image='true'] {
  border-style: solid;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
}
.dab-image-row {
  display: flex;
  gap: 14px;
  align-items: stretch;
}
.dab-thumb {
  flex: 1 1 auto;
  min-height: 132px;
  border-radius: 10px;
  border: 1px dashed var(--dsw-alias-border-l1);
  background-color: var(--dsw-alias-bg-layer-1);
  background-size: cover;
  background-position: center center;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  cursor: pointer;
}
.dab-thumb[data-dragging='true'] {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-brand-primary);
}
.dab-thumb[data-has-image='true'] {
  border-style: solid;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
}
.dab-thumb-meta {
  align-self: flex-end;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dab-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  flex: 0 0 auto;
}
.dab-btn {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
}
.dab-btn:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-2);
}
.dab-btn[data-kind='primary'] {
  background: var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary));
  border-color: transparent;
  color: var(--dsw-alias-label-primary-foreground, #ffffff);
  font-weight: 500;
}
.dab-error {
  font-size: 12px;
  line-height: 1.55;
  color: var(--dsw-alias-state-error-primary);
}
.dab-card-label {
  font-size: 12px;
  color: var(--dsw-alias-label-primary);
}
.dab-range {
  width: 100%;
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary);
}
.dab-note {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
`;

    function clamp(value, min, max) {
      const n = Number(value);
      if (!Number.isFinite(n)) return min;
      return Math.min(max, Math.max(min, Math.round(n)));
    }

    /**
     * Prefer the loader's owned stylesheet helper; fall back to a tagged
     * <style> when a bundle module is booted without that builtin.
     */
    function insertStyle(css) {
      try {
        if (typeof styles !== 'undefined' && styles && typeof styles.insert === 'function') {
          return styles.insert(css);
        }
      } catch {
        /* fall through to the tagged element */
      }
      const el = document.createElement('style');
      el.setAttribute('data-plugin', PKG);
      el.textContent = css;
      (document.head || document.documentElement).appendChild(el);
      return () => {
        if (el.parentNode) el.parentNode.removeChild(el);
      };
    }

    function readPrefs() {
      try {
        const raw = window.localStorage.getItem(PREFS_KEY);
        if (!raw) return { ...DEFAULT_PREFS };
        const parsed = JSON.parse(raw);
        const out = { ...DEFAULT_PREFS };
        if (parsed && typeof parsed === 'object') {
          if (PRESETS.some((p) => p.id === parsed.preset)) out.preset = parsed.preset;
          if (Number.isFinite(parsed.opacity)) out.opacity = clamp(parsed.opacity, 0, MAX_OPACITY);
          if (Number.isFinite(parsed.veil)) out.veil = clamp(parsed.veil, 0, MAX_VEIL);
          if (Number.isFinite(parsed.blur)) out.blur = clamp(parsed.blur, 0, MAX_BLUR);
        }
        return out;
      } catch {
        return { ...DEFAULT_PREFS };
      }
    }

    function formatBytes(bytes) {
      const n = Number(bytes);
      if (!Number.isFinite(n) || n <= 0) return '0 KB';
      if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
      return (n / 1024 / 1024).toFixed(1) + ' MB';
    }

    function openDb() {
      return new Promise((resolve, reject) => {
        let factory;
        try {
          factory = window.indexedDB;
        } catch {
          factory = undefined;
        }
        if (!factory) {
          reject(new Error('indexeddb-unavailable'));
          return;
        }
        const request = factory.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('indexeddb-open-failed'));
        request.onblocked = () => reject(new Error('indexeddb-blocked'));
      });
    }

    async function dbGet(key) {
      const db = await openDb();
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readonly');
          const request = tx.objectStore(DB_STORE).get(key);
          request.onsuccess = () => resolve(request.result === undefined ? null : request.result);
          request.onerror = () => reject(request.error || new Error('indexeddb-read-failed'));
        });
      } finally {
        try {
          db.close();
        } catch {
          /* ignore */
        }
      }
    }

    async function dbPut(key, value) {
      const db = await openDb();
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readwrite');
          tx.objectStore(DB_STORE).put(value, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error || new Error('indexeddb-write-failed'));
          tx.onabort = () => reject(tx.error || new Error('indexeddb-write-aborted'));
        });
      } finally {
        try {
          db.close();
        } catch {
          /* ignore */
        }
      }
    }

    async function dbDelete(key) {
      const db = await openDb();
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readwrite');
          tx.objectStore(DB_STORE).delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error || new Error('indexeddb-delete-failed'));
        });
      } finally {
        try {
          db.close();
        } catch {
          /* ignore */
        }
      }
    }

    function classTokensOf(el) {
      if (!el || !el.classList) return [];
      return Array.from(el.classList);
    }

    function uniqueSuffixClass(suffix) {
      let found = null;
      let nodes;
      try {
        nodes = document.querySelectorAll('[class*="_' + suffix + '"]');
      } catch {
        return null;
      }
      for (const node of nodes) {
        for (const token of classTokensOf(node)) {
          if (!token.endsWith('_' + suffix)) continue;
          if (found === null) found = token;
          else if (found !== token) return null;
        }
      }
      return found;
    }

    /**
     * The shell's CSS-module hashes change every build, but the semantic class
     * suffixes are stable. Resolve the live class names so the frosting follows
     * today's frame, columns, composer seat and panels instead of a pinned hash.
     * Dialog/menu roles are semantic already and need no discovery.
     */
    function discoverGlassSelectors() {
      const out = [];
      const found = {};
      ['centerCol', 'sidebarCol', 'bottomRow', 'rightbarCol', 'composerSeat', 'panelBody'].forEach(
        (suffix) => {
          const token = uniqueSuffixClass(suffix);
          if (!token) return;
          found[suffix] = token;
          out.push('.' + CSS.escape(token));
        }
      );

      // The frame is the parent of the centre column; its own class name does
      // not carry a unique suffix, so take a hashed token that names one node.
      if (found.centerCol) {
        let centre = null;
        try {
          centre = document.querySelector('.' + CSS.escape(found.centerCol));
        } catch {
          centre = null;
        }
        const frame = centre && centre.parentElement;
        if (frame && frame !== document.body && frame !== document.documentElement) {
          for (const token of classTokensOf(frame)) {
            if (token.indexOf('_') < 0) continue;
            let nodes = null;
            try {
              nodes = document.querySelectorAll('.' + CSS.escape(token));
            } catch {
              nodes = null;
            }
            if (!nodes || nodes.length !== 1) continue;
            out.push('.' + CSS.escape(token));
            break;
          }
        }
      }

      out.push('[role="dialog"]', '[role="alertdialog"]', '[role="menu"]', '[role="listbox"]');
      return out;
    }

    function createStore(ctx, t) {
      let prefs = readPrefs();
      let cssOff = null;
      let tokenOff = null;
      let tokenBusy = false;
      let disposed = false;
      let imageUrl = null;
      let imageMeta = null;
      let error = null;
      let lastCss = null;
      let observer = null;
      let settleTimer = 0;
      const listeners = new Set();

      function currentPreset() {
        return PRESETS.find((p) => p.id === prefs.preset) || PRESETS[0];
      }

      function scheme() {
        try {
          return ctx.theme.getTheme().active.colorScheme === 'light' ? 'light' : 'dark';
        } catch {
          return 'dark';
        }
      }

      function save() {
        try {
          window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        } catch {
          /* a full or unavailable store only loses persistence */
        }
      }

      function snapshot() {
        return {
          prefs: { ...prefs },
          scheme: scheme(),
          image: imageMeta ? { ...imageMeta, url: imageUrl } : null,
          error: error,
        };
      }

      function emit() {
        if (disposed) return;
        const state = snapshot();
        listeners.forEach((listener) => {
          try {
            listener(state);
          } catch {
            /* a broken listener must not break the plugin */
          }
        });
      }

      function gradientCss(preset, mode) {
        const c1 = preset[mode][0];
        const c2 = preset[mode][1];
        const base = mode === 'dark' ? '#0a0c10' : '#f4f6f8';
        return [
          'body::after {',
          '  content: "";',
          '  position: fixed;',
          '  inset: 0;',
          '  z-index: -1;',
          '  pointer-events: none;',
          '  background-color: ' + base + ';',
          '  background-image:',
          '    radial-gradient(1100px 760px at 12% 6%, ' + c1 + ' 0%, ' + c1 + '00 62%),',
          '    radial-gradient(920px 680px at 88% 96%, ' + c2 + ' 0%, ' + c2 + '00 60%),',
          '    linear-gradient(152deg, ' + c1 + ' 0%, ' + c2 + ' 100%);',
          '  background-size: cover, cover, cover;',
          '  background-position: center center, center center, center center;',
          '  background-repeat: no-repeat;',
          '}',
          'body, #root {',
          '  background-color: transparent !important;',
          '  background-image: none !important;',
          '}',
        ].join('\n');
      }

      function imageCss(mode) {
        const base = mode === 'dark' ? '#0a0c10' : '#f4f6f8';
        const veil = clamp(prefs.veil, 0, MAX_VEIL) / 100;
        const tint =
          mode === 'dark'
            ? 'rgba(8, 10, 14, ' + veil + ')'
            : 'rgba(250, 251, 253, ' + veil + ')';
        return [
          'body::after {',
          '  content: "";',
          '  position: fixed;',
          '  inset: 0;',
          '  z-index: -1;',
          '  pointer-events: none;',
          '  background-color: ' + base + ';',
          '  background-image: linear-gradient(' + tint + ', ' + tint + '), url("' + imageUrl + '");',
          '  background-size: cover, cover;',
          '  background-position: center center, center center;',
          '  background-repeat: no-repeat, no-repeat;',
          '}',
          'body, #root {',
          '  background-color: transparent !important;',
          '  background-image: none !important;',
          '}',
        ].join('\n');
      }

      function sceneCss() {
        const preset = currentPreset();
        if (!preset || preset.id === 'off') return null;
        const mode = scheme();
        let sheet;
        if (preset.id === 'image') {
          sheet = imageUrl
            ? imageCss(mode)
            : gradientCss(
                PRESETS.find((p) => p.id === 'aurora'),
                mode
              );
        } else {
          sheet = gradientCss(preset, mode);
        }
        const glass = glassCss(prefs.blur);
        // 背景层跟随面板透明度：0% 时壁纸/渐变层一起消失，
        // 否则会出现“组件透了、主题背景还实着”的割裂感。
        const follow = [
          '/* background layer follows the panel-opacity slider */',
          'html.dab-glass body::before,',
          'html.dab-glass body::after {',
          '  opacity: var(--dab-bg-opacity, 1) !important;',
          '  transition: opacity 0.18s ease;',
          '}',
        ].join('\n');
        const baseSheet = glass ? sheet + '\n' + glass : sheet;
        return baseSheet + '\n' + follow;
      }

      function applyCss() {
        if (disposed || prefs.preset === 'off') return;
        const css = sceneCss();
        if (!css) return;
        if (css === lastCss) return;
        lastCss = css;
        const root = document.documentElement;
        if (root) root.classList.add('dab-glass');
        if (cssOff) {
          try {
            cssOff();
          } catch {
            /* ignore */
          }
          cssOff = null;
        }
        cssOff = insertStyle(css);
      }

      function applyTokens() {
        if (disposed) return;
        const a = clamp(prefs.opacity, 0, MAX_OPACITY) / 100;
        const dr = document.documentElement;
        if (dr) dr.style.setProperty('--dab-bg-opacity', String(a));
        const layer = {
          '--dsw-alias-bg-base': {
            light: 'rgba(250, 251, 253, ' + a + ')',
            dark: 'rgba(15, 17, 22, ' + a + ')',
          },
          // Nested surfaces get a little more tint than the layer below them,
          // so stacked acrylic still resolves into readable cards.
          '--dsw-alias-bg-layer-1': {
            light: 'rgba(255, 255, 255, ' + Math.min(0.92, a + 0.18) + ')',
            dark: 'rgba(24, 27, 33, ' + Math.min(0.92, a + 0.18) + ')',
          },
          '--dsw-alias-bg-layer-2': {
            light: 'rgba(255, 255, 255, ' + Math.min(0.92, a + 0.1) + ')',
            dark: 'rgba(32, 36, 43, ' + Math.min(0.92, a + 0.1) + ')',
          },
          '--dsw-alias-bg-overlay': {
            light: 'rgba(252, 252, 254, ' + Math.min(0.94, 0.84 + a * 0.1) + ')',
            dark: 'rgba(18, 20, 25, ' + Math.min(0.94, 0.84 + a * 0.1) + ')',
          },
          '--dsw-specific-sidebar-fill': {
            light: 'rgba(246, 247, 250, ' + Math.max(0, a - 0.04) + ')',
            dark: 'rgba(11, 13, 17, ' + Math.max(0, a - 0.04) + ')',
          },
        };
        if (tokenOff) {
          try {
            tokenOff();
          } catch {
            /* ignore */
          }
          tokenOff = null;
        }
        tokenBusy = true;
        try {
          tokenOff = ctx.theme.overrideTokens(PKG, layer);
        } finally {
          tokenBusy = false;
        }
      }

      function glassCss(blur) {
        const px = clamp(blur, 0, MAX_BLUR);
        if (!px) return '';
        const selectors = discoverGlassSelectors();
        if (!selectors.length) return '';
        return selectors
          .map(
            (selector) =>
              'html.dab-glass ' +
              selector +
              ' {\n' +
              '  -webkit-backdrop-filter: blur(' +
              px +
              'px) saturate(140%);\n' +
              '  backdrop-filter: blur(' +
              px +
              'px) saturate(140%);\n' +
              '}'
          )
          .join('\n');
      }

      function clearScene() {
        lastCss = null;
        if (tokenOff) {
          try {
            tokenOff();
          } catch {
            /* ignore */
          }
          tokenOff = null;
        }
        if (cssOff) {
          try {
            cssOff();
          } catch {
            /* ignore */
          }
          cssOff = null;
        }
        const root = document.documentElement;
        if (root) root.classList.remove('dab-glass');
      }

      /**
       * The shell mounts lazily and swaps panels as the user navigates, so the
       * surfaces discovered at first paint are not the final set. Re-derive the
       * sheet after class changes; the CSS cache makes a no-op repaint cheap.
       */
      function watchShell() {
        if (observer || disposed) return;
        try {
          observer = new MutationObserver(() => {
            if (settleTimer) return;
            settleTimer = setTimeout(() => {
              settleTimer = 0;
              if (!disposed) applyCss();
            }, 400);
          });
          observer.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['class'],
          });
        } catch {
          observer = null;
        }
      }

      function paint() {
        if (disposed) return;
        if (prefs.preset === 'off') {
          clearScene();
          return;
        }
        applyTokens();
        applyCss();
        watchShell();
      }

      function onThemeChange() {
        if (disposed || tokenBusy) return;
        if (prefs.preset !== 'off') applyCss();
        emit();
      }

      function setPref(key, value) {
        if (key === 'preset') {
          if (!PRESETS.some((p) => p.id === value)) return;
          prefs = { ...prefs, preset: value };
          save();
          paint();
          emit();
          return;
        }
        if (key === 'opacity') {
          prefs = { ...prefs, opacity: clamp(value, 0, MAX_OPACITY) };
          save();
          if (prefs.preset !== 'off') {
            applyTokens();
            applyCss();
          }
          emit();
          return;
        }
        if (key === 'veil') {
          prefs = { ...prefs, veil: clamp(value, 0, MAX_VEIL) };
          save();
          if (prefs.preset !== 'off') applyCss();
          emit();
          return;
        }
        if (key === 'blur') {
          prefs = { ...prefs, blur: clamp(value, 0, MAX_BLUR) };
          save();
          if (prefs.preset !== 'off') applyCss();
          emit();
        }
      }

      function releaseUrl() {
        if (imageUrl) {
          try {
            URL.revokeObjectURL(imageUrl);
          } catch {
            /* ignore */
          }
          imageUrl = null;
        }
      }

      function adopt(record) {
        releaseUrl();
        imageUrl = URL.createObjectURL(record.blob);
        imageMeta = {
          name: record.name || 'background',
          size: record.size || record.blob.size || 0,
          type: record.type || record.blob.type || '',
        };
      }

      async function load() {
        try {
          const record = await dbGet(IMAGE_KEY);
          if (disposed || !record || !record.blob) return;
          adopt(record);
          if (prefs.preset === 'image') paint();
          emit();
        } catch (cause) {
          if (cause && String(cause.message) === 'indexeddb-unavailable') {
            error = t('unsupported');
            emit();
          }
          /* a failed restore simply means no picture */
        }
      }

      async function setImage(file) {
        if (!file) return;
        if (!/^image\//i.test(String(file.type || ''))) {
          error = t('notImage');
          emit();
          return;
        }
        if (Number(file.size) > MAX_FILE_BYTES) {
          error = t('tooBig');
          emit();
          return;
        }
        try {
          const blob = file instanceof Blob ? file : new Blob([file], { type: file.type });
          await dbPut(IMAGE_KEY, {
            blob: blob,
            name: file.name || 'background',
            size: blob.size,
            type: blob.type,
            savedAt: Date.now(),
          });
          if (disposed) return;
          adopt({ blob: blob, name: file.name, size: blob.size, type: blob.type });
          error = null;
          prefs = { ...prefs, preset: 'image' };
          save();
          paint();
          emit();
        } catch (cause) {
          error = t('storageFail') + (cause && cause.message ? cause.message : String(cause));
          emit();
        }
      }

      async function clearImage() {
        releaseUrl();
        imageMeta = null;
        error = null;
        if (prefs.preset === 'image') prefs = { ...prefs, preset: 'aurora' };
        save();
        paint();
        emit();
        try {
          await dbDelete(IMAGE_KEY);
        } catch {
          /* the visible state is already cleared */
        }
      }

      function subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }

      function dispose() {
        disposed = true;
        listeners.clear();
        clearTimeout(settleTimer);
        if (observer) {
          try {
            observer.disconnect();
          } catch {
            /* ignore */
          }
          observer = null;
        }
        clearScene();
        releaseUrl();
        imageMeta = null;
      }

      return {
        getSnapshot: snapshot,
        subscribe,
        setPref,
        paint,
        onThemeChange,
        load,
        setImage,
        clearImage,
        dispose,
      };
    }

    function apply(ctx) {
      ctx.effect(() => {
        const cleanups = [];
        const registered = new Set();
        const dictOffs = [];

        function ensureDictionaries() {
          let snap = null;
          try {
            snap = ctx.locale.getLocale();
          } catch {
            snap = null;
          }
          const ids =
            snap && Array.isArray(snap.locales) && snap.locales.length
              ? snap.locales.map((item) => item.id)
              : ['en'];
          for (const id of ids) {
            if (registered.has(id)) continue;
            const dict = /^zh/i.test(id) ? COPY.zh : COPY.en;
            try {
              dictOffs.push(ctx.locale.register(NS, id, dict));
              registered.add(id);
            } catch {
              /* an already-owned namespace keeps the host text */
            }
          }
        }

        ensureDictionaries();
        cleanups.push(() => {
          dictOffs.forEach((off) => {
            try {
              off();
            } catch {
              /* ignore */
            }
          });
        });

        const t = ctx.locale.bind(NS);
        const store = createStore(ctx, t);
        cleanups.push(() => store.dispose());

        cleanups.push(insertStyle(UI_CSS));

        function Settings() {
          const [state, setState] = React.useState(() => store.getSnapshot());
          const [dragging, setDragging] = React.useState(false);
          const [, bumpLocale] = React.useReducer((n) => n + 1, 0);
          const inputRef = React.useRef(null);

          React.useEffect(() => store.subscribe(setState), []);
          React.useEffect(() => ctx.locale.subscribe(() => bumpLocale()), []);

          const mode = state.scheme;
          const prefs = state.prefs;
          const image = state.image;

          function onFiles(fileList) {
            const file = fileList && fileList[0];
            if (file) void store.setImage(file);
          }

          function pickImage() {
            const input = inputRef.current;
            if (input) input.click();
          }

          return h(
            'div',
            { className: 'dab-root' },
            h(
              'div',
              null,
              h('p', { className: 'dab-head-title' }, t('title')),
              h('p', { className: 'dab-head-intro' }, t('intro'))
            ),
            h(
              'div',
              { className: 'dab-field' },
              h('div', { className: 'dab-field-head' }, h('span', null, t('presetLabel'))),
              h(
                'div',
                { className: 'dab-grid' },
                PRESETS.map((preset) => {
                  const isImage = preset.id === 'image';
                  const isOff = preset.id === 'off';
                  return h(
                    'button',
                    {
                      key: preset.id,
                      type: 'button',
                      className: 'dab-card',
                      'aria-pressed': prefs.preset === preset.id ? 'true' : 'false',
                      onClick: () => store.setPref('preset', preset.id),
                    },
                    h(
                      'span',
                      {
                        className:
                          'dab-swatch' +
                          (isOff ? ' dab-swatch-off' : '') +
                          (isImage ? ' dab-swatch-image' : ''),
                        'data-has-image': isImage ? (image ? 'true' : 'false') : undefined,
                        style: isImage
                          ? image
                            ? { backgroundImage: 'url("' + image.url + '")' }
                            : undefined
                          : isOff
                            ? undefined
                            : {
                                backgroundImage:
                                  'linear-gradient(135deg, ' +
                                  preset[mode][0] +
                                  ', ' +
                                  preset[mode][1] +
                                  ')',
                              },
                      },
                      isImage && !image ? h('span', null, '+') : null
                    ),
                    h('span', { className: 'dab-card-label' }, t('preset_' + preset.id))
                  );
                })
              )
            ),
            prefs.preset === 'image'
              ? h(
                  'div',
                  { className: 'dab-field' },
                  h(
                    'div',
                    { className: 'dab-field-head' },
                    h('span', null, t('imageLabel'))
                  ),
                  h(
                    'div',
                    { className: 'dab-image-row' },
                    h(
                      'div',
                      {
                        className: 'dab-thumb',
                        'data-dragging': dragging ? 'true' : 'false',
                        'data-has-image': image ? 'true' : 'false',
                        style: image
                          ? { backgroundImage: 'url("' + image.url + '")' }
                          : undefined,
                        onDragOver: (event) => {
                          event.preventDefault();
                          setDragging(true);
                        },
                        onDragLeave: () => setDragging(false),
                        onDrop: (event) => {
                          event.preventDefault();
                          setDragging(false);
                          onFiles(event.dataTransfer && event.dataTransfer.files);
                        },
                        onClick: pickImage,
                      },
                      image
                        ? h(
                            'span',
                            { className: 'dab-thumb-meta' },
                            image.name + ' · ' + formatBytes(image.size)
                          )
                        : h('span', null, t('imageEmpty'), h('br'), t('imageDrop'))
                    ),
                    h(
                      'div',
                      { className: 'dab-actions' },
                      h('input', {
                        ref: inputRef,
                        type: 'file',
                        accept: 'image/*',
                        style: { display: 'none' },
                        onChange: (event) => {
                          onFiles(event.target.files);
                          event.target.value = '';
                        },
                      }),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dab-btn',
                          'data-kind': 'primary',
                          onClick: pickImage,
                        },
                        image ? t('imageReplace') : t('imagePick')
                      ),
                      image
                        ? h(
                            'button',
                            {
                              type: 'button',
                              className: 'dab-btn',
                              onClick: () => {
                                void store.clearImage();
                              },
                            },
                            t('imageRemove')
                          )
                        : null
                    )
                  ),
                  h('div', { className: 'dab-field-hint' }, t('imageHint')),
                  image
                    ? h(
                        'div',
                        { className: 'dab-field' },
                        h(
                          'div',
                          { className: 'dab-field-head' },
                          h('span', null, t('veilLabel')),
                          h('span', { className: 'dab-field-value' }, prefs.veil + '%')
                        ),
                        h('input', {
                          className: 'dab-range',
                          type: 'range',
                          min: 0,
                          max: MAX_VEIL,
                          step: 1,
                          value: prefs.veil,
                          'aria-label': t('veilLabel'),
                          onChange: (event) =>
                            store.setPref('veil', Number(event.target.value)),
                        }),
                        h('div', { className: 'dab-field-hint' }, t('veilHint'))
                      )
                    : null
                )
              : null,
            h(
              'div',
              { className: 'dab-field' },
              h(
                'div',
                { className: 'dab-field-head' },
                h('span', null, t('opacityLabel')),
                h('span', { className: 'dab-field-value' }, prefs.opacity + '%')
              ),
              h('input', {
                className: 'dab-range',
                type: 'range',
                min: 0,
                max: MAX_OPACITY,
                step: 1,
                value: prefs.opacity,
                'aria-label': t('opacityLabel'),
                onChange: (event) => store.setPref('opacity', Number(event.target.value)),
              }),
              h('div', { className: 'dab-field-hint' }, t('opacityHint'))
            ),
            h(
              'div',
              { className: 'dab-field' },
              h(
                'div',
                { className: 'dab-field-head' },
                h('span', null, t('blurLabel')),
                h('span', { className: 'dab-field-value' }, prefs.blur + 'px')
              ),
              h('input', {
                className: 'dab-range',
                type: 'range',
                min: 0,
                max: MAX_BLUR,
                step: 1,
                value: prefs.blur,
                'aria-label': t('blurLabel'),
                onChange: (event) => store.setPref('blur', Number(event.target.value)),
              }),
              h('div', { className: 'dab-field-hint' }, t('blurHint'))
            ),
            state.error ? h('div', { className: 'dab-error' }, state.error) : null,
            h('div', { className: 'dab-note' }, t('note'))
          );
        }

        cleanups.push(
          ctx.slots.inject('settings.section', () =>
            ctx.slots.register(
              {
                name: 'settings.section',
                id: PKG,
                order: 46,
                label: () => t('nav'),
              },
              Settings
            )
          )
        );

        cleanups.push(ctx.on('theme/change', () => store.onThemeChange()));
        cleanups.push(ctx.locale.subscribe(() => ensureDictionaries()));

        store.paint();
        void store.load();

        return () => {
          for (let i = cleanups.length - 1; i >= 0; i -= 1) {
            try {
              cleanups[i]();
            } catch {
              /* one failed teardown must not keep the rest registered */
            }
          }
        };
      });
    }

    return { name: PKG, inject: ['slots', 'theme', 'locale'], apply };
  },
});
