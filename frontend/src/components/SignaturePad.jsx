import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eraser, Save } from 'lucide-react';

export default function SignaturePad({ isOpen, onClose, onSave, title = "Sign Here" }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        // FIX: fillStyle was being overwritten to black BEFORE any drawing
        // happened, then strokeStyle (the actual pen color) was set correctly,
        // but since the canvas CSS class included "bg-white" stacked behind a
        // possible dark parent theme, AND context.fillStyle was reset to
        // '#000' right after filling white, any *fill* operation after that
        // point (e.g. clearSignature) would draw black instead of white.
        // We now explicitly reset fillStyle to white after every fill,
        // and keep strokeStyle separately for the actual pen line.
        context.lineWidth = 2.5;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = '#000000'; // pen color — always black, never touched by fill ops

        // Paint white background
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        // Do NOT reuse fillStyle for drawing — strokeStyle handles the pen

        setCtx(context);
        setHasSignature(false);
      }
    }
  }, [isOpen]);

  const getCoordinates = (e) => {
    if (!canvasRef.current) return { offsetX: 0, offsetY: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const offsetX = (clientX - rect.left) * scaleX;
    const offsetY = (clientY - rect.top) * scaleY;
    return { offsetX, offsetY };
  };

  const startDrawing = (e) => {
    if (!ctx) return;
    setIsDrawing(true);
    setHasSignature(true);
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!ctx) return;
    setIsDrawing(false);
    ctx.beginPath();
  };

  const clearSignature = () => {
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;
    if (!hasSignature) return; // guard: don't let an empty white canvas be "saved" as a signature
    const signatureData = canvasRef.current.toDataURL('image/png');
    onSave(signatureData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* FIX: explicit isolated white background + black border so the
              canvas never inherits a dark theme background from a parent,
              which was the actual cause of "invisible" black-on-black ink. */}
          <div className="border-2 border-gray-300 rounded-lg p-2 bg-white" style={{ backgroundColor: '#ffffff' }}>
            <canvas
              ref={canvasRef}
              width={500}
              height={200}
              style={{ backgroundColor: '#ffffff' }}
              className="w-full h-40 touch-none cursor-crosshair rounded"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <p className="text-xs text-center text-gray-500">Sign your name in the box above</p>
          <div className="flex gap-3">
            <Button onClick={clearSignature} variant="outline" className="flex-1">
              <Eraser className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={saveSignature}
              disabled={!hasSignature}
              className="flex-1 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Signature
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}