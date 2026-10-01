/**
 * LCam & Check - Módulo B: Gerador de Relatório PDF Independente
 * Gestão de fotos, legendas técnicas, carimbos de geolocalização e exportação de PDF A4 padronizado.
 */

class ReportModule {
  constructor() {
    this.isGeneratingPdf = false;
  }

  init() {
    this.setupFormSync();
    this.setupPhotoUpload();
    this.setupEventListeners();
    this.renderPhotosList();

    // Inscrever em mudanças no estado
    window.appState.subscribe((eventType) => {
      if (eventType === 'reportPhotos') {
        this.renderPhotosList();
      } else if (eventType === 'reportHeader') {
        this.syncHeaderFields();
      }
    });

    this.syncHeaderFields();
  }

  // Utilitário contra XSS
  esc(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag])
    );
  }

  // Sincroniza campos do formulário com o State
  setupFormSync() {
    const fields = [
      { id: 'report-title', key: 'title' },
      { id: 'report-client', key: 'clientWork' },
      { id: 'report-author', key: 'author' },
      { id: 'report-crea', key: 'crea' },
      { id: 'report-date', key: 'date' },
      { id: 'report-notes', key: 'notes' }
    ];

    fields.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          window.appState.reportHeader[key] = e.target.value;
          window.appState.saveReportHeader();
        });
      }
    });
  }

  syncHeaderFields() {
    const data = window.appState.reportHeader;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = val;
    };

    setVal('report-title', data.title);
    setVal('report-client', data.clientWork);
    setVal('report-author', data.author);
    setVal('report-crea', data.crea);
    setVal('report-date', data.date);
    setVal('report-notes', data.notes);
  }

  // Upload de Fotos da Galeria com Carimbo Automático
  setupPhotoUpload() {
    const fileInput = document.getElementById('report-photo-input');
    if (!fileInput) return;

    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      window.showToast(`Processando ${files.length} foto(s)...`, 'info');

      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        try {
          const base64 = await this.readFileAsDataUrl(file);
          const gpsStr = { lat: 0, lng: 0, altitude: 0, accuracy: 0, status: 'manual' };
          
          const photoItem = {
            id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            imageDataUrl: base64,
            timestamp: new Date(file.lastModified).toLocaleString('pt-BR'),
            gps: gpsStr,
            address: 'Origem: Galeria / Importada',
            caption: 'Foto importada. Verifique os dados.',
            status: 'conforme',
            overlayTheme: settings.theme || 'dark',
            overlayFont: settings.fontFamily || 'font-mono-code',
            source: 'import'
          };

          window.appState.addReportPhoto(photoItem);
        } catch (err) {
          console.error('Erro ao ler imagem:', err);
        }
      }

      fileInput.value = ''; // Reseta input
      window.showToast('Fotos adicionadas ao relatório!', 'success');
    });
  }

  // Gera uma foto de amostra técnica realista para teste imediato de geração de PDF
  addSampleInspectionPhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // Fundo simulando estrutura de concreto e armaduras
    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, '#334155');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    // Desenha grid técnico de vistoria
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1280; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 720);
      ctx.stroke();
    }
    for (let y = 0; y < 720; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1280, y);
      ctx.stroke();
    }

    // Desenha armaduras / vergalhões estruturais simulados
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 14;
    for (let i = 150; i < 1150; i += 180) {
      ctx.beginPath();
      ctx.moveTo(i, 80);
      ctx.lineTo(i, 640);
      ctx.stroke();
    }
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 8;
    for (let j = 120; j < 620; j += 120) {
      ctx.beginPath();
      ctx.moveTo(100, j);
      ctx.lineTo(1180, j);
      ctx.stroke();
    }

    // Selo de Inspeção In Loco
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.roundRect ? ctx.roundRect(40, 40, 420, 90, 8) : ctx.rect(40, 40, 420, 90);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('LCAM & CHECK | VISTORIA TÉCNICA', 55, 75);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '15px monospace';
    ctx.fillText('INSPEÇÃO DE ARMADURAS E LAJE (4º PAV.)', 55, 105);

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    const sensors = window.appState.sensorData;

    const sampleItem = {
      id: 'photo_sample_' + Date.now(),
      imageDataUrl: base64,
      timestamp: sensors.currentTimeStr || new Date().toLocaleString('pt-BR'),
      gps: { lat: -23.55052, lng: -46.633308, altitude: 760, accuracy: 8 },
      address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
      caption: 'Inspeção das armaduras positivas da laje L4. Espaçamento de 15cm verificado conforme projeto executivo estrutural.',
      status: 'conforme',
      overlayTheme: 'dark',
      overlayFont: 'font-mono-code'
    };

    window.appState.addReportPhoto(sampleItem);
    window.showToast('Foto de amostra técnica adicionada!', 'success');
  }

  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Renderiza os cards das fotos do relatório na tela
  renderPhotosList() {
    const container = document.getElementById('report-photos-list');
    const countBadge = document.getElementById('report-photos-count');
    const emptyState = document.getElementById('report-photos-empty');

    if (!container) return;

    const photos = window.appState.reportPhotos;

    if (countBadge) countBadge.innerText = `${photos.length} foto${photos.length !== 1 ? 's' : ''}`;

    if (photos.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    container.innerHTML = photos.map((photo, index) => {
      const statusClass = photo.status === 'conforme'
        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
        : photo.status === 'alerta'
          ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
          : 'border-rose-500/40 text-rose-400 bg-rose-500/10';

      const statusLabel = photo.status === 'conforme'
        ? '✓ Conforme'
        : photo.status === 'alerta'
          ? '▲ Alerta Técnico'
          : '✕ Não Conforme';

      return `
        <div class="bg-slate-800/80 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg transition-all hover:border-slate-600 mb-4" data-photo-id="${photo.id}">
          <!-- Header do Card da Foto -->
          <div class="px-3.5 py-2.5 bg-slate-900/60 border-b border-slate-700/60 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center justify-center">
                #${index + 1}
              </span>
              <span class="text-xs font-medium text-slate-300 truncate max-w-[140px] sm:max-w-xs">
                ${this.esc(photo.timestamp)}
              </span>
            </div>
            <div class="flex items-center space-x-1">
              <!-- Reordenar para cima -->
              <button onclick="window.reportModule.movePhoto('${photo.id}', -1)" title="Mover para cima" class="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
              </button>
              <!-- Reordenar para baixo -->
              <button onclick="window.reportModule.movePhoto('${photo.id}', 1)" title="Mover para baixo" class="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <!-- Deletar Foto -->
              <button onclick="window.reportModule.deletePhoto('${photo.id}')" title="Excluir Foto" class="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/20 ml-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>

          <!-- Imagem com Carimbo Visual -->
          <div class="relative bg-black flex items-center justify-center max-h-64 overflow-hidden group">
            <img src="${photo.imageDataUrl}" alt="Registro ${index + 1}" class="w-full object-cover max-h-64">
            
            <!-- Badge de Geotagging no card -->
            <div class="absolute bottom-2 left-2 right-2 bg-slate-900/85 backdrop-blur-sm border border-slate-700/80 p-2 rounded text-[11px] font-mono text-slate-200 pointer-events-none">
              <div class="text-amber-400 font-bold truncate">GPS: ${photo.gps.lat.toFixed(5)}°, ${photo.gps.lng.toFixed(5)}° | Alt: ${photo.gps.altitude || 0}m</div>
              <div class="truncate text-slate-300">${this.esc(photo.address)}</div>
            </div>
          </div>

          <!-- Configurações e Legenda Técnica da Foto -->
          <div class="p-3.5 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <!-- Seletor de Status de Conformidade -->
              <div class="flex items-center space-x-1.5">
                <span class="text-xs text-slate-400 font-medium">Status:</span>
                <select onchange="window.reportModule.updatePhotoStatus('${photo.id}', this.value)" 
                  class="text-xs py-1 px-2.5 rounded-lg font-semibold border ${statusClass} cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option value="conforme" ${photo.status === 'conforme' ? 'selected' : ''}>✓ Conforme</option>
                  <option value="alerta" ${photo.status === 'alerta' ? 'selected' : ''}>▲ Alerta Técnico</option>
                  <option value="nao-conforme" ${photo.status === 'nao-conforme' ? 'selected' : ''}>✕ Não Conforme</option>
                </select>
              </div>

              <!-- Tema da Sobreposição para esta foto -->
              <div class="flex items-center space-x-1.5">
                <span class="text-xs text-slate-400">Tema Carimbo:</span>
                <select onchange="window.reportModule.updatePhotoTheme('${photo.id}', this.value)" 
                  class="text-xs py-1 px-2 rounded bg-slate-900 border border-slate-700 text-slate-200">
                  <option value="dark" ${photo.overlayTheme === 'dark' ? 'selected' : ''}>Escuro</option>
                  <option value="light" ${photo.overlayTheme === 'light' ? 'selected' : ''}>Claro</option>
                  <option value="yellow" ${photo.overlayTheme === 'yellow' ? 'selected' : ''}>Amarelo</option>
                </select>
              </div>
            </div>

            <!-- Campo de Legenda / Anotação Técnica -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">
                Anotações e Observações Técnicas:
              </label>
              <textarea 
                oninput="window.reportModule.updatePhotoCaption('${photo.id}', this.value)"
                rows="2" 
                placeholder="Descreva as condições identificadas, patologias, armaduras, conformidade..."
                class="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors">${this.esc(photo.caption)}</textarea>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Atualizar dados de uma foto
  updatePhotoCaption(id, caption) {
    window.appState.updateReportPhoto(id, { caption });
  }

  updatePhotoStatus(id, status) {
    window.appState.updateReportPhoto(id, { status });
  }

  updatePhotoTheme(id, overlayTheme) {
    window.appState.updateReportPhoto(id, { overlayTheme });
  }

  deletePhoto(id) {
    if (confirm('Tem certeza que deseja remover esta foto do relatório?')) {
      window.appState.removeReportPhoto(id);
      window.showToast('Foto removida', 'info');
    }
  }

  movePhoto(id, delta) {
    const photos = window.appState.reportPhotos;
    const index = photos.findIndex(p => p.id === id);
    if (index === -1) return;

    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= photos.length) return;

    const item = photos.splice(index, 1)[0];
    photos.splice(newIndex, 0, item);
    window.appState.saveReportPhotos();
  }

  // Geração do Documento PDF Estruturado (A4)
  async generatePDF() {
    const photos = window.appState.reportPhotos;
    if (photos.length === 0) {
      alert('Adicione pelo menos uma foto para gerar o relatório PDF.');
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('Biblioteca jsPDF não carregada. Verifique sua conexão com a internet.');
      return;
    }

    const modalLoading = document.getElementById('modal-pdf-loading');
    const loadingText = document.getElementById('pdf-loading-step');
    if (modalLoading) modalLoading.classList.remove('hidden');

    try {
      if (loadingText) loadingText.innerText = 'Inicializando layout A4...';

      const { jsPDF } = window.jspdf;
      // Cria documento A4 na vertical (portrait, mm, a4)
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2);

      const headerData = window.appState.reportHeader;

      // Calcular número total de páginas (2 fotos por página)
      const photosPerPage = 2;
      const totalPages = Math.ceil(photos.length / photosPerPage);

      for (let p = 0; p < totalPages; p++) {
        if (p > 0) {
          doc.addPage('a4', 'p');
        }

        const pageNum = p + 1;
        if (loadingText) loadingText.innerText = `Formatando página ${pageNum} de ${totalPages}...`;

        // 1. Cabeçalho Corporativo de Engenharia
        this.renderPdfHeader(doc, headerData, margin, contentWidth, pageNum, totalPages);

        // 2. Duas fotos por página
        const startIdx = p * photosPerPage;
        const pagePhotos = photos.slice(startIdx, startIdx + photosPerPage);

        let currentY = 56; // Posição após o cabeçalho

        for (let i = 0; i < pagePhotos.length; i++) {
          const photo = pagePhotos[i];
          const photoIndexNum = startIdx + i + 1;

          // Renderizar Bloco de Foto + Legenda
          currentY = await this.renderPdfPhotoBlock(doc, photo, photoIndexNum, margin, currentY, contentWidth);
        }

        // 3. Rodapé Formal
        this.renderPdfFooter(doc, margin, pageHeight, pageNum, totalPages);
      }

      if (loadingText) loadingText.innerText = 'Finalizando arquivo PDF...';

      // Nome do Arquivo
      const cleanTitle = (headerData.clientWork || 'Vistoria').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Relatorio_${cleanTitle}_${headerData.date}.pdf`;

      // Salva o PDF
      doc.save(filename);
      window.showToast('Relatório PDF gerado com sucesso!', 'success');

    } catch (err) {
      console.error('Erro na geração do PDF:', err);
      alert('Ocorreu um erro ao gerar o relatório PDF. Verifique o console.');
    } finally {
      if (modalLoading) modalLoading.classList.add('hidden');
    }
  }

  // Renderiza cabeçalho formal em cada página A4 do PDF
  renderPdfHeader(doc, headerData, margin, contentWidth, pageNum, totalPages) {
    // Barra superior sólida com cor corporativa (Slate 900)
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(margin, 12, contentWidth, 36, 'F');

    // Detalhe em Amarelo Engenharia
    doc.setFillColor(245, 158, 11); // #f59e0b
    doc.rect(margin, 12, 4, 36, 'F');

    // Logo / Ícone de Vistoria
    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('LCam & Check | Engenharia Civil', margin + 8, 20);

    // Título do Relatório
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(headerData.title.toUpperCase(), margin + 8, 26);

    // Dados da Obra e Autor
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // Slate 300
    doc.text(`OBRA/CLIENTE: ${headerData.clientWork}`, margin + 8, 33);
    doc.text(`RESPONSÁVEL: ${headerData.author} | ${headerData.crea}`, margin + 8, 38);
    doc.text(`DATA DA VISTORIA: ${headerData.date}`, margin + 8, 43);

    // Box de identificação de página no topo direito
    doc.setFillColor(30, 41, 59);
    doc.rect(margin + contentWidth - 40, 16, 36, 12, 'F');
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`FOLHA ${pageNum}/${totalPages}`, margin + contentWidth - 22, 23.5, { align: 'center' });
  }

  // Renderiza uma foto com seu carimbo e caixa de anotações
  async renderPdfPhotoBlock(doc, photo, indexNum, margin, startY, contentWidth) {
    const blockHeight = 108; // Altura total do bloco foto + texto
    const imgHeight = 72;
    const imgWidth = contentWidth;

    // 1. Moldura cinza para foto
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(margin, startY, contentWidth, imgHeight);

    // Inserir imagem fotográfica respeitando a proporção da imagem se possível
    try {
      doc.addImage(photo.imageDataUrl, 'JPEG', margin, startY, imgWidth, imgHeight, undefined, 'FAST');
    } catch (e) {
      console.warn('Erro ao inserir imagem no PDF:', e);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, startY, imgWidth, imgHeight, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.text('Imagem não disponível', margin + (imgWidth / 2), startY + 35, { align: 'center' });
    }

    // Carimbo técnico visual sobre a imagem no PDF (inferior esquerdo da foto)
    const stampH = 15;
    const stampY = startY + imgHeight - stampH;
    doc.setFillColor(15, 23, 42); // Fundo escuro com opacidade simulada
    doc.rect(margin, stampY, imgWidth, stampH, 'F');

    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`FOTO #${indexNum} | ${photo.timestamp} | GPS: ${photo.gps.lat.toFixed(5)}°, ${photo.gps.lng.toFixed(5)}° (Alt: ${photo.gps.altitude}m)`, margin + 3, stampY + 5.5);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const shortAddr = (photo.address || 'Local georreferenciado').slice(0, 110);
    doc.text(`LOCAL: ${shortAddr}`, margin + 3, stampY + 11);

    // 2. Caixa de Legenda Técnica abaixo da foto
    const noteY = startY + imgHeight;
    const noteH = 28;

    doc.setFillColor(248, 250, 252); // Slate 50
    doc.rect(margin, noteY, contentWidth, noteH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, noteY, contentWidth, noteH, 'D');

    // Linha de status de conformidade
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    if (photo.status === 'conforme') {
      doc.setTextColor(16, 185, 129); // Verde
      doc.text('[ CONFORME ]', margin + 4, noteY + 6);
    } else if (photo.status === 'alerta') {
      doc.setTextColor(217, 119, 6); // Amarelo
      doc.text('[ ALERTA TECNICO ]', margin + 4, noteY + 6);
    } else {
      doc.setTextColor(225, 29, 72); // Vermelho
      doc.text('[ NAO CONFORME ]', margin + 4, noteY + 6);
    }

    // Texto da Legenda Técnica com quebra automática de linha
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const captionText = photo.caption || 'Sem anotações adicionais.';
    const splitLines = doc.splitTextToSize(`Observação Técnica: ${captionText}`, contentWidth - 8);
    doc.text(splitLines, margin + 4, noteY + 12);

    return startY + blockHeight + 8; // Retorna próximo Y com respiro
  }

  // Rodapé formal
  renderPdfFooter(doc, margin, pageHeight, pageNum, totalPages) {
    const footerY = pageHeight - 12;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY - 3, margin + (210 - margin * 2), footerY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Documento gerado pelo sistema LCam & Check | Vistoria Digital Georreferenciada', margin, footerY + 2);
    doc.text(`Página ${pageNum} de ${totalPages}`, 210 - margin, footerY + 2, { align: 'right' });
  }

  setupEventListeners() {
    const btnGenPdf = document.getElementById('btn-generate-pdf');
    if (btnGenPdf) {
      btnGenPdf.onclick = () => this.generatePDF();
    }

    const btnClearPhotos = document.getElementById('btn-clear-report-photos');
    if (btnClearPhotos) {
      btnClearPhotos.onclick = () => {
        if (confirm('Deseja limpar todas as fotos adicionadas ao relatório?')) {
          window.appState.clearReportPhotos();
          window.showToast('Fotos removidas do relatório', 'info');
        }
      };
    }
  }
}

window.reportModule = new ReportModule();
