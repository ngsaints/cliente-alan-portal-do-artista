import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X, ZoomIn, ZoomOut, Move } from "lucide-react";

interface ImageCropProps {
  imageFile: File;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  outputWidth?: number;
  outputHeight?: number;
}

export function ImageCrop({ imageFile, onCropComplete, onCancel, outputWidth = 400, outputHeight = 400 }: ImageCropProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragging(true);
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  }, [offset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [dragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
  }, []);

  const handleConfirm = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d")!;

      const displaySize = Math.min(280, window.innerWidth - 80);
      const ratio = img.width / displaySize;

      const sx = (-offset.x / scale) * ratio;
      const sy = (-offset.y / scale) * ratio;
      const sWidth = (displaySize / scale) * ratio;
      const sHeight = (displaySize / scale) * ratio;

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const croppedFile = new File([blob], imageFile.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          onCropComplete(croppedFile);
        },
        "image/jpeg",
        0.85
      );
    };
    img.src = imgSrc;
  }, [imgSrc, offset, scale, outputWidth, outputHeight, onCropComplete, imageFile]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Ajustar foto de perfil</p>
        <div className="flex items-center gap-1">
          <Move className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Arraste para posicionar</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative mx-auto overflow-hidden rounded-2xl border-2 border-primary/30 shadow-lg cursor-move"
        style={{ width: 280, height: 280 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {imgSrc && (
          <img
            src={imgSrc}
            alt="Preview"
            draggable={false}
            className="absolute select-none"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "0 0",
              width: 280,
              height: "auto",
              minHeight: 280,
              objectFit: "cover",
            }}
          />
        )}
        <div className="absolute inset-0 rounded-2xl pointer-events-none border-4 border-white/20" />
        <div className="absolute inset-0 pointer-events-none" style={{
          boxShadow: "inset 0 0 0 1000px rgba(0,0,0,0.3)",
          WebkitMask: "radial-gradient(circle 120px at center, black 70%, transparent 71%)",
          mask: "radial-gradient(circle 120px at center, black 70%, transparent 71%)",
        }} />
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setScale(Math.max(0.5, scale - 0.1))}
          className="p-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(Math.min(3, scale + 0.1))}
          className="p-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Confirmar
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
