# 📐 LCam & Check - Aplicativo de Vistoria de Obras & Engenharia Civil (PWA)

O **LCam & Check** é um aplicativo mobile-first projetado para engenheiros civis, peritos técnicos, mestres de obras e arquitetos. Ele combina uma **Câmera Inteligente Georreferenciada (Módulo A)** com um **Gerador de Relatórios Técnicos Fotográficos A4 (Módulo B)**, pronto para conversão em aplicativo nativo via **Capacitor** e preparado para monetização com **Google AdMob**.

---

## 🚀 Como Executar o Aplicativo

Como o projeto foi construído usando tecnologias web universais (HTML5, Tailwind CSS, Vanilla JS moderno, jsPDF e html2canvas):

1. **Execução Imediata no Navegador:**
   - Dê um duplo clique no arquivo `index.html` ou abra-o diretamente no Google Chrome, Microsoft Edge ou Safari.
   - Não requer compilação ou comandos de terminal (`npm`, `build`, etc.).

2. **Execução como PWA (Mobile):**
   - Acesse o aplicativo pelo navegador do seu celular (Android Chrome ou iOS Safari).
   - Toque em **"Adicionar à Tela de Início"** / **"Instalar Aplicativo"**.
   - O aplicativo roda em tela cheia (standalone) com suporte a cache offline via Service Worker (`sw.js`).

---

## 🛠️ Estrutura e Funcionalidades

### 1. Tela Inicial & Navegação
- **Design System Profissional:** Paleta inspirada em engenharia civil (tons de grafite `slate-950`, amarelo segurança `#f59e0b`, azul engenharia e tipografia técnica `JetBrains Mono` / `Plus Jakarta Sans`).
- **Painel de Sensores em Tempo Real:** Status de satélites GPS, precisão em metros, altitude e azimute da bússola magnética.
- **Dois Grandes Botões Centrais:**
  - 📷 **Opção A: Câmera Inteligente:** Acesso imediato à captura com carimbo georreferenciado.
  - 📄 **Opção B: Relatório PDF:** Formulário e diagramação de laudo fotográfico.
- **Monetização Google AdMob:** Espaços reservados no padrão oficial **320x50 pixels** com estilização profissional (`Ad Space - Google AdMob`).

---

### 2. Módulo A: Câmera Inteligente (Geotagging e Captura)
- **Acesso ao Hardware:** Utiliza `navigator.mediaDevices.getUserMedia` configurado com preferência para a câmera traseira (`facingMode: { ideal: "environment" }`) e controle de resolução.
- **Camada de Sobreposição (Overlay Arrastável e Editável):**
  - **Data e Hora** local atualizadas a cada segundo.
  - **Coordenadas GPS** (Latitude e Longitude com alta precisão e altitude).
  - **Endereço Aproximado** via API de Geocodificação Reversa do **OpenStreetMap Nominatim** com cache de requisições.
  - **Bússola Magnética** (`DeviceOrientationEvent`) com indicação em graus e pontos cardeais (N, NE, L, SE, S, etc.).
  - **Mini Mapa Estático** com renderização do local da vistoria.
  - **Edição In-Loco:** Toque direto em qualquer texto da sobreposição para editar manualmente observações ou o nome da obra.
  - **Arrastável:** O carimbo pode ser movido livremente pela tela com o dedo ou mouse.
- **Menu de Configurações (Engrenagem):**
  - Alternância de fontes (JetBrains Mono, Sans Clean, Condensada, Inter).
  - Controle de tamanho do texto (P, M, G, GG).
  - Temas de cor do carimbo: Escuro fosco, Claro, Amarelo Segurança e Contorno com sombra.
  - Switches para ligar/desligar: Data/Hora, Coordenadas, Altitude, Endereço, Bússola, Mini Mapa e Tag da Obra.
- **Captura e Exportação:**
  - Disparo de alta definição mesclando o vídeo da câmera com a camada de sobreposição no `<canvas>` via `html2canvas` com fallback 2D.
  - Feedback visual (flash na tela) e clique sonoro via Web Audio API.
  - Pré-visualização com download em JPEG e botão de atalho para enviar diretamente ao Relatório PDF.

---

### 3. Módulo B: Gerador de Relatório PDF Independente
- **Formulário Técnico:**
  - Título do Relatório
  - Nome da Obra / Cliente
  - Responsável Técnico / Autor
  - Registro Profissional (CREA / CAU)
  - Data da Vistoria
  - Resumo dos Objetivos da Inspeção
- **Gerenciamento de Fotos:**
  - Importação de fotos da galeria ou fotos capturadas na câmera inteligente.
  - Aplicação automática do carimbo técnico nas fotos importadas.
  - Botão de **"+ Foto de Amostra"** para testar a geração do relatório imediatamente.
  - **Classificação de Conformidade Técnica:** Badges interativos por foto:
    - ✓ *Conforme com Projeto*
    - ▲ *Alerta Técnico*
    - ✕ *Não Conforme / Reparo Imediato*
  - Campo `<textarea>` para observações e laudos técnicos específicos de cada foto.
  - Reordenação (subir/descer fotos) e exclusão.
- **Exportação do Laudo A4 com `jsPDF`:**
  - Cabeçalho corporativo com selo técnico e identificação da obra.
  - **2 fotos por página A4** com carimbos georreferenciados visíveis e legendas técnicas abaixo.
  - Paginação automática estruturada (Ex: `Folha 1/2`, `Página 2 de 2`).
  - Rodapé formal com registro de emissão digital.

---

### 4. Simulação de Sensores (Para Testes no Computador)
- No topo da tela inicial há o ícone de **Calibração/Simulação de Sensores**.
- Permite alterar manualmente a Latitude, Longitude, Altitude e Azimute da Bússola para testar qualquer localização do Brasil mesmo em notebooks ou PCs sem sensor físico de GPS.

---

## 📱 Conversão para Aplicativo Nativo (Capacitor)

Para empacotar como app Android (`.apk` / `.aab`) ou iOS (`.ipa`):

1. Ter o ambiente Node.js / Android Studio configurado futuramente.
2. Na pasta do projeto:
   ```bash
   npx @capacitor/cli init "LCam & Check" "com.lcam.check" --web-dir .
   npm install @capacitor/camera @capacitor/geolocation
   npx cap add android
   npx cap copy
   npx cap open android
   ```
3. O banner AdMob já está com o dimensionamento oficial (`320x50px`) no CSS (`.admob-banner-placeholder`), bastando associar o plugin `@capacitor-community/admob` no momento de publicação na Google Play ou App Store.

---

**Desenvolvido com excelência técnica para engenharia civil e vistorias de campo.**
