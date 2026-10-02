/**
 * LCam & Check - Orquestrador Principal do Aplicativo (UI, Navegação e Modais)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Inicialização dos módulos
  window.reportModule.init();

  // Registrar Service Worker se suportado
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW registration note:', err);
    });
  }

  // Navegação inicial
  setupNavigation();
  setupSettingsModal();
  setupSensorSimulationModal();

  // Tratamento de instalação PWA
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      installBtn.classList.remove('hidden');
      installBtn.onclick = async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            installBtn.classList.add('hidden');
          }
          deferredPrompt = null;
        }
      };
    }
  });
});

// Navegação entre telas: 'home' | 'camera' | 'report'
function setupNavigation() {
  const screens = {
    home: document.getElementById('screen-home'),
    camera: document.getElementById('screen-camera'),
    report: document.getElementById('screen-report')
  };

  const navItems = {
    home: document.querySelectorAll('[data-nav-target="home"]'),
    camera: document.querySelectorAll('[data-nav-target="camera"]'),
    report: document.querySelectorAll('[data-nav-target="report"]')
  };

  window.navigateToScreen = (target) => {
    if (!screens[target]) return;

    // Se saindo da câmera, pausar
    if (window.appState.currentScreen === 'camera' && target !== 'camera') {
      window.cameraModule.pause();
    }

    // Se entrando na câmera, inicializar câmera
    if (target === 'camera') {
      window.cameraModule.init();
    }

    // Atualiza visibilidade das telas
    Object.keys(screens).forEach(key => {
      if (screens[key]) {
        if (key === target) {
          screens[key].classList.remove('hidden');
        } else {
          screens[key].classList.add('hidden');
        }
      }
    });

    // Atualiza estado ativo do Bottom Navigation
    const activeClasses = ['text-amber-400', 'font-semibold'];
    const inactiveClasses = ['text-slate-400'];

    ['home', 'camera', 'report'].forEach(tab => {
      navItems[tab].forEach(btn => {
        const icon = btn.querySelector('svg');
        const span = btn.querySelector('span');
        if (tab === target) {
          btn.classList.add('text-amber-400');
          btn.classList.remove('text-slate-400');
          if (span) span.classList.add('font-semibold');
        } else {
          btn.classList.remove('text-amber-400');
          btn.classList.add('text-slate-400');
          if (span) span.classList.remove('font-semibold');
        }
      });
    });

    window.appState.currentScreen = target;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Botões de navegação
  document.querySelectorAll('[data-nav-target]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = el.getAttribute('data-nav-target');
      window.navigateToScreen(target);
    });
  });
}

// Configurações da Sobreposição (Modal Engrenagem)
function setupSettingsModal() {
  const modal = document.getElementById('modal-overlay-settings');
  const openBtns = document.querySelectorAll('.btn-open-overlay-settings');
  const closeBtn = document.getElementById('btn-close-overlay-settings');

  if (!modal) return;

  const openModal = () => {
    modal.classList.remove('hidden');
    syncSettingsToForm();
  };

  const closeModal = () => {
    modal.classList.add('hidden');
  };

  openBtns.forEach(b => b.addEventListener('click', openModal));
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Sincronizar inputs do formulário com o State
  const syncSettingsToForm = () => {
    const s = window.appState.overlaySettings;

    // Fontes
    const fontRadio = document.querySelector(`input[name="overlay-font"][value="${s.fontFamily}"]`);
    if (fontRadio) fontRadio.checked = true;

    // Tamanho do texto
    const sizeRadio = document.querySelector(`input[name="overlay-size"][value="${s.fontSize}"]`);
    if (sizeRadio) sizeRadio.checked = true;

    // Tema de cores
    const themeRadio = document.querySelector(`input[name="overlay-theme"][value="${s.theme}"]`);
    if (themeRadio) themeRadio.checked = true;

    // Switches de Visibilidade
    const setToggle = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!val;
    };

    setToggle('toggle-show-datetime', s.showDateTime);
    setToggle('toggle-show-coords', s.showCoords);
    setToggle('toggle-show-altitude', s.showAltitude);
    setToggle('toggle-show-address', s.showAddress);
    setToggle('toggle-show-compass', s.showCompass);
    setToggle('toggle-show-minimap', s.showMiniMap);
    setToggle('toggle-show-projecttag', s.showProjectTag);
    setToggle('toggle-allow-manual-address', s.allowManualAddress);

    // Campos de texto
    const tagInput = document.getElementById('input-setting-projecttag');
    if (tagInput) tagInput.value = s.projectTag || '';

    const addrInput = document.getElementById('input-setting-customaddr');
    if (addrInput) {
      addrInput.value = s.customAddress || '';
      addrInput.parentElement.style.display = s.allowManualAddress ? 'block' : 'none';
    }
  };

  // Event Listeners nos inputs
  document.querySelectorAll('input[name="overlay-font"]').forEach(r => {
    r.addEventListener('change', (e) => {
      window.appState.updateOverlaySetting('fontFamily', e.target.value);
    });
  });

  document.querySelectorAll('input[name="overlay-size"]').forEach(r => {
    r.addEventListener('change', (e) => {
      window.appState.updateOverlaySetting('fontSize', e.target.value);
    });
  });

  document.querySelectorAll('input[name="overlay-theme"]').forEach(r => {
    r.addEventListener('change', (e) => {
      window.appState.updateOverlaySetting('theme', e.target.value);
    });
  });

  // Toggles
  const bindToggle = (id, key) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        window.appState.updateOverlaySetting(key, e.target.checked);
      });
    }
  };

  bindToggle('toggle-show-datetime', 'showDateTime');
  bindToggle('toggle-show-coords', 'showCoords');
  bindToggle('toggle-show-altitude', 'showAltitude');
  bindToggle('toggle-show-address', 'showAddress');
  bindToggle('toggle-show-compass', 'showCompass');
  bindToggle('toggle-show-minimap', 'showMiniMap');
  bindToggle('toggle-show-projecttag', 'showProjectTag');

  const addrToggle = document.getElementById('toggle-allow-manual-address');
  if (addrToggle) {
    addrToggle.addEventListener('change', (e) => {
      window.appState.updateOverlaySetting('allowManualAddress', e.target.checked);
      const addrInput = document.getElementById('input-setting-customaddr');
      if (addrInput) addrInput.parentElement.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  // Inputs de Texto
  const tagInput = document.getElementById('input-setting-projecttag');
  if (tagInput) {
    tagInput.addEventListener('input', (e) => {
      window.appState.updateOverlaySetting('projectTag', e.target.value);
    });
  }

  const addrInput = document.getElementById('input-setting-customaddr');
  if (addrInput) {
    addrInput.addEventListener('input', (e) => {
      window.appState.updateOverlaySetting('customAddress', e.target.value);
    });
  }
}

// Modal de Simulação de Sensores (ideal para testes no Desktop ou sem GPS físico)
function setupSensorSimulationModal() {
  const modal = document.getElementById('modal-sensor-simulation');
  const openBtn = document.getElementById('btn-open-simulation');
  const closeBtn = document.getElementById('btn-close-simulation');
  const applyBtn = document.getElementById('btn-apply-simulation');

  if (!modal) return;

  if (openBtn) {
    openBtn.onclick = () => {
      const g = window.appState.sensorData.gps;
      const c = window.appState.sensorData.compass;
      document.getElementById('sim-lat').value = g.lat;
      document.getElementById('sim-lng').value = g.lng;
      document.getElementById('sim-alt').value = g.altitude;
      document.getElementById('sim-heading').value = c.heading;
      modal.classList.remove('hidden');
    };
  }

  if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

  if (applyBtn) {
    applyBtn.onclick = () => {
      const lat = parseFloat(document.getElementById('sim-lat').value) || window.appState.sensorData.gps.lat || 0;
      const lng = parseFloat(document.getElementById('sim-lng').value) || window.appState.sensorData.gps.lng || 0;
      const alt = parseFloat(document.getElementById('sim-alt').value) || window.appState.sensorData.gps.altitude || 0;
      const heading = parseFloat(document.getElementById('sim-heading').value) || 0;

      window.appState.updateGps(lat, lng, alt, 8, false);
      window.appState.updateCompass(heading);
      window.cameraModule.fetchReverseGeocoding(lat, lng);

      modal.classList.add('hidden');
      window.showToast('Sensores atualizados manualmente', 'success');
    };
  }
}

// Sistema de Notificações Toast
window.showToast = (message, type = 'info') => {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-emerald-600 border-emerald-500'
    : type === 'error' ? 'bg-rose-600 border-rose-500'
    : 'bg-slate-800 border-amber-500/60';

  toast.className = `toast-notice pointer-events-auto flex items-center space-x-2.5 px-4 py-2.5 rounded-xl shadow-2xl border text-white text-xs font-medium ${bgClass}`;

  const icon = type === 'success'
    ? `<svg class="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
    : type === 'error'
    ? `<svg class="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`
    : `<svg class="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

  toast.innerHTML = `${icon}<span>${message}</span>`;
  toastContainer.appendChild(toast);

  // Trigger animação
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
};
