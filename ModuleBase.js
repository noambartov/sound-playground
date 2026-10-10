// ModuleBase.js - shared template for new modules.
// A new module is a class that extends ModuleBase and describes itself in a static `def`
// (title, sidebar entry, sliders / menus / switches, input and output jacks). The template draws
// the card, binds the controls, saves and loads the state, answers app.js's port lookups,
// adds the sidebar button and the jack hints (portGuide), and cleans up on delete.
// Sliders get a stable id that includes the module id, so an LFO cable can modulate them
// (modulation.js) with no extra work. Existing hand-built modules are not affected.

class ModuleBase {
  static registry = {};

  // Registers a module class: makes it creatable by app.js, adds its sidebar button and jack hints.
  static register(cls) {
    const def = cls.def;
    ModuleBase.registry[def.type] = cls;
    (def.aliases || []).forEach(a => { ModuleBase.registry[a] = cls; });
    ModuleBase.addSidebarButton(def);
    ModuleBase.addPortGuide(def);
  }

  static get(type) {
    return ModuleBase.registry[type] || null;
  }

  static addSidebarButton(def) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || !def.menu || sidebar.querySelector(`.add-module-btn[data-type="${def.type}"]`)) return;
    let group = Array.from(sidebar.querySelectorAll('.sidebar-group'))
      .find(g => (g.querySelector('.sidebar-group-title') || {}).textContent === def.menu.group);
    if (!group) {
      group = document.createElement('div');
      group.className = 'sidebar-group';
      group.innerHTML = `<span class="sidebar-group-title">${def.menu.group}</span>`;
      sidebar.appendChild(group);
    }
    const btn = document.createElement('button');
    btn.className = 'add-module-btn';
    btn.dataset.type = def.type;
    btn.setAttribute('aria-label', `Add ${def.title} Module`);
    btn.textContent = def.menu.label || def.title;
    group.appendChild(btn);
  }

  // Each jack may carry { guide: { text, to|from, match }, chip } for the hint card and the jack label
  static addPortGuide(def) {
    const pg = window.portGuide;
    if (!pg) return;
    const add = (dir, p) => {
      const key = `${def.type}:${dir}:${p.id}`;
      if (p.guide) {
        pg.GUIDE[key] = Object.assign({ name: p.label, title: p.title, signal: ModuleBase.signalName(p.signal) }, p.guide);
      }
      if (p.chip) pg.CHIPS[key] = p.chip;
    };
    (def.inputs || []).forEach(p => add('in', p));
    (def.outputs || []).forEach(p => add('out', p));
  }

  static signalName(signal) {
    return { audio: 'Audio', cv: 'CV', gate: 'Gate' }[signal] || 'CV';
  }

  constructor(id, audioCtx) {
    this.id = id;
    this.audioCtx = audioCtx;
    this.card = null;
    this.def = this.constructor.def;
    this.params = {};
    (this.def.params || []).forEach(p => { this.params[p.id] = p.value; });
    this.inputNodes = {};   // jack id -> AudioNode or AudioParam
    this.outputNodes = {};  // jack id -> AudioNode
    this.ownedNodes = [];
    this.build();
    (this.def.params || []).forEach(p => this.onParamChange(p.id, this.params[p.id]));
  }

  // ---- Hooks for subclasses ----
  build() {}                         // create the audio nodes, fill inputNodes / outputNodes
  onParamChange(id, value) {}        // a control changed (from the UI, setState or a modulation)
  renderBody() { return ''; }        // custom HTML above the controls (e.g. a display or a play surface)
  onMount(card) {}                   // the card is in the page; bind custom elements here
  getExtraState() { return {}; }     // anything beyond the params to save
  setExtraState(state) {}
  destroy() {}                       // stop timers / listeners

  // ---- Helpers ----
  // A started ConstantSourceNode, used for CV / gate outputs
  makeConstant(value = 0) {
    const node = this.audioCtx.createConstantSource();
    node.offset.setValueAtTime(value, this.audioCtx.currentTime);
    node.start();
    return this.own(node);
  }

  own(node) {
    this.ownedNodes.push(node);
    return node;
  }

  el(name) {
    return this.card ? this.card.querySelector(`[id="${this.elId(name)}"]`) : null;
  }

  elId(name) {
    return `${this.def.type}_${name}_${this.id}`;
  }

  paramDef(id) {
    return (this.def.params || []).find(p => p.id === id);
  }

  formatParam(p, value) {
    if (p.format) return p.format(value);
    if (p.kind === 'toggle') return value ? 'On' : 'Off';
    return `${value}${p.unit ? ' ' + p.unit : ''}`;
  }

  // Sets a control's value, updates its readout and (unless it came from that control) its widget
  setParam(id, value, fromControl = false) {
    const p = this.paramDef(id);
    if (!p) return;
    if (p.kind === 'toggle') value = !!value;
    else if (p.kind !== 'select') value = Math.min(p.max, Math.max(p.min, parseFloat(value)));
    if (p.kind !== 'toggle' && p.kind !== 'select' && isNaN(value)) return;
    this.params[id] = value;
    this.onParamChange(id, value);

    const ctl = this.el(`p_${id}`);
    const readout = this.el(`v_${id}`);
    if (readout) readout.textContent = this.formatParam(p, value);
    if (ctl && !fromControl) {
      if (p.kind === 'toggle') ctl.classList.toggle('active', value);
      else ctl.value = String(value);
    }
    if (ctl && p.kind === 'toggle') {
      ctl.classList.toggle('active', value);
      ctl.textContent = `${p.label}: ${this.formatParam(p, value)}`;
    }
  }

  // ---- Protocol used by app.js ----
  getNodeOrParamForPort(key) {
    return this.outputNodes[key] || this.inputNodes[key] || null;
  }

  getState() {
    return Object.assign({}, this.params, this.getExtraState());
  }

  setState(state) {
    if (!state) return;
    (this.def.params || []).forEach(p => {
      if (state[p.id] !== undefined) this.setParam(p.id, state[p.id]);
    });
    this.setExtraState(state);
  }

  renderControl(p) {
    const v = this.params[p.id];
    if (p.kind === 'toggle') {
      return `<button id="${this.elId(`p_${p.id}`)}" class="action-btn module-toggle${v ? ' active' : ''}">${p.label}: ${this.formatParam(p, v)}</button>`;
    }
    if (p.kind === 'select') {
      const opts = p.options.map(([val, label]) => `<option value="${val}"${val === v ? ' selected' : ''}>${label}</option>`).join('');
      return `<div class="control-group">
          <label class="module-label">${p.label}</label>
          <select id="${this.elId(`p_${p.id}`)}" class="control-select">${opts}</select>
        </div>`;
    }
    return `<div class="control-group">
        <label class="module-label">${p.label}: <span id="${this.elId(`v_${p.id}`)}">${this.formatParam(p, v)}</span></label>
        <input type="range" id="${this.elId(`p_${p.id}`)}" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="${v}">
      </div>`;
  }

  // Sliders and menus one per line; switches next to each other in one row
  renderControls() {
    const out = [];
    let toggles = [];
    const flush = () => {
      if (toggles.length) out.push(`<div class="module-toggle-row">${toggles.join('')}</div>`);
      toggles = [];
    };
    (this.def.params || []).forEach(p => {
      if (p.kind === 'toggle') toggles.push(this.renderControl(p));
      else { flush(); out.push(this.renderControl(p)); }
    });
    flush();
    return out.join('');
  }

  renderPort(p, dir) {
    const port = `<div class="port port-${dir}" data-node-id="${this.id}" data-port-id="${p.id}" data-port-type="${p.signal || 'cv'}" title="${p.title || p.label}"></div>`;
    const label = `<span>${p.label}</span>`;
    return `<div class="port-group">${dir === 'in' ? port + label : label + port}</div>`;
  }

  renderHTML() {
    const d = this.def;
    // Jacks marked `inline: true` are drawn by the module itself (renderPort) inside renderBody()
    const ports = (d.inputs || []).filter(p => !p.inline).map(p => this.renderPort(p, 'in'))
      .concat((d.outputs || []).filter(p => !p.inline).map(p => this.renderPort(p, 'out'))).join('');
    return `
      <div class="node-header">
        <span>${d.title}</span>
        <button class="delete-module-btn" title="Delete Module">×</button>
      </div>
      <div class="node-body module-base-body">
        ${this.renderBody()}
        ${this.renderControls()}
        <div class="ports-row module-base-ports">${ports}</div>
      </div>
    `;
  }

  bindEvents(card) {
    this.card = card;
    card.style.width = `${this.def.width || 220}px`;
    (this.def.params || []).forEach(p => {
      const ctl = this.el(`p_${p.id}`);
      if (!ctl) return;
      if (p.kind === 'toggle') ctl.addEventListener('click', () => this.setParam(p.id, !this.params[p.id]));
      else if (p.kind === 'select') ctl.addEventListener('change', e => this.setParam(p.id, e.target.value, true));
      else ctl.addEventListener('input', e => this.setParam(p.id, e.target.value, true));
    });
    this.onMount(card);
  }

  cleanup() {
    try { this.destroy(); } catch (e) {}
    this.ownedNodes.forEach(n => {
      try { if (typeof n.stop === 'function') n.stop(); } catch (e) {}
      try { n.disconnect(); } catch (e) {}
    });
  }
}

window.ModuleBase = ModuleBase;
