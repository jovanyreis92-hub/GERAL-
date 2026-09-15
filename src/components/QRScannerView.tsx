import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  Search,
  Building,
  User,
  Hash,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { Participant } from '../types';
import { scanCheckIn } from '../lib/api';
import { playSuccessSound } from '../lib/qr';

interface QRScannerViewProps {
  onCheckInSuccess: (participant: Participant) => void;
  onGoToRegister: () => void;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({
  onCheckInSuccess,
  onGoToRegister,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);

  // Scan states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{
    participant: Participant;
    alreadyCheckedIn: boolean;
    message: string;
  } | null>(null);

  // Manual code fallback
  const [manualCode, setManualCode] = useState<string>('');
  const [manualLoading, setManualLoading] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Start Camera
  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraError('Câmera não suportada neste navegador ou ambiente.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback with basic constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        setCameraActive(true);

        // Check torch capabilities
        const track = stream.getVideoTracks()[0];
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }

        // Begin frame analysis loop
        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.warn('Erro ao inicializar câmera:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permissão para acessar a câmera foi negada. Conceda permissão no navegador.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Nenhuma câmera foi detectada no dispositivo.');
      } else {
        setCameraError('Não foi possível iniciar a câmera. Use o upload de imagem ou busca manual.');
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const newState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: newState }],
        });
        setTorchOn(newState);
      } catch (err) {
        console.error('Torch error:', err);
      }
    }
  };

  // Switch between back and front camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Process decoded code
  const handleCodeFound = async (code: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const response = await scanCheckIn(code);

      // Play success chime & vibrate phone
      playSuccessSound();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([120, 60, 120]);
      }

      setScanResult(response);
      onCheckInSuccess(response.participant);
    } catch (err: any) {
      console.error('Erro na validação do QR:', err);
      setCameraError(err.message || 'Código QR não reconhecido.');
      // Auto clear error after 3 seconds so user can try again
      setTimeout(() => setCameraError(null), 3500);
      setIsProcessing(false);
    }
  };

  // Continuous frame scanning loop
  const tick = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      if (cameraActive) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);

      // Analyze with jsQR (attemptBoth allows reading standard and dark/inverted phone screens)
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (qrCode && qrCode.data) {
        handleCodeFound(qrCode.data);
        return; // Pause scanning while showing result
      }
    }

    if (!isProcessing) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  };

  // Handle image upload from file or phone gallery
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

        if (qrCode && qrCode.data) {
          handleCodeFound(qrCode.data);
        } else {
          setCameraError('Nenhum código QR detectado na imagem enviada.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Manual Check-in by typing
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setManualError(null);
    setManualLoading(true);

    try {
      const res = await scanCheckIn(manualCode.trim());
      playSuccessSound();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      setScanResult(res);
      onCheckInSuccess(res.participant);
      setManualCode('');
    } catch (err: any) {
      setManualError(err.message || 'Participante não localizado com esta matrícula.');
    } finally {
      setManualLoading(false);
    }
  };

  // Resume scanning for next participant
  const handleScanNext = () => {
    setScanResult(null);
    setIsProcessing(false);
    if (cameraActive) {
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      startCamera();
    }
  };

  // Mount/Unmount effect
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Scanner Container */}
      <div className="bg-slate-900 text-white rounded-3xl overflow-hidden shadow-xl border border-slate-800 flex flex-col">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">Leitor de QR Code</h2>
              <p className="text-xs text-slate-400">Aponte para a credencial do participante</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Torch button (if supported) */}
            {torchSupported && cameraActive && (
              <button
                id="btn-scanner-torch"
                onClick={toggleTorch}
                className={`p-2 rounded-xl transition-colors ${
                  torchOn ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Ligar/Desligar Lanterna"
              >
                {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            )}

            {/* Switch Camera */}
            {cameraActive && (
              <button
                id="btn-scanner-switch-cam"
                onClick={toggleFacingMode}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Alternar Câmera (Traseira/Frontal)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}

            {/* Start/Stop Camera */}
            <button
              id="btn-scanner-toggle-power"
              onClick={() => (cameraActive ? stopCamera() : startCamera())}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={cameraActive ? 'Pausar Câmera' : 'Ativar Câmera'}
            >
              {cameraActive ? <Camera className="w-4 h-4 text-emerald-400" /> : <CameraOff className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Video Viewport Area */}
        <div className="relative aspect-4/3 sm:aspect-16/10 bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            muted
            playsInline
          />

          {/* Offscreen canvas reference for decoding */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay Framing when camera is active */}
          {cameraActive && !scanResult && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              {/* Darkened mask around viewfinder */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-emerald-400/80 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                {/* Viewfinder corner accents */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                {/* Animated Laser Scanning Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse absolute top-1/2 -translate-y-1/2" />
              </div>

              <span className="mt-4 px-3 py-1 bg-slate-900/80 backdrop-blur rounded-full text-xs font-medium text-emerald-300 border border-emerald-500/30">
                Posicione o código QR no centro
              </span>
            </div>
          )}

          {/* Camera Inactive / Denied Screen */}
          {!cameraActive && !scanResult && (
            <div className="text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <CameraOff className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-slate-200 text-base">Câmera em Pausa ou Indisponível</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {cameraError || 'Clique no botão abaixo para ligar a câmera do celular e escanear.'}
              </p>
              <button
                id="btn-scanner-start-cam"
                onClick={() => startCamera()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Ativar Câmera</span>
              </button>
            </div>
          )}

          {/* Success Overlay Modal inside viewfinder */}
          {scanResult && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-200">
              <div
                className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-3 shadow-lg ${
                  scanResult.alreadyCheckedIn
                    ? 'bg-sky-500 text-white'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                  scanResult.alreadyCheckedIn
                    ? 'bg-sky-900/80 text-sky-200 border border-sky-600'
                    : 'bg-emerald-900/80 text-emerald-200 border border-emerald-600'
                }`}
              >
                {scanResult.alreadyCheckedIn ? 'Presença Já Confirmada' : 'Presença Confirmada!'}
              </span>

              <h3 className="text-2xl font-bold text-white tracking-tight">
                {scanResult.participant.name}
              </h3>
              <p className="text-sky-400 text-sm font-semibold mt-0.5">
                {scanResult.participant.company}
              </p>

              <div className="mt-3 px-3 py-1 bg-slate-800 rounded-lg text-xs font-mono text-slate-300 border border-slate-700">
                Matrícula: <strong>{scanResult.participant.matricula}</strong>
              </div>

              <p className="text-xs text-slate-400 mt-2">
                Horário: {new Date().toLocaleTimeString('pt-BR')}
              </p>

              <button
                id="btn-scanner-confirm-next"
                onClick={handleScanNext}
                autoFocus
                className="mt-6 w-full max-w-xs py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Confirmar Próximo Participante</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Upload & Helper toolbar */}
        <div className="p-4 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Sinal sonoro & vibração ativados</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              id="btn-scanner-upload-img"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ler da Galeria/Foto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual Fallback Verification Form */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-sky-600" />
          <span>Confirmação Manual por Matrícula</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Caso a câmera não leia o código, digite o número da matrícula ou cole o código do participante:
        </p>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            id="input-scanner-manual-code"
            type="text"
            placeholder="Ex: 2024-8841..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
          />
          <button
            id="btn-scanner-manual-submit"
            type="submit"
            disabled={manualLoading || !manualCode.trim()}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {manualLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Confirmar</span>
          </button>
        </form>

        {manualError && (
          <p className="mt-2 text-xs text-rose-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{manualError}</span>
          </p>
        )}
      </div>
    </div>
  );
};
