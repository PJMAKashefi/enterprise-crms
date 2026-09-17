import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Check,
  Sparkles,
  Sliders,
  RotateCcw,
  Eye,
  PenTool,
  AlertCircle,
  FileImage,
} from 'lucide-react';
import {
  enhanceSignaturePhoto,
  SignatureProcessingOptions,
  DEFAULT_ENHANCE_OPTIONS,
} from '../utils/signatureEnhancer';

interface SignatureEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (dataUrl: string) => void;
  currentSignatureUrl?: string;
}

export const SignatureEnhancerModal: React.FC<SignatureEnhancerModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentSignatureUrl,
}) => {
  const [sourceImage, setSourceImage] = useState<string | null>(
    currentSignatureUrl || null
  );
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [options, setOptions] = useState<SignatureProcessingOptions>(
    DEFAULT_ENHANCE_OPTIONS
  );
  const [enhancedDataUrl, setEnhancedDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewBg, setPreviewBg] = useState<'white' | 'checker' | 'slate'>('white');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process when source image or options change
  useEffect(() => {
    if (!sourceImage) return;

    let isMounted = true;
    setIsProcessing(true);

    enhanceSignaturePhoto(sourceImage, options)
      .then((res) => {
        if (isMounted) {
          setEnhancedDataUrl(res.dataUrl);
          setIsProcessing(false);
        }
      })
      .catch((err) => {
        console.error('Enhancement error:', err);
        if (isMounted) {
          setIsProcessing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sourceImage, options]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setSourceFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSourceImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleApply = () => {
    if (enhancedDataUrl) {
      onApply(enhancedDataUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Enhance & Clean Authentic Signature Photo
              </h3>
              <p className="text-[11px] text-slate-500">
                Develops photo quality and removes paper background into transparency without altering your authentic handwriting strokes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-sky-500 bg-sky-50/50 ring-4 ring-sky-100'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="h-10 w-10 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-600">
                <Upload className="h-5 w-5 text-sky-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800">
                  {sourceFileName ? (
                    <span className="text-sky-700 font-mono">{sourceFileName}</span>
                  ) : (
                    'Click to select or drag & drop your signature photo (Sign 1 or Sign 2)'
                  )}
                </p>
                <p className="text-[11px] text-slate-500">
                  Supports JPG, PNG, or mobile camera photos of your handwritten signature
                </p>
              </div>
            </div>
          </div>

          {sourceImage && (
            <>
              {/* Enhancement Controls */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-sky-600" />
                    Quality & Transparency Adjustments
                  </span>
                  <button
                    onClick={() => setOptions(DEFAULT_ENHANCE_OPTIONS)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 underline"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset to Defaults
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Background removal threshold */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Paper Background Removal</span>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {options.threshold} / 255
                      </span>
                    </div>
                    <input
                      type="range"
                      min="140"
                      max="240"
                      value={options.threshold}
                      onChange={(e) =>
                        setOptions({ ...options, threshold: Number(e.target.value) })
                      }
                      className="w-full accent-sky-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>Gentle (Dark paper)</span>
                      <span>Aggressive (Bright clean)</span>
                    </div>
                  </div>

                  {/* Contrast Boost */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Ink Contrast & Density</span>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {options.contrast.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="1.8"
                      step="0.05"
                      value={options.contrast}
                      onChange={(e) =>
                        setOptions({ ...options, contrast: Number(e.target.value) })
                      }
                      className="w-full accent-sky-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>Natural / Soft</span>
                      <span>Deep / Bold Ink</span>
                    </div>
                  </div>
                </div>

                {/* Color Mode Selection */}
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="block text-xs font-semibold text-slate-700 mb-2">
                    Ink Tone & Color Treatment:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: 'original',
                        label: 'Original Ink',
                        desc: 'Preserves exact photo pen color',
                      },
                      {
                        id: 'black',
                        label: 'Executive Black',
                        desc: 'Formal deep black legal standard',
                      },
                      {
                        id: 'blue',
                        label: 'Royal Blue Pen',
                        desc: 'Classic ballpoint ink tone',
                      },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          setOptions({
                            ...options,
                            colorMode: mode.id as SignatureProcessingOptions['colorMode'],
                          })
                        }
                        className={`p-2.5 rounded-lg text-left border transition-all ${
                          options.colorMode === mode.id
                            ? 'border-sky-600 bg-sky-50/50 ring-1 ring-sky-500'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="block text-xs font-bold text-slate-900">
                          {mode.label}
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {mode.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Comparison */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Enhanced Transparent Live Preview
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span>Preview Canvas:</span>
                    <button
                      type="button"
                      onClick={() => setPreviewBg('white')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        previewBg === 'white'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Stationery Paper
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewBg('checker')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        previewBg === 'checker'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Transparency Grid
                    </button>
                  </div>
                </div>

                <div
                  className={`relative rounded-xl border border-slate-300 min-h-[160px] flex items-center justify-center p-6 transition-all ${
                    previewBg === 'white'
                      ? 'bg-white shadow-inner'
                      : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100'
                  }`}
                >
                  {isProcessing ? (
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                      Cleaning background & sharpening authentic strokes...
                    </div>
                  ) : enhancedDataUrl ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={enhancedDataUrl}
                        alt="Enhanced Authentic Signature"
                        className="max-h-28 max-w-full object-contain pointer-events-none select-none drop-shadow-2xs"
                      />
                      <div className="mt-3 text-[10px] font-mono text-slate-400 bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200">
                        100% Authentic Handwriting Strokes Preserved • Transparent Background Ready
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={!enhancedDataUrl || isProcessing}
            className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Check className="h-4 w-4 stroke-[2.5]" />
            Apply Authentic Signature to App
          </button>
        </div>
      </div>
    </div>
  );
};
