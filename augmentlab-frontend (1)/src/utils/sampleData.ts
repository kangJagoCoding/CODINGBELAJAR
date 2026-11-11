type ShapeDef =
  | { type: 'rect'; x: number; y: number; w: number; h: number; classId: number; label: string }
  | { type: 'circle'; x: number; y: number; r: number; classId: number; label: string }
  | { type: 'polygon'; x: number; y: number; w: number; h: number; classId: number; label: string }
  | { type: 'person'; x: number; y: number; w: number; h: number; classId: number; label: string };

interface SampleDef {
  stem: string;
  title: string;
  bgColor: string;
  boxColor: string;
  shapes: ShapeDef[];
  yolo: string;
}

/**
 * Generates sample test images and YOLO annotations as real browser File objects
 * for rapid 1-click testing and verification.
 */
export async function createSampleDataset(): Promise<{ images: File[]; annotations: File[] }> {
  const samples: SampleDef[] = [
    {
      stem: 'image_1',
      title: 'Rover Vehicle',
      bgColor: '#1e293b',
      boxColor: '#38bdf8',
      shapes: [
        { type: 'rect', x: 0.25, y: 0.35, w: 0.5, h: 0.35, classId: 0, label: 'Vehicle' },
        { type: 'circle', x: 0.35, y: 0.65, r: 0.08, classId: 1, label: 'Wheel' },
        { type: 'circle', x: 0.65, y: 0.65, r: 0.08, classId: 1, label: 'Wheel' },
      ],
      yolo: '0 0.500000 0.525000 0.500000 0.350000\n1 0.350000 0.650000 0.160000 0.160000\n1 0.650000 0.650000 0.160000 0.160000',
    },
    {
      stem: 'image_2',
      title: 'Traffic Sign',
      bgColor: '#0f172a',
      boxColor: '#f59e0b',
      shapes: [
        { type: 'polygon', classId: 2, label: 'Stop Sign', x: 0.5, y: 0.45, w: 0.4, h: 0.4 },
        { type: 'rect', classId: 3, label: 'Post', x: 0.46, y: 0.65, w: 0.08, h: 0.3 },
      ],
      yolo: '2 0.500000 0.450000 0.400000 0.400000\n3 0.500000 0.800000 0.080000 0.300000',
    },
    {
      stem: 'image_3',
      title: 'Pedestrian Crossing',
      bgColor: '#18181b',
      boxColor: '#10b981',
      shapes: [
        { type: 'person', classId: 4, label: 'Pedestrian', x: 0.5, y: 0.5, w: 0.25, h: 0.65 },
      ],
      yolo: '4 0.500000 0.500000 0.250000 0.650000',
    },
  ];

  const images: File[] = [];
  const annotations: File[] = [];

  for (const s of samples) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = s.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines for dataset feel
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw objects
    for (const shape of s.shapes) {
      if (shape.type === 'rect') {
        ctx.fillStyle = s.boxColor;
        ctx.fillRect(shape.x * canvas.width, shape.y * canvas.height, shape.w * canvas.width, shape.h * canvas.height);
      } else if (shape.type === 'circle') {
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(shape.x * canvas.width, shape.y * canvas.height, shape.r * canvas.width, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape.type === 'polygon') {
        ctx.fillStyle = '#ef4444';
        const cx = shape.x * canvas.width;
        const cy = shape.y * canvas.height;
        const r = (shape.w * canvas.width) / 2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const px = cx + r * Math.cos(angle);
          const py = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (shape.type === 'person') {
        ctx.fillStyle = '#10b981';
        // Head
        ctx.beginPath();
        ctx.arc(shape.x * canvas.width, (shape.y - 0.22) * canvas.height, 16, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillRect((shape.x - 0.08) * canvas.width, (shape.y - 0.12) * canvas.height, 0.16 * canvas.width, 0.45 * canvas.height);
      }
    }

    // Label watermark
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(`${s.title} (${s.stem})`, 16, 32);

    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/png'));
    const imgFile = new File([blob], `${s.stem}.png`, { type: 'image/png' });
    const annotFile = new File([s.yolo], `${s.stem}.txt`, { type: 'text/plain' });

    images.push(imgFile);
    annotations.push(annotFile);
  }

  return { images, annotations };
}
