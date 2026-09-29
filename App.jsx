import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  CheckSquare, 
  MapPin, 
  Globe, 
  Calendar, 
  Sliders, 
  SunMoon, 
  Type, 
  Trash2, 
  PlusCircle, 
  CheckCircle2, 
  Crosshair, 
  Download, 
  X 
} from 'lucide-react';

// Fotos de alta resolução simulando vistorias de canteiro de obras
const CONSTRUCTION_PHOTOS = [
  "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1000&q=80", // Estrutura e armação de ferro
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80", // Gruas e canteiro geral
  "https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=1000&q=80", // Fundação e concretagem
  "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1000&q=80", // Instalações eletromecânicas
  "https://images.unsplash.com/photo-1574689211272-bc14e289e223?auto=format&fit=crop&w=1000&q=80"  // Alvenaria estrutural
];

export default function RDOLCamAndCheck() {
  // 1. Navegação fixa (Apenas Câmera e Checklist)
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'checklist'

  // 2. Controles Dinâmicos do Carimbo em Tempo Real
  const [opacity, setOpacity] = useState(0.85); // 0.1 a 1.0
  const [fontSizeLevel, setFontSizeLevel] = useState('medium'); // 'small' | 'medium' | 'large'
  const [invertColors, setInvertColors] = useState(false); // false = Fundo Escuro/Texto Claro, true = Fundo Claro/Texto Escuro

  // 3. Relógio e GPS dinâmicos em tempo real
  const [currentTime, setCurrentTime] = useState('');

  // 4. Estados visuais da câmera
  const [isFlashing, setIsFlashing] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  // 5. Estado do Checklist e Relatório Expresso
  const [reportTitle, setReportTitle] = useState('Vistoria Técnica Térreo - Bloco A');
  const [checklist, setChecklist] = useState([
    {
      id: 1,
      photoUrl: CONSTRUCTION_PHOTOS[0],
      address: "Av. Paulista, 1000 - Canteiro Central",
      coords: "Lat: -23.5615° S | Long: -46.6559° W",
      timestamp: "29/09/2026 - 15:39:17",
      caption: "Conferência da armadura positiva da viga V-102. Espaçadores plásticos conferidos conforme projeto de cálculo estrutural.",
      opacity: 0.85,
      fontSizeLevel: 'medium',
      invertColors: false
    }
  ]);

  // 6. Modal de Confirmação do Relatório
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Atualização dinâmica do carimbo (data e hora em tempo real)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const day = pad(now.getDate());
      const month = pad(now.getMonth() + 1);
      const year = now.getFullYear();
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());
      setCurrentTime(`${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Alternador do tamanho da fonte: Pequeno -> Médio -> Grande
  const toggleFontSize = () => {
    if (fontSizeLevel === 'small') setFontSizeLevel('medium');
    else if (fontSizeLevel === 'medium') setFontSizeLevel('large');
    else setFontSizeLevel('small');
  };

  // Mapeamento dinâmico de tipografia
  const getFontSizeClass = (level) => {
    switch (level) {
      case 'small':
        return 'text-[9.5px] leading-tight';
      case 'large':
        return 'text-xs sm:text-sm leading-snug';
      case 'medium':
      default:
        return 'text-[11px] leading-snug';
    }
  };

  // Notificação flutuante temporizada
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Disparo do obturador da câmera
  const handleCapture = () => {
    // Flash da tela
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 280);

    // Vibração háptica tátil (se suportado pelo celular)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    const currentPhoto = CONSTRUCTION_PHOTOS[photoIndex % CONSTRUCTION_PHOTOS.length];

    // Criação do novo registro fotográfico com os dados e carimbo exatos do momento do disparo
    const newRecord = {
      id: Date.now(),
      photoUrl: currentPhoto,
      address: "Av. Paulista, 1000 - Canteiro Central",
      coords: "Lat: -23.5615° S | Long: -46.6559° W",
      timestamp: currentTime,
      caption: `Registro de fiscalização de conformidade estrutural. Setor vistoriado: #${checklist.length + 1}.`,
      opacity: opacity,
      fontSizeLevel: fontSizeLevel,
      invertColors: invertColors
    };

    // Adiciona automaticamente à lista do Checklist
    setChecklist((prev) => [...prev, newRecord]);

    // Próxima imagem mockada da obra
    setPhotoIndex((prev) => prev + 1);

    // Toast de confirmação
    triggerToast("Foto adicionada ao Checklist!");
  };

  // Exclusão de registro
  const handleDeleteRecord = (id) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
    triggerToast("Registro removido");
  };

  // Atualização em tempo real da legenda técnica
  const handleCaptionChange = (id, newCaption) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, caption: newCaption } : item))
    );
  };

  // Adição manual de registro
  const handleAddManualRecord = () => {
    const currentPhoto = CONSTRUCTION_PHOTOS[(checklist.length + 2) % CONSTRUCTION_PHOTOS.length];
    const newRecord = {
      id: Date.now(),
      photoUrl: currentPhoto,
      address: "Av. Paulista, 1000 - Canteiro Central",
      coords: "Lat: -23.5615° S | Long: -46.6559° W",
      timestamp: currentTime,
      caption: "Apontamento técnico complementar registrado manualmente.",
      opacity: 0.85,
      fontSizeLevel: 'medium',
      invertColors: false
    };
    setChecklist((prev) => [...prev, newRecord]);
    triggerToast("Registro manual adicionado!");
  };

  return (
    <div className="relative w-full max-w-md h-[100dvh] mx-auto bg-slate-950 text-slate-100 flex flex-col overflow-hidden shadow-2xl border-x border-slate-800 select-none font-sans">
      
      {/* 1. EFEITO FLASH DO OBTURADOR */}
      {isFlashing && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-300 opacity-95" />
      )}

      {/* 2. TOAST FLUTUANTE DE SUCESSO */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-black px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs border border-amber-300 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3. MODAL DE CONFIRMAÇÃO: SALVAR RELATÓRIO */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Relatório Consolidado</h3>
                  <p className="text-[11px] text-amber-400 font-mono">INSPECTRDO SISTEMA</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Fechar modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Título:</span>
                <span className="font-bold text-white text-right truncate max-w-[200px]">{reportTitle || "Sem título"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total de Registros:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{checklist.length} fotos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data de Fechamento:</span>
                <span className="font-mono text-slate-300">{currentTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Local da Obra:</span>
                <span className="text-slate-300 font-medium">Av. Paulista, 1000</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  triggerToast("Relatório emitido com sucesso!");
                }}
                className="w-full min-h-[48px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-sm uppercase tracking-wide"
              >
                <Download className="w-5 h-5" />
                Baixar PDF & RDO Digital
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full min-h-[48px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs"
              >
                Continuar Editando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL: ALTERNÂNCIA ENTRE AS DUAS ABAS */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* ============================================================== */}
        {/* TELA 1: CÂMERA GEORREFERENCIADA (activeTab === 'camera')        */}
        {/* ============================================================== */}
        {activeTab === 'camera' && (
          <div className="flex-1 flex flex-col relative h-full bg-black select-none">
            
            {/* 1. VISOR DA CÂMERA (Lente com foto de obra e retículo) */}
            <div className="relative flex-1 w-full overflow-hidden flex flex-col justify-between">
              {/* Imagem de Fundo Simulando Câmera */}
              <img
                src={CONSTRUCTION_PHOTOS[photoIndex % CONSTRUCTION_PHOTOS.length]}
                alt="Visor da Câmera"
                className="absolute inset-0 w-full h-full object-cover object-center filter brightness-95 contrast-105"
              />

              {/* Gradiente de Contraste */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85 pointer-events-none" />

              {/* Grade de Guia 3x3 com Mira Central */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40 flex items-center justify-center">
                  <Crosshair className="w-8 h-8 text-amber-400/80" />
                </div>
                <div className="border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div />
              </div>

              {/* STATUS SUPERIOR: GPS ATIVO (ALTA PRECISÃO) */}
              <header className="relative z-10 pt-3 px-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-amber-500/50 px-3 py-1.5 rounded-full shadow-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[11px] font-mono font-black text-amber-400 tracking-wider uppercase">
                    GPS ATIVO (ALTA PRECISÃO)
                  </span>
                </div>

                <div className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/80 text-[10px] font-mono text-slate-300">
                  ±1.2m • 762m ALT
                </div>
              </header>

              {/* CONTROLES + OVERLAY DO CARIMBO + DISPARADOR */}
              <div className="relative z-10 p-3 space-y-2.5">
                
                {/* 2. CONTROLES DINÂMICOS DE EDIÇÃO (Toolbar Vidro Escuro) */}
                <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-2.5 flex items-center justify-between gap-3 shadow-2xl">
                  
                  {/* Slider de Opacidade com porcentagem em tempo real */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-center text-[10px] text-slate-300 font-mono mb-0.5">
                        <span className="font-semibold text-slate-400 uppercase tracking-tighter">Opacidade</span>
                        <span className="font-bold text-amber-400">{Math.round(opacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={opacity}
                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
                        aria-label="Controle de Opacidade do Carimbo"
                      />
                    </div>
                  </div>

                  {/* Botão Ícone "T": Alterna tamanho da fonte ciclicamente */}
                  <button
                    onClick={toggleFontSize}
                    title="Alternar Tamanho da Fonte"
                    className="min-h-[48px] px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-700 flex items-center gap-1.5 text-slate-200 transition-all"
                    aria-label="Alternar tamanho da fonte do carimbo"
                  >
                    <Type className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-300">
                      {fontSizeLevel === 'small' ? 'P' : fontSizeLevel === 'medium' ? 'M' : 'G'}
                    </span>
                  </button>

                  {/* Botão de Inversão de Cor: Fundo Escuro vs Claro */}
                  <button
                    onClick={() => setInvertColors((prev) => !prev)}
                    title="Inverter Contraste de Cores"
                    className={`min-h-[48px] px-3 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                      invertColors 
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold' 
                        : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
                    }`}
                    aria-label="Inverter cores do carimbo"
                  >
                    <SunMoon className="w-5 h-5" />
                  </button>
                </div>

                {/* 3. OVERLAY DO CARIMBO GEORREFERENCIADO (Dinâmico com Opacidade, Fonte e Inversão) */}
                <div
                  style={{
                    backgroundColor: invertColors
                      ? `rgba(255, 255, 255, ${opacity})`
                      : `rgba(15, 23, 42, ${opacity})`,
                  }}
                  className={`w-full rounded-2xl p-2.5 sm:p-3 border backdrop-blur-sm transition-all duration-150 flex items-stretch justify-between gap-2.5 shadow-2xl ${
                    invertColors
                      ? 'border-slate-300/80 text-slate-950'
                      : 'border-amber-500/40 text-slate-100'
                  }`}
                >
                  {/* Bloco de Informações Técnicas */}
                  <div className={`flex-1 flex flex-col justify-center space-y-1 font-mono ${getFontSizeClass(fontSizeLevel)}`}>
                    <div className="flex items-center gap-1.5 pb-0.5">
                      <span className="font-black uppercase tracking-wider px-1.5 py-0.5 rounded text-[9px] bg-amber-400 text-slate-950">
                        RDO LAUDO FOTOGRÁFICO
                      </span>
                    </div>

                    <div className="flex items-start gap-1 font-sans">
                      <span className="text-amber-500 shrink-0">📍</span>
                      <span className="font-semibold truncate">
                        Av. Paulista, 1000 - Canteiro Central
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-amber-500 shrink-0">🌐</span>
                      <span className="font-medium opacity-90 truncate">
                        Lat: -23.5615° S | Long: -46.6559° W
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-amber-500 shrink-0">📅</span>
                      <span className="font-bold text-amber-500">
                        {currentTime || "Carregando satélites..."}
                      </span>
                    </div>
                  </div>

                  {/* Mini-Mapa Integrado (Canto Direito do Bloco) */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl bg-emerald-950/90 border border-emerald-500/60 overflow-hidden relative flex flex-col items-center justify-between p-1 shadow-inner">
                    <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,#10b981_1px,transparent_1px),linear-gradient(to_bottom,#10b981_1px,transparent_1px)] bg-[size:8px_8px]" />
                    
                    <div className="relative z-10 w-full flex justify-between items-center px-0.5">
                      <span className="text-[8px] font-mono font-black text-emerald-400 tracking-tighter">MAPA</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center my-auto">
                      <MapPin className="w-6 h-6 text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-bounce" />
                    </div>

                    <span className="relative z-10 text-[7px] font-mono text-emerald-300 font-bold">
                      SP • BRASIL
                    </span>
                  </div>
                </div>

                {/* 4. GATILHO DE CAPTURA (Botão Redondo Grande Amarelo de 80px) */}
                <div className="flex items-center justify-center pt-2 pb-1">
                  <button
                    onClick={handleCapture}
                    title="Capturar Foto Georreferenciada"
                    className="w-20 h-20 rounded-full border-4 border-amber-400/90 bg-amber-500 hover:bg-amber-400 active:scale-90 transition-all duration-150 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.5)] cursor-pointer"
                    aria-label="Disparar obturador e registrar foto"
                  >
                    <div className="w-14 h-14 rounded-full border-2 border-slate-950/80 bg-amber-400 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-slate-950" />
                    </div>
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA 2: CHECKLIST / RELATÓRIO EXPRESSO (activeTab === 'checklist') */}
        {/* ============================================================== */}
        {activeTab === 'checklist' && (
          <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
            
            {/* 1. CABEÇALHO DO RELATÓRIO COM INPUT EM DESTAQUE */}
            <div className="p-3.5 bg-slate-900 border-b border-slate-800 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" />
                  Relatório Fotográfico Diário (RDO)
                </span>
                <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                  {checklist.length} {checklist.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              {/* Input de Texto em Destaque */}
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Título do Relatório (ex: Vistoria Térreo)"
                className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 rounded-xl p-3 font-bold text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none transition-colors"
              />
            </div>

            {/* 2. LISTA EMPILHADA DE REGISTROS (Cards Fotográficos) */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              {checklist.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
                  <Camera className="w-12 h-12 text-slate-600 mb-2" />
                  <h4 className="font-bold text-white text-sm">Nenhum registro capturado</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                    Capture fotos na aba Câmera ou adicione manualmente abaixo.
                  </p>
                  <button
                    onClick={() => setActiveTab('camera')}
                    className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    Abrir Câmera
                  </button>
                </div>
              ) : (
                checklist.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg p-3 space-y-3"
                  >
                    {/* Cabeçalho do Card: Numeração e Botão de Excluir */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-mono font-black text-xs flex items-center justify-center shadow">
                          #{index + 1}
                        </span>
                        <span className="font-bold text-sm text-white">
                          Registro #{index + 1}
                        </span>
                      </div>

                      {/* Botão de Excluir Acessível para Luvas (min 48px) */}
                      <button
                        onClick={() => handleDeleteRecord(item.id)}
                        title="Excluir este registro"
                        className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 active:scale-95 transition-all"
                        aria-label={`Excluir registro número ${index + 1}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Bloco da Imagem com Carimbo Georreferenciado Impresso */}
                    <div className="relative w-full h-52 rounded-xl overflow-hidden border border-slate-700 bg-black">
                      <img
                        src={item.photoUrl}
                        alt={`Registro fotográfico ${index + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Carimbo Georreferenciado Sobreposto na Foto com dados do disparo */}
                      <div
                        style={{
                          backgroundColor: item.invertColors
                            ? `rgba(255, 255, 255, ${item.opacity || 0.85})`
                            : `rgba(15, 23, 42, ${item.opacity || 0.85})`,
                        }}
                        className={`absolute bottom-1.5 left-1.5 right-1.5 p-2 rounded-xl border backdrop-blur-xs flex items-center justify-between gap-2 ${
                          item.invertColors
                            ? 'border-slate-300 text-slate-950'
                            : 'border-amber-500/40 text-slate-100'
                        }`}
                      >
                        <div className="flex-1 font-mono text-[9.5px] leading-tight space-y-0.5 truncate">
                          <div className="font-bold text-amber-500 truncate flex items-center gap-1">
                            <span>📍</span> {item.address}
                          </div>
                          <div className="opacity-90 truncate">
                            <span>🌐</span> {item.coords}
                          </div>
                          <div className="font-bold opacity-95">
                            <span>📅</span> {item.timestamp}
                          </div>
                        </div>

                        <div className="px-1.5 py-1 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-400 text-[8px] font-mono font-bold flex flex-col items-center shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>GPS</span>
                        </div>
                      </div>
                    </div>

                    {/* Textarea de Legenda / Parecer Técnico */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center justify-between">
                        <span>Parecer Técnico / Observação</span>
                        <span className="text-amber-500">{item.caption.length} caracteres</span>
                      </label>
                      <textarea
                        rows={2}
                        value={item.caption}
                        onChange={(e) => handleCaptionChange(item.id, e.target.value)}
                        placeholder="Legenda / Observação"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors resize-none font-sans"
                      />
                    </div>
                  </div>
                ))
              )}

              {/* Botão "+ Adicionar Registro" */}
              <button
                onClick={handleAddManualRecord}
                className="w-full min-h-[48px] bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold border-2 border-dashed border-amber-500/50 rounded-2xl flex items-center justify-center gap-2 text-xs py-3 active:scale-98 transition-all"
              >
                <PlusCircle className="w-5 h-5 text-amber-400" />
                + Adicionar Registro Fotográfico
              </button>
            </div>

            {/* 3. BOTÃO "SALVAR RELATÓRIO" FIXO NO RODAPÉ */}
            <div className="p-3.5 bg-slate-900 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full min-h-[48px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 text-sm uppercase tracking-wide active:scale-95 transition-all"
              >
                <CheckSquare className="w-5 h-5 text-slate-950" />
                Salvar Relatório ({checklist.length} {checklist.length === 1 ? 'registro' : 'registros'})
              </button>
            </div>

          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* NAVEGAÇÃO INFERIOR FIXA (Bottom Navigation Bar)                */}
      {/* ============================================================== */}
      <nav className="h-20 bg-slate-950 border-t border-slate-800 px-6 flex items-center justify-around z-30 shrink-0 select-none">
        
        {/* Aba 1: [📷 Câmera] */}
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[52px] py-1.5 transition-colors relative ${
            activeTab === 'camera'
              ? 'text-amber-400 font-black'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Camera className={`w-6 h-6 ${activeTab === 'camera' ? 'stroke-[2.5]' : ''}`} />
            {activeTab === 'camera' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Câmera</span>
        </button>

        {/* Aba 2: [📋 Checklist] com Badge Contador de Fotos */}
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[52px] py-1.5 transition-colors relative ${
            activeTab === 'checklist'
              ? 'text-amber-400 font-black'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <CheckSquare className={`w-6 h-6 ${activeTab === 'checklist' ? 'stroke-[2.5]' : ''}`} />
            
            {/* Badge Dinâmico de Fotos */}
            {checklist.length > 0 && (
              <span className="absolute -top-1.5 -right-3.5 bg-amber-500 text-slate-950 text-[10px] font-mono font-black rounded-full px-1.5 py-0.2 shadow-md min-w-[18px] text-center">
                {checklist.length}
              </span>
            )}

            {activeTab === 'checklist' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Checklist</span>
        </button>

      </nav>

    </div>
  );
}
