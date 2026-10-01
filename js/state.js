/**
 * LCam & Check - Gerenciador de Estado Global
 * Armazena configurações da sobreposição, sensores (GPS, Bússola) e dados do relatório
 */

const STORAGE_KEYS = {
  OVERLAY_SETTINGS: 'lcam_overlay_settings_v1',
  REPORT_DATA: 'lcam_report_data_v1',
  REPORT_PHOTOS: 'lcam_report_photos_v1'
};

// Configurações padrão da Sobreposição
const DEFAULT_OVERLAY_SETTINGS = {
  fontFamily: 'font-mono-code', // 'font-mono-code', 'font-sans-clean', 'font-condensed', 'font-inter'
  fontSize: 'text-xs',          // 'text-[10px]', 'text-xs', 'text-sm', 'text-base'
  theme: 'dark',                // 'dark', 'light', 'yellow', 'transparent-outline'
  position: { x: 12, y: 12 },    // posição relativa em px da borda inferior/esquerda
  showDateTime: true,
  showCoords: true,
  showAltitude: true,
  showAddress: true,
  showCompass: true,
  showMiniMap: true,
  showProjectTag: true,
  projectTag: 'OBRA: Edifício Horizonte - Bloco A',
  customAddress: '',
  technicianTag: 'Eng. Civil / Vistoria Técnica'
};

// Dados padrão do Relatório Técnico (Módulo B)
const DEFAULT_REPORT_HEADER = {
  title: 'Relatório Técnico Fotográfico de Vistoria',
  clientWork: '',
  author: '',
  crea: '',
  date: new Date().toLocaleDateString('en-CA'),
  notes: ''
};

class AppState {
  constructor() {
    this.currentScreen = 'home'; // 'home' | 'camera' | 'report'
    this.overlaySettings = this.loadOverlaySettings();
    this.reportHeader = this.loadReportHeader();
    this.reportPhotos = this.loadReportPhotos();

    // Sensores em tempo real
    this.sensorData = {
      gps: {
        lat: null,
        lng: null,
        altitude: null,
        accuracy: null,
        status: 'searching', // 'searching' | 'ok' | 'weak' | 'denied' | 'manual'
        updatedAt: null
      },
      address: {
        formatted: null,
        road: '',
        city: '',
        state: '',
        suburb: '',
        stale: false,
        isLoading: false
      },
      compass: {
        heading: 142,
        cardinal: 'SE',
        hasMagnetometer: false
      },
      currentTimeStr: ''
    };

    this.listeners = new Set();
    this.initClock();
  }

  // Inicializa o relógio em tempo real
  initClock() {
    const updateTime = () => {
      if (this.currentScreen !== 'camera' && this.currentScreen !== 'home') return;
      const now = new Date();
      const datePart = now.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const timePart = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      this.sensorData.currentTimeStr = `${datePart} ${timePart}`;
      this.notify('clock');
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // Carregar e Salvar Configurações da Sobreposição
  loadOverlaySettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OVERLAY_SETTINGS);
      if (saved) return { ...DEFAULT_OVERLAY_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Erro ao carregar overlaySettings:', e);
    }
    return { ...DEFAULT_OVERLAY_SETTINGS };
  }

  saveOverlaySettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.OVERLAY_SETTINGS, JSON.stringify(this.overlaySettings));
    } catch (e) {
      console.warn('Erro ao salvar overlaySettings:', e);
    }
    this.notify('overlaySettings');
  }

  updateOverlaySetting(key, value) {
    this.overlaySettings[key] = value;
    this.saveOverlaySettings();
  }

  // Carregar e Salvar Dados do Relatório
  loadReportHeader() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REPORT_DATA);
      if (saved) return { ...DEFAULT_REPORT_HEADER, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Erro ao carregar reportHeader:', e);
    }
    return { ...DEFAULT_REPORT_HEADER };
  }

  saveReportHeader() {
    try {
      localStorage.setItem(STORAGE_KEYS.REPORT_DATA, JSON.stringify(this.reportHeader));
    } catch (e) {
      console.warn('Erro ao salvar reportHeader:', e);
    }
    this.notify('reportHeader');
  }

  loadReportPhotos() {
    window.db.getPhotos().then(photos => {
      // Sort by order if available, else by id descending
      photos.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || b.id.localeCompare(a.id));
      this.reportPhotos = photos || [];
      this.notify('reportPhotos');
    }).catch(e => {
      console.warn('Erro DB:', e);
      this.reportPhotos = [];
    });
    return [];
  }

  async saveReportPhotos() {
    // Para persistir a reordenação de múltiplas fotos
    try {
      for (let i = 0; i < this.reportPhotos.length; i++) {
        this.reportPhotos[i].order = i;
        await window.db.savePhoto(this.reportPhotos[i]);
      }
    } catch (e) {
      console.warn('Erro ao salvar reportPhotos no IndexedDB:', e);
    }
    this.notify('reportPhotos');
  }

  async addReportPhoto(photoObj) {
    photoObj.order = -1; // force top
    this.reportPhotos.unshift(photoObj);
    try {
      await window.db.savePhoto(photoObj);
      this.saveReportPhotos(); // reordena e salva todos
    } catch(e) { console.warn(e); }
  }

  async removeReportPhoto(id) {
    this.reportPhotos = this.reportPhotos.filter(p => p.id !== id);
    try {
      await window.db.removePhoto(id);
    } catch(e) { console.warn(e); }
    this.notify('reportPhotos');
  }

  async updateReportPhoto(id, updates) {
    const idx = this.reportPhotos.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.reportPhotos[idx] = { ...this.reportPhotos[idx], ...updates };
      try {
        await window.db.savePhoto(this.reportPhotos[idx]);
      } catch (e) {
        console.warn('Erro ao salvar reportPhoto no IndexedDB:', e);
      }
      this.notify('reportPhotoEdited');
    }
  }

  async clearReportPhotos() {
    this.reportPhotos = [];
    try {
      await window.db.clearPhotos();
    } catch(e) { console.warn(e); }
    this.notify('reportPhotos');
  }

  // Atualização dos Sensores
  updateGps(lat, lng, altitude, accuracy, status = 'ok') {
    this.sensorData.gps = {
      lat: lat !== null ? Number(lat.toFixed(6)) : null,
      lng: lng !== null ? Number(lng.toFixed(6)) : null,
      altitude: altitude !== null ? Math.round(altitude) : null,
      accuracy: accuracy !== null ? Math.round(accuracy) : null,
      status,
      updatedAt: new Date()
    };
    this.notify('gps');
  }

  setGpsStatus(status) {
    this.sensorData.gps.status = status;
    this.notify('gps');
  }

  updateAddress(formatted, details = {}, stale = false) {
    this.sensorData.address = {
      formatted: formatted || null,
      road: details.road || '',
      city: details.city || '',
      state: details.state || '',
      suburb: details.suburb || '',
      stale,
      isLoading: false
    };
    this.notify('address');
  }

  updateCompass(heading) {
    let cardinal = 'N';
    const h = (heading + 360) % 360;
    if (h >= 22.5 && h < 67.5) cardinal = 'NE';
    else if (h >= 67.5 && h < 112.5) cardinal = 'L';
    else if (h >= 112.5 && h < 157.5) cardinal = 'SE';
    else if (h >= 157.5 && h < 202.5) cardinal = 'S';
    else if (h >= 202.5 && h < 247.5) cardinal = 'SO';
    else if (h >= 247.5 && h < 292.5) cardinal = 'O';
    else if (h >= 292.5 && h < 337.5) cardinal = 'NO';

    this.sensorData.compass = {
      heading: Math.round(h),
      cardinal,
      hasMagnetometer: true
    };
    this.notify('compass');
  }

  // Sistema de Observabilidade / Reatividade
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(eventType) {
    this.listeners.forEach(cb => {
      try {
        cb(eventType, this);
      } catch (err) {
        console.error('Erro em listener do State:', err);
      }
    });
  }
}

// Instância Singleton
window.appState = new AppState();
