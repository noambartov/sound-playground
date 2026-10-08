// PatchManager.js - Patch Save & Load Engine for Sound Sandbox
class PatchManager {
  constructor(synthApp) {
    this.app = synthApp;
  }

  // 1. יצירת אובייקט הפאצ' מתוך המצב הנוכחי בסינתיסייזר
  exportPatchObject(patchName = "Untitled Patch") {
    const modulesObj = this.app.modules || {};
    const modulesData = Object.values(modulesObj).map(m => {
      const card = m.card || document.getElementById(`module_card_${m.id}`);
      return {
        id: m.id,
        type: m.type,
        x: card ? parseFloat(card.style.left || 0) : (m.x || 100),
        y: card ? parseFloat(card.style.top || 0) : (m.y || 100),
        state: m.instance && typeof m.instance.getState === 'function' 
          ? m.instance.getState() 
          : (m.params || {})
      };
    });

    return {
      version: "1.0",
      name: patchName,
      timestamp: new Date().toISOString(),
      theme: this.app.theme || 'light',
      modules: modulesData,
      connections: (this.app.connections || []).map(conn => ({
        fromNode: conn.fromNode || conn.fromModuleId,
        fromPortInfo: conn.fromPortInfo || { id: conn.fromPortId || conn.fromPort },
        toNode: conn.toNode || conn.toModuleId,
        toPortInfo: conn.toPortInfo || { id: conn.toPortId || conn.toPort, channel: conn.channel }
      }))
    };
  }

  // 2. טעינת פאצ' בחזרה לסינתיסייזר
  loadPatchObject(patchData) {
    if (!patchData || (!Array.isArray(patchData.modules) && !patchData.modules)) {
      console.error("[PatchManager] Invalid patch data structure");
      return;
    }

    // אם קיים מנוע טעינה מובנה ב-app.js, נעשה בו שימוש ישיר להתאמה מלאה
    if (typeof this.app.loadPatchData === 'function') {
      this.app.loadPatchData(patchData);
      return;
    }

    // מנגנון נפילה (Fallback) למקרה שאין loadPatchData ב-app.js
    if (typeof this.app.clearWorkspace === 'function') {
      this.app.clearWorkspace();
    } else if (typeof this.app.clearAllNodesAndConnections === 'function') {
      this.app.clearAllNodesAndConnections();
    }

    if (patchData.theme && patchData.theme !== this.app.theme && typeof this.app.toggleTheme === 'function') {
      this.app.toggleTheme();
    }

    const modulesList = Array.isArray(patchData.modules) 
      ? patchData.modules 
      : Object.values(patchData.modules || {});

    modulesList.forEach(m => {
      try {
        const modState = m.state || m.params || {};
        const posX = m.x !== undefined ? m.x : (m.position ? m.position.x : 100);
        const posY = m.y !== undefined ? m.y : (m.position ? m.position.y : 100);

        this.app.createModule(m.type, m.id, posX, posY, modState);
      } catch (e) {
        console.warn(`[PatchManager] Could not restore module ${m.id} (${m.type}):`, e);
      }
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (Array.isArray(patchData.connections)) {
          patchData.connections.forEach(conn => {
            try {
              const normalizedConn = {
                fromNode: conn.fromNode || conn.fromNodeId || conn.fromModuleId,
                fromPortInfo: conn.fromPortInfo || { 
                  id: conn.fromPort || conn.fromPortId, 
                  type: conn.fromPort || conn.fromPortId,
                  name: conn.fromPort || conn.fromPortId
                },
                toNode: conn.toNode || conn.toNodeId || conn.toModuleId,
                toPortInfo: conn.toPortInfo || { 
                  id: conn.toPort || conn.toPortId, 
                  type: conn.toPort || conn.toPortId,
                  name: conn.toPort || conn.toPortId,
                  channel: conn.channel 
                }
              };

              if (typeof this.app.connectAudio === 'function') {
                this.app.connections.push(normalizedConn);
                this.app.connectAudio(normalizedConn);
              } else if (typeof this.app.connectPorts === 'function') {
                this.app.connectPorts(normalizedConn.fromNode, conn.fromPort, normalizedConn.toNode, conn.toPort);
              }
            } catch (e) {
              console.warn("[PatchManager] Could not restore connection:", conn, e);
            }
          });
        }

        if (typeof this.app.updatePortConnectedClasses === 'function') {
          this.app.updatePortConnectedClasses();
        }
        if (typeof this.app.drawConnections === 'function') {
          this.app.drawConnections();
        }
      });
    });
  }

  // 3. שמירת פאצ' ב-LocalStorage
  saveToLocalStorage(name = "Untitled Patch") {
    const patch = this.exportPatchObject(name);
    const presets = JSON.parse(localStorage.getItem('synth_presets') || '{}');
    presets[name] = patch;
    localStorage.setItem('synth_presets', JSON.stringify(presets));
  }

  // 4. טעינת פאצ' מ-LocalStorage
  loadFromLocalStorage(name) {
    const presets = JSON.parse(localStorage.getItem('synth_presets') || '{}');
    if (presets[name]) {
      this.loadPatchObject(presets[name]);
    }
  }

  // 5. קבלת רשימת הפריסטים השמורים
  getSavedPresets() {
    return JSON.parse(localStorage.getItem('synth_presets') || '{}');
  }

  // 6. מחיקת פריסט מ-LocalStorage
  deleteFromLocalStorage(name) {
    const presets = JSON.parse(localStorage.getItem('synth_presets') || '{}');
    if (presets[name]) {
      delete presets[name];
      localStorage.setItem('synth_presets', JSON.stringify(presets));
    }
  }

  // 7. הורדת הפאצ' כקובץ JSON למחשב
  downloadJSON(patchName = "patch") {
    const patchObj = this.exportPatchObject(patchName);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(patchObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${patchName.toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // 8. טעינת קובץ JSON מהמחשב
  uploadJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const patchData = JSON.parse(e.target.result);
        this.loadPatchObject(patchData);
      } catch (err) {
        alert("Could not load the patch file: invalid JSON.");
      }
    };
    reader.readAsText(file);
  }
}

window.PatchManager = PatchManager;