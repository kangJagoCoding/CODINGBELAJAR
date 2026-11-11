# AugmentLab - Go Image Processing Frontend Client

Frontend client React + TypeScript + Tailwind CSS untuk aplikasi image augmentation backend Go (`https://github.com/Nemmoxida/go-image-process.git`) yang berjalan di `http://localhost:3001`.

---

## 🚀 Cara Menjalankan di Lokal (Local Setup)

### 1. Prasyarat
- **Node.js**: versi 18 atau lebih baru (`node -v`)
- **Backend Go**: Jalankan executable backend Go Anda di port `3001` (`http://localhost:3001`)

### 2. Instalasi Dependensi
Buka terminal di folder project ini:
```bash
npm install
```

### 3. Jalankan Frontend
```bash
npm run dev
```
Frontend akan terbuka di **`http://localhost:3000`**.

Karena keduanya berjalan di komputer lokal Anda (`http://localhost:3000` dan `http://localhost:3001`), koneksi `POST /images/transform` langsung terhubung tanpa kendala browser HTTPS Mixed Content.

---

## 📁 Struktur Folder

```
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── Header.tsx           # Navbar, Live/Demo toggle, Backend URL config & Download ZIP
│   │   ├── StepNavigation.tsx   # Wizard progress bar (Step 1, 2, 3)
│   │   ├── UploadView.tsx       # Step 1: Upload single/multiple image + .txt atau folder image/ & annotation/
│   │   ├── ConfigView.tsx       # Step 2: Konfigurasi augmentasi & slider rotasi CCW/CW, crop, scale, lighting
│   │   ├── TransformView.tsx    # Step 3: Dispatch pipeline, auto-fallback, gallery, YOLO bbox visualizer
│   │   └── YoloPreviewModal.tsx # Interactive canvas bounding box inspector
│   ├── utils/
│   │   ├── apiService.ts        # Multipart form-data generator, curl generator & ZIP unpacker
│   │   ├── augmentationSchema.ts# Schema JSON canonical sesuai spesifikasi backend Go
│   │   ├── fileValidation.ts    # Validasi 1:1 stem matching, format file, & koordinat YOLO
│   │   ├── sampleData.ts        # Synthetic dataset generator untuk test 1-klik
│   │   └── yoloParser.ts        # Parsing & formatting file YOLO txt (class_id x_center y_center width height)
│   ├── App.tsx             # State utama aplikasi
│   ├── index.css           # Tailwind CSS imports
│   └── main.tsx            # React root entry
├── index.html              # HTML template
├── package.json            # NPM dependencies & scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build & dev config
```

---

## ⚙️ Fitur Utama

1. **Step 1: Upload & Pairing**
   - Mendukung upload file perorangan (`.png`, `.jpg`, `.jpeg`, `.txt`) atau upload folder dengan subfolder `image/` dan `annotation/`.
   - Validasi ketat 1:1 stem pairing (`image_1.png` ↔ `image_1.txt`).
   - Tombol hapus individual per baris.

2. **Step 2: Konfigurasi Augmentasi**
   - Format output global (`png`, `jpg`, `jpeg`) diatur di bagian atas.
   - Semua teknik default bernilai `0` / belum dipilih.
   - Slider interaktif untuk setiap teknik:
     - **Rotation**: Slider terpisah untuk sudut kiri (CCW negatif) dan sudut kanan (CW positif) serta tombol preset cepat (`±5°`, `±15°`, `±30°`, `±45°`, `±90°`, `Reset 0°`).
     - **Random Scale, Random Crop, Fixed Resize, Brightness, Contrast, Saturation, Hue, Exposure, Blur, Noise**.
   - Inspector JSON metadata dan equivalent `curl` command.

3. **Step 3: Eksekusi & Download**
   - Mengirim request `POST /images/transform` dengan `multipart/form-data`:
     - `image`: file gambar berulang
     - `annotation`: file txt YOLO berulang
     - `metadata`: string JSON canonical
   - Menerima binary `results.zip`.
   - Unpack otomatis file ZIP di browser untuk melihat preview galeri dan inspeksi bounding box YOLO.
