"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, SwitchCamera, Zap, ZapOff, AlertCircle } from "lucide-react";

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
  continuous?: boolean;
}

export default function CameraBarcodeScanner({
  isOpen,
  onClose,
  onScan,
  continuous = true,
}: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>("");
  const lastScanTimestampRef = useRef<number>(0);

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);

  // Play subtle beep sound on successful scan using Web Audio API
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, []);

  const stopMediaStream = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleBarcodeDetection = useCallback(
    (code: string) => {
      const now = Date.now();
      // Debounce identical scans within 1.5 seconds to prevent spam
      if (code === lastScannedCodeRef.current && now - lastScanTimestampRef.current < 1500) {
        return;
      }

      lastScannedCodeRef.current = code;
      lastScanTimestampRef.current = now;

      playBeep();
      setLastScannedFeedback(code);
      setTimeout(() => setLastScannedFeedback(null), 1200);

      onScan(code);

      if (!continuous) {
        stopMediaStream();
        onClose();
      }
    },
    [continuous, onScan, onClose, playBeep, stopMediaStream]
  );

  const startDetectionLoop = useCallback(() => {
    // Check if BarcodeDetector is supported natively in browser
    const BarcodeDetectorClass = (window as unknown as {
      BarcodeDetector?: new (options?: { formats: string[] }) => {
        detect: (image: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
      };
    }).BarcodeDetector;

    let detector: { detect: (image: ImageBitmapSource) => Promise<{ rawValue: string }[]> } | null = null;
    if (BarcodeDetectorClass) {
      try {
        detector = new BarcodeDetectorClass({
          formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "code_39", "qr_code"],
        });
      } catch {
        detector = null;
      }
    }

    const scanFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameIdRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      if (detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            handleBarcodeDetection(barcodes[0].rawValue);
          }
        } catch {
          // Frame error, continue
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [handleBarcodeDetection]);

  const startCamera = useCallback(async () => {
    stopMediaStream();
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Camera API is not supported on this browser or device.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined;
        setTorchSupported(Boolean(capabilities?.torch));

        // Start frame detector loop
        startDetectionLoop();
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setErrorMessage("Camera permission was denied. Please allow camera access in browser settings.");
      } else {
        setErrorMessage(error.message || "Failed to start camera. Please ensure no other app is using it.");
      }
    }
  }, [facingMode, startDetectionLoop, stopMediaStream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopMediaStream();
    }
    return () => {
      stopMediaStream();
    };
  }, [isOpen, startCamera, stopMediaStream]);

  async function toggleTorch() {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const newStatus = !torchOn;
      await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: newStatus }],
      });
      setTorchOn(newStatus);
    } catch {
      // Torch failure
    }
  }

  function toggleCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="bg-gray-950 border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-green-500/20 text-green-400">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Scan Barcode</h2>
              <p className="text-xs text-gray-400">Position barcode within the frame</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopMediaStream();
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Viewfinder */}
        <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          {errorMessage ? (
            <div className="p-6 text-center text-red-400 space-y-2">
              <AlertCircle size={32} className="mx-auto text-red-500" />
              <p className="text-sm font-semibold">{errorMessage}</p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                Retry Camera
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                <div className="w-64 h-36 border-2 border-green-500/80 rounded-2xl relative shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-pulse">
                  {/* Laser Scan Line */}
                  <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444]" />
                </div>
              </div>

              {/* Scanned Feedback Pill */}
              {lastScannedFeedback && (
                <div className="absolute top-4 bg-green-500 text-black px-4 py-1.5 rounded-full text-xs font-bold shadow-lg animate-bounce">
                  Scanned: {lastScannedFeedback}
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-between gap-3 bg-gray-950 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleCamera}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Switch Front/Back Camera"
            >
              <SwitchCamera size={18} />
              <span className="hidden sm:inline">Switch Camera</span>
            </button>

            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2.5 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium ${
                  torchOn ? "bg-yellow-500 text-black font-bold" : "bg-white/10 hover:bg-white/20 text-white"
                }`}
                title="Toggle Flashlight"
              >
                {torchOn ? <ZapOff size={18} /> : <Zap size={18} />}
                <span className="hidden sm:inline">{torchOn ? "Flash On" : "Flash Off"}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              stopMediaStream();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
}
