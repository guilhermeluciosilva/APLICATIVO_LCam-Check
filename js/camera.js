/**
 * LCam & Check - Módulo A: Câmera Inteligente (Geotagging e Captura)
 * Acesso à câmera traseira, sensores de GPS, bússola, geocodificação reversa e captura com overlay.
 */

class CameraModule {
  constructor() {
    this.videoElement = null;
    this.stream = null;
    this.activeFacingMode = 'environment'; // 'environment' (traseira) ou 'user' (frontal)
    this.watchPositionId = null;
    this.compassListener = null;
    this.lastGeocodeCoords = { lat: null, lng: null, time: 0 };
    this.isTorchOn = false;
    this.track = null;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.elementStart = { x: 0, y: 0 };
    this.audioCtx = null;
    this.isCapturing = false;
  }

  // Inicializa o módulo uma única vez
  init() {
    if (this._inited) {
      return this.resume();
    }
    this._inited = true;

    this.videoElement = document.getElementById('camera-video');
    this.overlayElement = document.getElementById('camera-overlay');
    this.cameraContainer = document.getElementById('camera-container');

    this.setupDraggableOverlay();
    this.setupEditableFields();
    this.setupEventListeners();

    // Inscrever-se nas mudanças do estado
    window.appState.subscribe((eventType) => {
      if (['overlaySettings', 'gps', 'address', 'compass', 'clock'].includes(eventType)) {
        this.renderOverlayUI();
      }
    });

    this.resume();
  }

  resume() {
    this.startCamera();
    this.initSensors();
    this.renderOverlayUI();
  }

  pause() {
    this.stopCamera();
    if (this.watchPositionId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }
  }

  // Iniciar Câmera Traseira com fallbacks
  async startCamera() {
    this.stopCamera();

    const errorBanner = document.getElementById('camera-permission-error');
    if (errorBanner) errorBanner.classList.add('hidden');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador não suporta acesso à câmera.');
      }

      const attempts = [
        { facingMode: { ideal: this.activeFacingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        { facingMode: { ideal: this.activeFacingMode } },
        true
      ];

      let lastErr;
      for (const video of attempts) {
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
          break; // Sucesso
        } catch (e) {
          lastErr = e;
          if (['NotAllowedError', 'NotReadableError'].includes(e.name)) break;
        }
      }

      if (!this.stream) throw lastErr;

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      this.track = this.stream.getVideoTracks()[0];
      
      // Auto-restart stream caso ele morra no Android
      this.track.addEventListener('ended', () => this.startCamera());

      try {
        if (navigator.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        // ignora
      }

      // Verificar suporte a lanterna
      const capabilities = this.track.getCapabilities ? this.track.getCapabilities() : {};
      const torchBtn = document.getElementById('btn-torch-toggle');
      if (torchBtn) {
        torchBtn.style.display = capabilities.torch ? 'flex' : 'none';
      }

      window.showToast('Câmera conectada com sucesso', 'success');
    } catch (err) {
      console.warn('Falha ao acessar câmera física:', err);
      if (errorBanner) {
        errorBanner.classList.remove('hidden');
        const errorText = document.getElementById('camera-error-message');
        if (errorText) {
          const name = err?.name;
          if (name === 'NotAllowedError') {
            errorText.textContent = 'Permissão negada. Toque no cadeado da barra de endereço > Câmera > Permitir.';
          } else if (name === 'NotFoundError') {
            errorText.textContent = 'Nenhuma câmera encontrada.';
          } else if (name === 'NotReadableError') {
            errorText.textContent = 'Câmera em uso por outro app. Feche-o e tente de novo.';
          } else if (name === 'SecurityError') {
            errorText.textContent = 'A câmera exige HTTPS.';
          } else {
            errorText.textContent = 'Dispositivo de câmera não encontrado ou ocupado. Modo simulação ativo.';
          }
        }
      }
    }
  }

  // Parar câmera
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.track = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  // Alternar câmera (Traseira / Frontal)
  toggleCamera() {
    this.activeFacingMode = this.activeFacingMode === 'environment' ? 'user' : 'environment';
    this.startCamera();
  }

  // Alternar Lanterna (Torch)
  async toggleTorch() {
    if (!this.track) return;
    try {
      const capabilities = this.track.getCapabilities ? this.track.getCapabilities() : {};
      if (capabilities.torch) {
        this.isTorchOn = !this.isTorchOn;
        await this.track.applyConstraints({
          advanced: [{ torch: this.isTorchOn }]
        });
        const torchIcon = document.getElementById('torch-icon');
        if (torchIcon) {
          torchIcon.classList.toggle('text-amber-400', this.isTorchOn);
        }
        window.showToast(this.isTorchOn ? 'Lanterna ligada' : 'Lanterna desligada', 'info');
      }
    } catch (e) {
      console.warn('Erro ao alternar torch:', e);
    }
  }

  // Inicializa GPS, Bússola e Geocodificação
  initSensors() {
    // 1. Geolocalização
    if (navigator.geolocation && this.watchPositionId === null) {
      window.appState.setGpsStatus('searching');
      const options = {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000
      };

      this.watchPositionId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, altitude, accuracy } = pos.coords;
          window.appState.updateGps(latitude, longitude, altitude, accuracy, accuracy <= 30 ? 'ok' : 'weak');
          this.fetchReverseGeocoding(latitude, longitude);
        },
        (err) => {
          console.warn('Erro GPS:', err.message);
          window.appState.setGpsStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'searching');
        },
        options
      );
    }

    // 2. Bússola / Orientação do Dispositivo
    this.initOrientationSensor();
  }

  // Inicializa Bússola com suporte a iOS e Android
  initOrientationSensor() {
    const handleOrientation = (e) => {
      let heading = null;
      if (e.webkitCompassHeading !== undefined) {
        // iOS
        heading = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Android / Sensores padrão
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null && !isNaN(heading)) {
        window.appState.updateCompass(heading);
      }
    };

    if (window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ requer permissão explícita
        const compassBtn = document.getElementById('btn-compass-permission');
        if (compassBtn) {
          compassBtn.classList.remove('hidden');
          compassBtn.onclick = async () => {
            try {
              const response = await DeviceOrientationEvent.requestPermission();
              if (response === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation, true);
                compassBtn.classList.add('hidden');
                window.showToast('Bússola calibrada', 'success');
              }
            } catch (err) {
              console.warn('Permissão de orientação negada:', err);
            }
          };
        }
      } else {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }
  }

  // Geocodificação Reversa via OpenStreetMap Nominatim
  async fetchReverseGeocoding(lat, lng) {
    const now = Date.now();
    // Cache de 15 segundos e limite de distância para evitar sobrecarregar o Nominatim
    if (this.lastGeocodeCoords.lat) {
      const dist = Math.hypot(lat - this.lastGeocodeCoords.lat, lng - this.lastGeocodeCoords.lng);
      if (dist < 0.0003 && (now - this.lastGeocodeCoords.time) < 20000) {
        return;
      }
    }

    this.lastGeocodeCoords = { lat, lng, time: now };

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
      });
      if (!res.ok) throw new Error('Falha na resposta do Nominatim');
      const data = await res.json();

      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.street || addr.pedestrian || addr.suburb || 'Local de Vistoria';
        const houseNumber = addr.house_number ? `, ${addr.house_number}` : '';
        const suburb = addr.suburb || addr.neighbourhood || '';
        const city = addr.city || addr.town || addr.municipality || 'São Paulo';
        const state = addr.state_code || addr.state || 'SP';

        const formatted = `${road}${houseNumber} - ${suburb ? suburb + ', ' : ''}${city} - ${state}`;
        window.appState.updateAddress(formatted, { road, city, state, suburb }, false);
      }
    } catch (e) {
      console.warn('Geocodificação reversa falhou:', e);
      window.appState.updateAddress(null, {}, true);
    }
  }

  // Configura a sobreposição arrastável (Touch e Mouse Drag)
  setupDraggableOverlay() {
    if (!this.overlayElement || !this.cameraContainer) return;

    const startDrag = (clientX, clientY) => {
      this.isDragging = true;
      this.overlayElement.classList.add('overlay-dragging');
      this.dragStart = { x: clientX, y: clientY };

      const rect = this.overlayElement.getBoundingClientRect();
      const parentRect = this.cameraContainer.getBoundingClientRect();
      this.elementStart = {
        left: rect.left - parentRect.left,
        top: rect.top - parentRect.top
      };
    };

    const doDrag = (clientX, clientY) => {
      if (!this.isDragging) return;
      const dx = clientX - this.dragStart.x;
      const dy = clientY - this.dragStart.y;

      const parentRect = this.cameraContainer.getBoundingClientRect();
      const elemRect = this.overlayElement.getBoundingClientRect();

      let newLeft = this.elementStart.left + dx;
      let newTop = this.elementStart.top + dy;

      // Limites dentro da tela da câmera
      const maxLeft = parentRect.width - elemRect.width - 8;
      const maxTop = parentRect.height - elemRect.height - 80;

      newLeft = Math.max(8, Math.min(newLeft, maxLeft));
      newTop = Math.max(48, Math.min(newTop, maxTop));

      this.overlayElement.style.left = `${newLeft}px`;
      this.overlayElement.style.top = `${newTop}px`;
      this.overlayElement.style.bottom = 'auto';
      this.overlayElement.style.right = 'auto';
    };

    const endDrag = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.overlayElement.classList.remove('overlay-dragging');
      }
    };

    // Eventos Mouse
    this.overlayElement.addEventListener('mousedown', (e) => {
      // Ignora clique se for dentro de campo editável
      if (e.target.isContentEditable || e.target.tagName === 'INPUT') return;
      startDrag(e.clientX, e.clientY);
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => doDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);

    // Eventos Touch
    this.overlayElement.addEventListener('touchstart', (e) => {
      if (e.target.isContentEditable || e.target.tagName === 'INPUT') return;
      if (e.touches.length === 1) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        doDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', endDrag);
  }

  // Torna campos editáveis inline com salvamento
  setupEditableFields() {
    const editableTags = document.querySelectorAll('[data-editable-field]');
    editableTags.forEach(el => {
      el.addEventListener('blur', () => {
        const field = el.getAttribute('data-editable-field');
        const text = el.innerText.trim();
        if (field === 'projectTag') {
          window.appState.updateOverlaySetting('projectTag', text);
        } else if (field === 'customAddress') {
          window.appState.updateOverlaySetting('customAddress', text);
        }
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          el.blur();
        }
      });
    });
  }

  // Atualiza a renderização da interface da sobreposição (overlay)
  renderOverlayUI() {
    const settings = window.appState.overlaySettings;
    const sensors = window.appState.sensorData;
    const overlay = document.getElementById('camera-overlay');
    if (!overlay) return;

    // 1. Aplica Tipografia e Tema
    overlay.className = `overlay-draggable-container absolute z-30 p-2.5 rounded-lg shadow-xl backdrop-blur-md transition-colors select-none max-w-[92vw] sm:max-w-md ${settings.fontFamily} ${settings.fontSize}`;

    // Remove temas anteriores
    overlay.classList.remove('overlay-theme-dark', 'overlay-theme-light', 'overlay-theme-yellow', 'overlay-theme-transparent-outline');

    if (settings.theme === 'dark') overlay.classList.add('overlay-theme-dark');
    else if (settings.theme === 'light') overlay.classList.add('overlay-theme-light');
    else if (settings.theme === 'yellow') overlay.classList.add('overlay-theme-yellow');
    else if (settings.theme === 'transparent-outline') overlay.classList.add('overlay-theme-transparent-outline');

    // 2. Visibilidade e valores dos campos
    // Obra / Tag
    const tagEl = document.getElementById('overlay-project-tag');
    if (tagEl) {
      tagEl.parentElement.style.display = settings.showProjectTag ? 'flex' : 'none';
      tagEl.innerText = settings.projectTag || 'OBRA: Vistoria Técnica';
    }

    // Data e Hora
    const dateEl = document.getElementById('overlay-datetime');
    if (dateEl) {
      dateEl.parentElement.style.display = settings.showDateTime ? 'flex' : 'none';
      dateEl.innerText = sensors.currentTimeStr || '--/--/---- --:--:--';
    }

    // Coordenadas GPS
    const coordsEl = document.getElementById('overlay-coords');
    if (coordsEl) {
      coordsEl.parentElement.style.display = settings.showCoords ? 'flex' : 'none';
      const gps = sensors.gps;
      if (gps.status === 'ok' || gps.status === 'weak' || gps.status === 'manual') {
        let label = `LAT: ${gps.lat.toFixed(6)}° LON: ${gps.lng.toFixed(6)}°`;
        if (gps.status === 'weak') label += ' (fraco)';
        else if (gps.status === 'manual') label += ' (MANUAL)';
        coordsEl.innerText = label;
      } else if (gps.status === 'denied') {
        coordsEl.innerText = 'GPS INDISPONÍVEL (Negado)';
      } else {
        coordsEl.innerText = 'Buscando GPS...';
      }
    }

    // Altitude
    const altEl = document.getElementById('overlay-altitude');
    if (altEl) {
      altEl.parentElement.style.display = settings.showAltitude ? 'inline-flex' : 'none';
      if (sensors.gps.altitude !== null) {
        altEl.innerText = `ALT: ${sensors.gps.altitude}m (±${sensors.gps.accuracy || 0}m)`;
      } else {
        altEl.innerText = `ALT: --`;
      }
    }

    // Bússola
    const compassEl = document.getElementById('overlay-compass');
    const compassIcon = document.getElementById('overlay-compass-needle');
    if (compassEl) {
      compassEl.parentElement.style.display = settings.showCompass ? 'inline-flex' : 'none';
      compassEl.innerText = `${sensors.compass.heading}° ${sensors.compass.cardinal}`;
      if (compassIcon) {
        compassIcon.style.transform = `rotate(${sensors.compass.heading}deg)`;
      }
    }

    // Endereço
    const addrEl = document.getElementById('overlay-address');
    if (addrEl) {
      addrEl.parentElement.style.display = settings.showAddress ? 'flex' : 'none';
      addrEl.setAttribute('contenteditable', settings.allowManualAddress ? 'true' : 'false');
      if (settings.allowManualAddress && settings.customAddress) {
        addrEl.innerText = settings.customAddress;
      } else if (sensors.address.stale) {
        addrEl.innerText = 'Endereço indisponível (offline)';
      } else {
        addrEl.innerText = sensors.address.formatted || 'Obtendo endereço...';
      }
    }

    // Mini Mapa
    const mapEl = document.getElementById('overlay-minimap-container');
    if (mapEl) {
      mapEl.style.display = settings.showMiniMap ? 'block' : 'none';
      if (sensors.gps.lat !== null && sensors.gps.lng !== null) {
        const lat = sensors.gps.lat;
        const lng = sensors.gps.lng;
        const mapImg = document.getElementById('overlay-minimap-img');
        if (mapImg) {
          mapImg.src = `https://tile.openstreetmap.org/16/${long2tile(lng, 16)}/${lat2tile(lat, 16)}.png`;
        }
      }
    }
  }

  // Som de obturador via Web Audio API (sem dependência de assets externos)
  playShutterSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.09);
    } catch (e) {
      console.warn('Audio click não pôde ser reproduzido:', e);
    }
  }

  // Disparo e Captura da Foto (Mesclagem Vídeo + Overlay)
  async capturePhoto() {
    if (this.isCapturing) return;
    this.isCapturing = true;

    if (!this.videoElement || !this.stream || !this.videoElement.videoWidth) {
      this.isCapturing = false;
      document.getElementById('camera-fallback-input')?.click();
      return;
    }

    // Flash visual
    const flashEl = document.getElementById('camera-flash');
    if (flashEl) {
      flashEl.classList.add('active');
      setTimeout(() => flashEl.classList.remove('active'), 350);
    }

    // Som de clique
    this.playShutterSound();

    try {
      const video = this.videoElement;
      const overlay = this.overlayElement;

      // Resolução nativa do vídeo ou fallback
      const videoWidth = video.videoWidth || 1280;
      const videoHeight = video.videoHeight || 720;

      // 1. Criar Canvas de Renderização em Alta Resolução
      if (!video.videoWidth) {
        window.showToast('Câmera sem imagem. Foto NÃO registrada.', 'error');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext('2d');

      // Desenhar o frame do vídeo
      // Se a câmera frontal estiver ativa, espelha horizontalmente
      if (this.activeFacingMode === 'user') {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -videoWidth, 0, videoWidth, videoHeight);
        ctx.restore();
      } else {
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      }

      // 2. Renderizar o Overlay sobre o Canvas usando html2canvas para fidelidade 100% exata
      let overlayRendered = false;
      if (window.html2canvas) {
        try {
          const overlayCanvas = await window.html2canvas(overlay, {
            backgroundColor: null,
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false
          });

          // Calcular a posição proporcional relativa do overlay na tela para o canvas de saída
          const containerRect = this.cameraContainer.getBoundingClientRect();
          const overlayRect = overlay.getBoundingClientRect();

          const relX = (overlayRect.left - containerRect.left) / containerRect.width;
          const relY = (overlayRect.top - containerRect.top) / containerRect.height;
          const relWidth = overlayRect.width / containerRect.width;
          const relHeight = overlayRect.height / containerRect.height;

          const drawX = relX * videoWidth;
          const drawY = relY * videoHeight;
          const drawW = relWidth * videoWidth;
          const drawH = relHeight * videoHeight;

          ctx.drawImage(overlayCanvas, drawX, drawY, drawW, drawH);
          overlayRendered = true;
        } catch (cErr) {
          console.warn('html2canvas falhou (possível restrição file:// ou CORS), aplicando carimbo direto:', cErr);
        }
      }

      if (!overlayRendered) {
        this.drawOverlayFallbackDirect(ctx, videoWidth, videoHeight);
      }

      // 3. Gerar DataURL JPEG de alta qualidade
      const finalImageDataUrl = canvas.toDataURL('image/jpeg', 0.92);

      // Exibir Modal de Pré-visualização da Foto
      this.showCapturePreviewModal(finalImageDataUrl);

    } catch (err) {
      console.error('Erro ao capturar foto:', err);
      window.showToast('Erro ao capturar foto. Tente novamente.', 'error');
    } finally {
      this.isCapturing = false;
    }
  }

  // Fallback de carimbo desenhado diretamente no Canvas 2D
  drawOverlayFallbackDirect(ctx, width, height) {
    const settings = window.appState.overlaySettings;
    const sensors = window.appState.sensorData;

    const pad = 16;
    const boxW = Math.min(width - 32, 600);
    const boxH = 140;
    const boxX = 16;
    const boxY = height - boxH - 16;

    // Fundo
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.roundRect ? ctx.roundRect(boxX, boxY, boxW, boxH, 8) : ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();

    // Textos
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(settings.projectTag || 'LCam & Check - Vistoria Técnica', boxX + pad, boxY + 28);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '14px monospace';
    ctx.fillText(`DATA: ${sensors.currentTimeStr}`, boxX + pad, boxY + 54);
    if (sensors.gps.lat !== null) {
      ctx.fillText(`GPS: ${sensors.gps.lat.toFixed(6)}°, ${sensors.gps.lng.toFixed(6)}°  ALT: ${sensors.gps.altitude}m`, boxX + pad, boxY + 78);
    } else {
      ctx.fillText(`GPS: INDISPONÍVEL`, boxX + pad, boxY + 78);
    }
    ctx.fillText(`BÚSSOLA: ${sensors.compass.heading || 0}° ${sensors.compass.cardinal || ''}`, boxX + pad, boxY + 102);

    const addr = (settings.allowManualAddress && settings.customAddress) ? settings.customAddress : (sensors.address.formatted || 'Local não georreferenciado');
    ctx.fillText(`LOCAL: ${addr.slice(0, 65)}`, boxX + pad, boxY + 126);
  }

  // Modal de Pré-visualização e Ações pós-disparo
  showCapturePreviewModal(dataUrl) {
    const modal = document.getElementById('modal-photo-preview');
    const previewImg = document.getElementById('captured-preview-img');
    const btnDownload = document.getElementById('btn-download-captured');
    const btnAddToReport = document.getElementById('btn-add-to-report');

    if (!modal || !previewImg) return;

    previewImg.src = dataUrl;
    modal.classList.remove('hidden');

    // Botão Download Direto
    btnDownload.onclick = () => {
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = dataUrl;
      a.download = `Vistoria_${timestamp}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.showToast('Foto salva na galeria!', 'success');
      modal.classList.add('hidden');
    };

    // Botão Adicionar ao Relatório PDF (Módulo B)
    btnAddToReport.onclick = () => {
      const sensors = window.appState.sensorData;
      const settings = window.appState.overlaySettings;

      const photoItem = {
        id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        imageDataUrl: dataUrl,
        timestamp: sensors.currentTimeStr,
        gps: { ...sensors.gps },
        address: (settings.allowManualAddress && settings.customAddress) ? settings.customAddress : (sensors.address.formatted || 'Local não georreferenciado'),
        caption: 'Registro fotográfico da vistoria técnica.',
        status: 'conforme', // 'conforme' | 'alerta' | 'nao-conforme'
        overlayTheme: settings.theme
      };

      window.appState.addReportPhoto(photoItem);
      window.showToast('Foto adicionada ao Relatório Fotográfico!', 'success');
      modal.classList.add('hidden');

      // Navegar para o Módulo de Relatório
      window.navigateToScreen('report');
    };
  }

  // Configuração de Event Listeners da Câmera
  setupEventListeners() {
    // Botão de Disparo / Shutter
    const shutterBtn = document.getElementById('btn-shutter');
    if (shutterBtn) {
      shutterBtn.onclick = () => this.capturePhoto();
    }

    // Botão de Trocar Câmera Frontal/Traseira
    const flipBtn = document.getElementById('btn-camera-flip');
    if (flipBtn) {
      flipBtn.onclick = () => this.toggleCamera();
    }

    // Botão de Lanterna
    const torchBtn = document.getElementById('btn-torch-toggle');
    if (torchBtn) {
      torchBtn.onclick = () => this.toggleTorch();
    }

    // Botão Fechar / Voltar da Câmera
    const backBtn = document.getElementById('btn-camera-back');
    if (backBtn) {
      backBtn.onclick = () => {
        this.stopCamera();
        window.navigateToScreen('home');
      };
    }

    // Modal de Preview: Botão Fechar / Descartar
    const closePreviewBtn = document.getElementById('btn-close-preview');
    if (closePreviewBtn) {
      closePreviewBtn.onclick = () => {
        document.getElementById('modal-photo-preview').classList.add('hidden');
      };
    }
  }

  // Pausa a câmera quando sai da tela
  cleanup() {
    this.pause();
  }

  // Fallback Capture Handler
  async handleFallbackCapture(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    window.showToast('Processando foto da câmera...', 'info');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.showCapturePreviewModal(e.target.result);
      event.target.value = '';
    };
    reader.onerror = () => {
      window.showToast('Erro ao processar imagem.', 'error');
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  }
}

// Utilitários de conversão de coordenadas para tiles do OSM
function long2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}
function lat2tile(lat, zoom) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}

window.cameraModule = new CameraModule();
