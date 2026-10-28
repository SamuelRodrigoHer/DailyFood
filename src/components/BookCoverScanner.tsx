'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  RefreshCcw,
  Crop,
  Sparkles,
  Sun,
  Contrast,
  SlidersHorizontal,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookCoverScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (coverDataUrl: string) => void;
  currentCover?: string;
}

export function BookCoverScanner({
  isOpen,
  onClose,
  onApply,
  currentCover,
}: BookCoverScannerProps) {
  const [sourceImage, setSourceImage] = useState<string | null>(currentCover || null);

  // Transformaciones
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Ajustes de imagen (para que la foto parezca portada escaneada)
  const [brightness, setBrightness] = useState<number>(100); // 100 = normal
  const [contrast, setContrast] = useState<number>(105);   // 105 = contraste sutil
  const [aspectRatio, setAspectRatio] = useState<'pocket' | 'standard' | 'comic'>('standard');

  // Arrastre con dedo o ratón
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Referencias
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Dimensiones del marco según la proporción elegida
  const getTargetDimensions = useCallback(() => {
    switch (aspectRatio) {
      case 'pocket': // 1:1.6 (Libro de bolsillo)
        return { width: 375, height: 600, label: 'Bolsillo (1:1.6)' };
      case 'comic': // 1:1.35 (Novela gráfica o libro ancho)
        return { width: 440, height: 600, label: 'Ancho (1:1.35)' };
      case 'standard': // 1:1.5 (Proporción estándar)
      default:
        return { width: 400, height: 600, label: 'Estándar (1:1.5)' };
    }
  }, [aspectRatio]);

  // Cargar imagen en memoria cuando cambia la fuente
  useEffect(() => {
    if (!sourceImage) {
      imageElementRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementRef.current = img;
      // Auto-centrar con un ligero zoom inicial para que el libro llene el marco por defecto
      setPan({ x: 0, y: 0 });
      setZoom(1.05);
      setRotation(0);
      setBrightness(100);
      setContrast(105);
    };
    img.src = sourceImage;
  }, [sourceImage]);

  // Renderizar en Canvas con filtros y transformaciones
  const drawCanvas = useCallback(() => {
    const img = imageElementRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const { width: targetW, height: targetH } = getTargetDimensions();
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, targetW, targetH);

    ctx.save();

    // Aplicar filtros de realce de portada (brillo y contraste)
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Mover al centro del canvas y aplicar transformaciones
    ctx.translate(targetW / 2 + pan.x, targetH / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Si la imagen está rotada 90 o 270 grados, intercambiar dimensiones de escala
    const isRotatedSideways = rotation % 180 !== 0;
    const imgEffectiveW = isRotatedSideways ? img.height : img.width;
    const imgEffectiveH = isRotatedSideways ? img.width : img.height;

    // Escalar para cubrir el marco completamente
    const scale = Math.max(targetW / imgEffectiveW, targetH / imgEffectiveH);
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [rotation, zoom, pan, brightness, contrast, getTargetDimensions]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Manejar selección de foto
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSourceImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Puntero / Touch para mover y encuadrar
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Guardar resultado final
  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Exportar con compresión alta calidad WebP o JPEG
    const finalDataUrl = canvas.toDataURL('image/webp', 0.88);
    onApply(finalDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  const currentDims = getTargetDimensions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-3 sm:p-4 backdrop-blur-md animate-in fade-in">
      <div className="flex w-full max-w-lg flex-col rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-md shadow-violet-500/20">
              <Crop className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Encuadrar portada del libro</h2>
              <p className="text-[11px] text-neutral-500">
                Ajusta el marco para recortar la mesa y dejar solo el libro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Inputs ocultos */}
        <input
          ref={fileInputCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={fileInputGalleryRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Área de trabajo */}
        <div className="my-3.5 flex flex-col items-center">
          {!sourceImage ? (
            /* Pantalla inicial para tomar o subir foto */
            <div className="flex h-72 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-neutral-200 bg-neutral-50/70 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-100 text-violet-600 shadow-xs mb-3">
                <Camera className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-neutral-800">
                Fotografía la portada de tu libro
              </h3>
              <p className="mt-1 max-w-xs text-xs text-neutral-400">
                Tómale una foto sobre la mesa. Luego podrás recortar los bordes para que solo se vea la portada.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputCameraRef.current?.click()}
                  className="flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-700 transition"
                >
                  <Camera className="h-4 w-4" />
                  <span>Hacer foto con la cámara</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputGalleryRef.current?.click()}
                  className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
                >
                  <Upload className="h-4 w-4" />
                  <span>Subir desde el móvil/PC</span>
                </button>
              </div>
            </div>
          ) : (
            /* Visor de recorte interactivo */
            <div className="w-full space-y-3">

              {/* Marco de encuadre con aspecto de libro real */}
              <div className="relative mx-auto flex items-center justify-center overflow-hidden rounded-2xl bg-neutral-950 p-2 shadow-2xl">

                {/* Contenedor del libro */}
                <div
                  className="relative overflow-hidden rounded-r-xl rounded-l-xs shadow-2xl touch-none select-none cursor-grab active:cursor-grabbing border-2 border-violet-400/80"
                  style={{
                    width: '210px',
                    height: `${(210 * currentDims.height) / currentDims.width}px`,
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  {/* Canvas donde se dibuja la foto recortada */}
                  <canvas
                    ref={canvasRef}
                    className="h-full w-full object-cover"
                  />

                  {/* Relieve del lomo del libro */}
                  <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/50 via-white/10 to-transparent" />
                  <div className="pointer-events-none absolute left-3 top-0 bottom-0 w-0.5 bg-white/20" />

                  {/* Brillo de portada plastificada */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />

                  {/* Indicador táctil en la parte inferior */}
                  <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-xl bg-black/70 px-2 py-1 text-center text-[10px] font-bold text-white/90 backdrop-blur-xs">
                    👆 Arrastra con el dedo para centrar
                  </div>
                </div>
              </div>

              {/* Selector de proporción de libro */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-neutral-500 mr-1">Formato:</span>
                {[
                  { id: 'pocket', label: 'Bolsillo' },
                  { id: 'standard', label: 'Estándar' },
                  { id: 'comic', label: 'Ancho / Cómic' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setAspectRatio(fmt.id as any)}
                    className={cn(
                      'rounded-xl px-2.5 py-1 text-[11px] font-bold transition',
                      aspectRatio === fmt.id
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                    )}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>

              {/* Controles de Zoom y Giro */}
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">

                  {/* Control de Zoom */}
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                      className="rounded-xl border border-neutral-200 bg-white p-1.5 text-neutral-700 hover:bg-neutral-100"
                      title="Alejar"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>

                    <input
                      type="range"
                      min="0.6"
                      max="2.5"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-violet-600"
                    />

                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                      className="rounded-xl border border-neutral-200 bg-white p-1.5 text-neutral-700 hover:bg-neutral-100"
                      title="Acercar"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Botón de Giro 90º */}
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100 shadow-2xs"
                    title="Girar foto"
                  >
                    <RotateCw className="h-3.5 w-3.5 text-violet-600" />
                    <span>Girar 90°</span>
                  </button>
                </div>

                {/* Ajustes de Realce (Brillo y Contraste para escanear) */}
                <div className="border-t border-neutral-200/60 pt-2 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2 flex-1">
                    <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <input
                      type="range"
                      min="80"
                      max="130"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                      className="w-full accent-violet-600"
                      title="Brillo"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <Contrast className="h-3.5 w-3.5 text-neutral-600 shrink-0" />
                    <input
                      type="range"
                      min="90"
                      max="140"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                      className="w-full accent-violet-600"
                      title="Contraste"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setBrightness(100);
                      setContrast(105);
                      setZoom(1.05);
                      setPan({ x: 0, y: 0 });
                      setRotation(0);
                    }}
                    className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 underline"
                  >
                    Restablecer
                  </button>
                </div>
              </div>

              {/* Botón para cambiar foto */}
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={() => setSourceImage(null)}
                  className="flex items-center gap-1 text-neutral-500 hover:text-neutral-800"
                >
                  <RefreshCcw className="h-3 w-3" />
                  <span>Elegir otra foto</span>
                </button>
                <span>Solo se guardará lo que esté dentro del marco</span>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!sourceImage}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 rounded-2xl bg-violet-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-40 transition"
          >
            <Check className="h-4 w-4" />
            <span>Recortar y usar portada</span>
          </button>
        </div>

      </div>
    </div>
  );
}
