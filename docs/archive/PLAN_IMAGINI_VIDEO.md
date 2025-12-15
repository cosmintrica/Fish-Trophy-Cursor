# 📸 Plan Implementare Imagini & Video Avansat

**Data**: 2025-01-02  
**Prioritate**: HIGH

---

## 🎯 Obiective

1. **Zoom Imagini** - Click pentru zoom, scroll wheel, drag & drop
2. **Resize Imagini** - 3 dimensiuni/resize
3. **Videouri YouTube Centrate** - Lățime maximă optimă
4. **Parser BBCode Complet** - Pentru afișare posturi reale

---

## 📋 Task-uri

### Faza 1: Parser BBCode Complet pentru Posturi ⚡

#### 1.1 Parser Core
- **Fișier**: `client/src/forum/utils/bbcodeParser.ts`
- Parsează toate tag-urile BBCode
- Returnează React componente în loc de HTML string
- Suport pentru: [b], [i], [u], [s], [h1-h3], [list], [url], [img], [video], [code]

#### 1.2 BBCodeRenderer Component
- **Fișier**: `client/src/forum/components/BBCodeRenderer.tsx`
- Renderizare React components
- Integrare ImageZoom și VideoPlayer components

---

### Faza 2: ImageZoom Component 🖼️

#### 2.1 Componenta ImageZoom
- **Fișier**: `client/src/forum/components/ImageZoom.tsx`
- **Funcționalități**:
  - Click pe imagine → deschide zoom modal
  - Scroll wheel → zoom in/out
  - Drag & drop → mută imaginea zoomată
  - Escape sau click în afara → închide zoom
  - Touch gestures pentru mobile (pinch to zoom)

#### 2.2 ImageZoomModal
- Modal fullscreen pentru zoom
- Controale zoom (+, -, reset)
- Pan & drag
- Optimizat pentru mobile

---

### Faza 3: ImageResize Component 📐

#### 3.1 Componenta ImageResize
- **Fișier**: `client/src/forum/components/ImageResize.tsx`
- **3 Dimensiuni**:
  - Small (300px max-width)
  - Medium (600px max-width) - default
  - Large (100% width)
- Dropdown sau butoane pentru selectare dimensiune
- Salvare preferință în localStorage (opțional)

---

### Faza 4: VideoPlayer Component ▶️

#### 4.1 Componenta VideoPlayer
- **Fișier**: `client/src/forum/components/VideoPlayer.tsx`
- **YouTube/Vimeo**:
  - Embed iframe responsive
  - Centrare în post
  - Lățime maximă optimă (ex: 800px)
  - Aspect ratio păstrat (16:9)
  - Mobile responsive

---

### Faza 5: Integrare 📦

#### 5.1 Integrare în MessageContainer
- Folosește BBCodeRenderer pentru content
- Replace `{post.content}` cu `<BBCodeRenderer content={post.content} />`

#### 5.2 Integrare în Preview
- Update `bbcodePreview.ts` pentru a folosi noile componente
- Sau creează un parser React component pentru preview

---

## 📁 Structură Fișiere

```
client/src/forum/
├── components/
│   ├── BBCodeRenderer.tsx          # Renderizare BBCode cu React
│   ├── ImageZoom.tsx                # Componentă zoom imagini
│   ├── ImageResize.tsx              # Componentă resize imagini (3 dimensiuni)
│   ├── VideoPlayer.tsx              # Componentă video YouTube/Vimeo
│   └── ImageZoomModal.tsx           # Modal zoom fullscreen
│
└── utils/
    └── bbcodeParser.ts              # Parser BBCode → React components
```

---

## 🔧 Tehnologii

- **React** - Componente
- **TypeScript** - Type safety
- **React Portal** - Pentru ImageZoomModal
- **Touch Events** - Pentru mobile gestures

---

## ✅ Checklist Implementare

### Parser BBCode
- [ ] Parser core (bbcodeParser.ts)
- [ ] BBCodeRenderer component
- [ ] Integrare în MessageContainer

### ImageZoom
- [ ] Componenta ImageZoom
- [ ] ImageZoomModal fullscreen
- [ ] Scroll wheel zoom
- [ ] Drag & drop pan
- [ ] Touch gestures (mobile)

### ImageResize
- [ ] Componenta ImageResize
- [ ] 3 dimensiuni (Small, Medium, Large)
- [ ] Dropdown/butoane selectare
- [ ] Salvare preferință (opțional)

### VideoPlayer
- [ ] Componenta VideoPlayer
- [ ] YouTube embed
- [ ] Vimeo embed
- [ ] Centrare și lățime maximă
- [ ] Mobile responsive

### Integrare
- [ ] Integrare în MessageContainer
- [ ] Integrare în Preview
- [ ] Testing
- [ ] Mobile optimizations

---

## 🚀 Prioritate Implementare

1. **Parser BBCode** - Fundație pentru restul
2. **ImageZoom** - Funcționalitate importantă
3. **VideoPlayer** - Centrare și responsive
4. **ImageResize** - Nice to have

---

## 📊 Estimare Timp

- **Faza 1** (Parser): ~2-3 ore
- **Faza 2** (ImageZoom): ~3-4 ore
- **Faza 3** (ImageResize): ~1-2 ore
- **Faza 4** (VideoPlayer): ~1-2 ore
- **Faza 5** (Integrare): ~1-2 ore

**Total**: ~8-13 ore

