// help.js - עיצוב מבודד לחלוטין (#help-modal), Auto-Fit מדויק, השתקת התראות תחתונות
(function () {
  let currentLang = 'en';
  let activeTab = 'basics';

  function injectModalStyles() {
    if (document.getElementById('help-custom-css')) return;
    const style = document.createElement('style');
    style.id = 'help-custom-css';
    style.textContent = `
      #help-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(4px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        box-sizing: border-box;
      }

      #help-modal .modal-content {
        background: #ffffff;
        width: 920px;
        max-width: 92vw;
        max-height: 85vh;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
        box-sizing: border-box;
        padding: 24px;
        font-family: system-ui, -apple-system, sans-serif;
        color: #1e293b;
        position: relative;
      }

      #help-modal[dir="rtl"] { direction: rtl; text-align: right; }
      #help-modal[dir="ltr"] { direction: ltr; text-align: left; }

      #help-modal #help-tab-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 8px 4px;
        margin-top: 16px;
        width: 100%;
        box-sizing: border-box;
      }

      #help-modal .help-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
        box-sizing: border-box;
      }

      #help-modal .modules-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        width: 100%;
        box-sizing: border-box;
      }

      @media (max-width: 720px) {
        #help-modal .modules-grid {
          grid-template-columns: 1fr;
        }
      }

      #help-modal .help-card, 
      #help-modal .module-card {
        width: 100%;
        box-sizing: border-box;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 16px;
        margin: 0;
        overflow: hidden;
        position: relative;
      }

      #help-modal[dir="rtl"] .module-card {
        border-right: 4px solid #2563eb;
        border-left: 1px solid #cbd5e1;
      }

      #help-modal[dir="ltr"] .module-card {
        border-left: 4px solid #2563eb;
        border-right: 1px solid #cbd5e1;
      }

      #help-modal .mod-header {
        font-weight: 700;
        font-size: 1.02em;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        width: 100%;
        box-sizing: border-box;
      }

      #help-modal .mod-badge {
        background: #e2e8f0;
        color: #334155;
        font-size: 0.78em;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 500;
        white-space: nowrap;
      }

      #help-modal .io-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 10px 0;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        padding: 10px;
        border-radius: 6px;
        font-size: 0.85em;
        width: 100%;
        box-sizing: border-box;
      }

      #help-modal .tag {
        display: inline-block;
        padding: 2px 5px;
        border-radius: 4px;
        font-size: 0.8em;
        font-weight: 600;
      }
      #help-modal .tag-audio { background: #dcfce7; color: #166534; }
      #help-modal .tag-gate { background: #fef9c3; color: #854d0e; }
      #help-modal .tag-cv { background: #dbeafe; color: #1e40af; }
      #help-modal .tag-in { background: #fee2e2; color: #991b1b; }
      #help-modal .tag-out { background: #dcfce7; color: #166534; }

      #help-modal .preset-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 10px;
        width: 100%;
        box-sizing: border-box;
      }

      #help-modal button.preset-btn {
        width: 100%;
        box-sizing: border-box;
        margin-top: 6px;
      }
    `;
    document.head.appendChild(style);
  }

  function openModal() {
    const modal = document.getElementById('help-modal');
    if (modal) {
      modal.style.display = 'flex';
      renderHelpUI();
    }
  }

  function closeModal() {
    const modal = document.getElementById('help-modal');
    if (modal) modal.style.display = 'none';
  }

  function renderHelpUI() {
    injectModalStyles();
    const data = window.helpData ? window.helpData[currentLang] : null;
    if (!data) return;

    const modal = document.getElementById('help-modal');
    if (modal) {
      modal.setAttribute('dir', currentLang === 'he' ? 'rtl' : 'ltr');
    }

    const titleEl = document.getElementById('help-modal-title');
    const searchEl = document.getElementById('help-search-input');
    if (titleEl) titleEl.textContent = data.title;
    if (searchEl) searchEl.placeholder = data.searchPlaceholder;

    const tabsContainer = document.getElementById('help-nav-tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      Object.keys(data.tabs).forEach(tabKey => {
        const tabBtn = document.createElement('button');
        tabBtn.className = `tool-btn ${activeTab === tabKey ? 'active' : ''}`;
        tabBtn.style.fontWeight = activeTab === tabKey ? 'bold' : 'normal';
        tabBtn.textContent = data.tabs[tabKey];
        tabBtn.onclick = () => {
          activeTab = tabKey;
          renderHelpUI();
        };
        tabsContainer.appendChild(tabBtn);
      });
    }

    const contentArea = document.getElementById('help-tab-content');
    if (contentArea) {
      contentArea.innerHTML = data.sections[activeTab] || '';
      bindPresetButtons(contentArea);
    }
  }

  function bindPresetButtons(container) {
    const presetBtns = container.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
      btn.onclick = () => {
        const key = btn.getAttribute('data-preset');
        const preset = window.presetData ? window.presetData[key] : null;

        if (preset && window.synthApp) {
          // The app itself shows the "patch loaded, raise the volume" notice
          if (typeof window.synthApp.loadPatchData === 'function') {
            window.synthApp.loadPatchData(preset);
          }

          if (window.synthApp.audioCtx && window.synthApp.audioCtx.state === 'suspended') {
            window.synthApp.audioCtx.resume();
          }

          closeModal();
        }
      };
    });
  }

  function filterHelpContent(searchTerm) {
    const contentArea = document.getElementById('help-tab-content');
    const data = window.helpData ? window.helpData[currentLang] : null;
    if (!contentArea || !data) return;

    if (!searchTerm.trim()) {
      renderHelpUI();
      return;
    }

    const query = searchTerm.toLowerCase();
    let combinedHTML = '';

    Object.keys(data.sections).forEach(key => {
      const html = data.sections[key];
      if (html.toLowerCase().includes(query)) {
        combinedHTML += `<div style="margin-bottom:15px;">${html}</div><hr>`;
      }
    });

    contentArea.innerHTML = combinedHTML || `<p>${currentLang === 'he' ? 'לא נמצאו תוצאות.' : 'No results found.'}</p>`;
    bindPresetButtons(contentArea);
  }

  function bindHelpEvents() {
    const helpBtn = document.getElementById('help-btn');
    const closeBtn = document.getElementById('close-help-btn');
    const helpModal = document.getElementById('help-modal');
    const langBtn = document.getElementById('help-lang-toggle');
    const searchInput = document.getElementById('help-search-input');

    if (helpBtn) {
      helpBtn.onclick = (e) => {
        if (e) e.preventDefault();
        openModal();
      };
    }

    if (closeBtn) closeBtn.onclick = () => closeModal();

    if (helpModal) {
      helpModal.onclick = (e) => {
        if (e.target === helpModal) closeModal();
      };
    }

    if (langBtn) {
      langBtn.onclick = () => {
        currentLang = currentLang === 'he' ? 'en' : 'he';
        langBtn.textContent = currentLang === 'he' ? 'English' : 'Hebrew';
        renderHelpUI();
      };
    }

    if (searchInput) searchInput.oninput = (e) => filterHelpContent(e.target.value);
  }

  bindHelpEvents();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindHelpEvents);
  }
})();