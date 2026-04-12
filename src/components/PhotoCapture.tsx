import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RotateCcw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PhotoCaptureProps {
  isOpen: boolean;
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

export const PhotoCapture = ({ isOpen, onCapture, onClose }: PhotoCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const startCamera = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions.");
    } finally {
      setIsStarting(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-[60] flex flex-col"
    >
      <div className="p-4 flex items-center justify-between text-white">
        <h2 className="font-bold">Snap Evidence</h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
        {isStarting && (
          <div className="flex flex-col items-center gap-4 text-white">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Initializing Camera...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-white">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={startCamera}
              className="px-6 py-2 bg-white text-black font-bold rounded-xl"
            >
              Try Again
            </button>
          </div>
        )}

        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className={`w-full h-full object-cover ${capturedImage || isStarting || error ? 'hidden' : 'block'}`}
        />

        {capturedImage && (
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="p-8 bg-black flex items-center justify-center gap-12">
        {!capturedImage ? (
          <button 
            onClick={takePhoto}
            disabled={isStarting || !!error}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50 disabled:scale-100"
          >
            <div className="w-16 h-16 border-4 border-black rounded-full" />
          </button>
        ) : (
          <>
            <button 
              onClick={handleRetake}
              className="flex flex-col items-center gap-2 text-white group"
            >
              <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center group-active:scale-90 transition-transform">
                <RotateCcw className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Retake</span>
            </button>
            <button 
              onClick={handleConfirm}
              className="flex flex-col items-center gap-2 text-white group"
            >
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center group-active:scale-90 transition-transform shadow-lg shadow-blue-600/40">
                <Check className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Confirm</span>
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};
