from PIL import Image, ImageDraw

def generate_icon(size, filename):
    # Fundo cinza grafite muito escuro
    img = Image.new("RGBA", (size, size), "#0f172a")
    draw = ImageDraw.Draw(img)

    # Coordenadas proporcionais
    cx = size / 2
    cy = size / 2
    r_outer = size * 0.35
    r_inner = size * 0.25

    # Desenho simples: Alvo da câmera/GPS em amarelo (#f59e0b)
    line_width = max(int(size * 0.05), 2)
    
    # Círculo externo
    draw.ellipse((cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer), outline="#f59e0b", width=line_width)
    
    # Mira: Linhas
    draw.line((cx, cy - r_outer * 1.5, cx, cy - r_outer * 0.5), fill="#f59e0b", width=line_width)
    draw.line((cx, cy + r_outer * 0.5, cx, cy + r_outer * 1.5), fill="#f59e0b", width=line_width)
    draw.line((cx - r_outer * 1.5, cy, cx - r_outer * 0.5, cy), fill="#f59e0b", width=line_width)
    draw.line((cx + r_outer * 0.5, cy, cx + r_outer * 1.5, cy), fill="#f59e0b", width=line_width)
    
    # Círculo interno (Ponto)
    draw.ellipse((cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner), fill="#f59e0b")

    img.save(filename)
    print(f"Gerado {filename}")

generate_icon(192, "c:/Users/guilhermesilva/.gemini/antigravity/scratch/lcam-check/android-app/app/src/main/assets/www/icon-192.png")
generate_icon(512, "c:/Users/guilhermesilva/.gemini/antigravity/scratch/lcam-check/android-app/app/src/main/assets/www/icon-512.png")
