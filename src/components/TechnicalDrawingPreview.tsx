import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  FileCheck,
  Building2,
  Calendar,
  Eye,
} from 'lucide-react';
import { TechnicalDocument } from '../types';

interface TechnicalDrawingPreviewProps {
  document: TechnicalDocument;
}

export const TechnicalDrawingPreview: React.FC<TechnicalDrawingPreviewProps> = ({ document }) => {
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  // Derive schematic elements based on discipline
  const isProcess = document.discipline === 'PRC';
  const isElectrical = document.discipline === 'ELE';
  const isPiping = document.discipline === 'PIP';
  const isCivil = document.discipline === 'CIV';

  return (
    <div
      className={`flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-800 text-slate-100 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'h-[440px]'
      }`}
    >
      {/* CAD Canvas Toolbar */}
      <div className="bg-slate-950/90 px-3.5 py-2 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold text-slate-300">
            CAD/DWG Vector Previewer — ISO-A1 (Scale 1:50)
          </span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-mono font-semibold">
            {document.currentRevision}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Layer toggles */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
              showGrid ? 'bg-blue-900/60 text-blue-300 border border-blue-700' : 'bg-slate-800 text-slate-400'
            }`}
            title="Toggle Engineering Grid"
          >
            Grid
          </button>
          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
              showDimensions ? 'bg-blue-900/60 text-blue-300 border border-blue-700' : 'bg-slate-800 text-slate-400'
            }`}
            title="Toggle Dimension Lines"
          >
            Dimensions
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Zoom controls */}
          <button
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] font-mono text-slate-400 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* CAD Canvas Visual Stage */}
      <div className="flex-1 relative overflow-auto bg-[#0a1120] flex items-center justify-center p-6 select-none">
        {/* Transform container */}
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="transition-transform duration-100 ease-out"
        >
          {/* Engineering Drawing Sheet (ISO A1 Aspect 841 x 594 scaled) */}
          <div className="relative w-[780px] h-[520px] bg-[#0c1527] border-2 border-slate-700 shadow-2xl overflow-hidden rounded-xs">
            {/* SVG Engineering Drawing Schematic */}
            <svg className="w-full h-full" viewBox="0 0 780 520">
              <defs>
                {/* Engineering Grid Pattern */}
                <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
                <pattern id="cadMajorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#334155" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Grid Background */}
              {showGrid && (
                <>
                  <rect width="780" height="520" fill="url(#cadGrid)" />
                  <rect width="780" height="520" fill="url(#cadMajorGrid)" />
                </>
              )}

              {/* Drawing Border (standard ISO margin) */}
              <rect x="20" y="20" width="740" height="480" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
              <rect x="25" y="25" width="730" height="470" fill="none" stroke="#0284c7" strokeWidth="0.75" />

              {/* Centerlines */}
              <line x1="390" y1="25" x2="390" y2="495" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="8 3 2 3" opacity="0.4" />
              <line x1="25" y1="260" x2="755" y2="260" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="8 3 2 3" opacity="0.4" />

              {/* Discipline-specific engineering schematics */}
              {isProcess ? (
                /* P&ID / Process Flow Diagram */
                <g stroke="#38bdf8" strokeWidth="1.5" fill="none">
                  {/* Vessel 1 */}
                  <rect x="100" y="140" width="100" height="220" rx="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <text x="150" y="240" fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">V-101</text>
                  <text x="150" y="255" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="sans-serif">DE-ETHANIZER</text>

                  {/* Vessel 2 */}
                  <rect x="340" y="100" width="120" height="280" rx="30" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <text x="400" y="235" fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">C-102</text>
                  <text x="400" y="250" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="sans-serif">MAIN FRACTIONATOR</text>

                  {/* Pumps */}
                  <circle cx="270" cy="380" r="22" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <path d="M 255 370 L 285 370 L 270 395 Z" fill="#38bdf8" />
                  <text x="270" y="415" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">P-101A/B</text>

                  {/* Heat Exchanger */}
                  <circle cx="270" cy="180" r="26" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <path d="M 250 180 Q 260 165, 270 180 T 290 180" stroke="#f59e0b" strokeWidth="2" fill="none" />
                  <text x="270" y="150" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">E-101</text>

                  {/* Process Piping Lines */}
                  <path d="M 200 200 L 244 180 M 296 180 L 340 160" stroke="#38bdf8" strokeWidth="2.5" />
                  <path d="M 150 360 L 150 380 L 248 380" stroke="#38bdf8" strokeWidth="2.5" />
                  <path d="M 292 380 L 340 380 L 340 320" stroke="#38bdf8" strokeWidth="2.5" />
                  <path d="M 400 100 L 400 60 L 520 60" stroke="#38bdf8" strokeWidth="2.5" />

                  {/* Valve symbols */}
                  <polygon points="215,195 215,205 225,200" fill="#38bdf8" />
                  <polygon points="235,195 235,205 225,200" fill="#38bdf8" />
                </g>
              ) : isElectrical ? (
                /* Electrical Single Line Diagram (SLD) */
                <g stroke="#f59e0b" strokeWidth="1.5" fill="none">
                  {/* Incoming Bus 33kV */}
                  <line x1="80" y1="80" x2="680" y2="80" stroke="#ef4444" strokeWidth="3" />
                  <text x="90" y="70" fill="#ef4444" fontSize="11" fontWeight="bold" fontFamily="monospace">33kV INCOMING BUS A</text>

                  {/* Transformer 1 */}
                  <circle cx="200" cy="150" r="22" stroke="#f59e0b" strokeWidth="2" />
                  <circle cx="200" cy="180" r="22" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="200" y1="80" x2="200" y2="128" stroke="#ef4444" strokeWidth="2" />
                  <text x="240" y="165" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">TR-01 (10MVA 33/6.6kV)</text>

                  {/* Transformer 2 */}
                  <circle cx="480" cy="150" r="22" stroke="#f59e0b" strokeWidth="2" />
                  <circle cx="480" cy="180" r="22" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="480" y1="80" x2="480" y2="128" stroke="#ef4444" strokeWidth="2" />
                  <text x="520" y="165" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">TR-02 (10MVA 33/6.6kV)</text>

                  {/* Medium Voltage Bus 6.6kV */}
                  <line x1="120" y1="260" x2="560" y2="260" stroke="#38bdf8" strokeWidth="3" />
                  <line x1="200" y1="202" x2="200" y2="260" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="480" y1="202" x2="480" y2="260" stroke="#38bdf8" strokeWidth="2" />
                  <text x="130" y="250" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace">6.6kV SWG-01 BUSBAR</text>

                  {/* Motor Feeders */}
                  <line x1="260" y1="260" x2="260" y2="340" stroke="#10b981" strokeWidth="2" />
                  <circle cx="260" cy="360" r="20" stroke="#10b981" strokeWidth="2" />
                  <text x="260" y="365" fill="#10b981" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">M</text>
                  <text x="260" y="395" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="sans-serif">M-101A (450kW)</text>
                </g>
              ) : isPiping ? (
                /* Piping Isometric Schematic */
                <g stroke="#38bdf8" strokeWidth="2" fill="none">
                  {/* Isometric line */}
                  <path d="M 120 320 L 260 220 L 260 140 L 460 140 L 560 210 L 560 340" />
                  {/* Flanges */}
                  <line x1="110" y1="312" x2="130" y2="328" stroke="#f59e0b" strokeWidth="4" />
                  <line x1="550" y1="332" x2="570" y2="348" stroke="#f59e0b" strokeWidth="4" />
                  {/* Valve in line */}
                  <polygon points="340,135 340,145 355,140" fill="#38bdf8" />
                  <polygon points="370,135 370,145 355,140" fill="#38bdf8" />
                  <line x1="355" y1="140" x2="355" y2="120" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="355" cy="118" r="5" stroke="#38bdf8" strokeWidth="1.5" />
                  {/* Annotations */}
                  <text x="355" y="105" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">10"-PR-1021-A1</text>
                </g>
              ) : (
                /* Mechanical GA / Civil Foundation Plan */
                <g stroke="#38bdf8" strokeWidth="1.5" fill="none">
                  {/* Equipment Foundation Concrete Pad */}
                  <rect x="120" y="120" width="440" height="260" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="6 4" />
                  <text x="130" y="140" fill="#0ea5e9" fontSize="10" fontWeight="bold" fontFamily="monospace">CONCRETE FOUNDATION (EL. +100.250)</text>

                  {/* Pump Casing */}
                  <rect x="200" y="160" width="160" height="180" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                  <circle cx="280" cy="250" r="50" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="280" cy="250" r="20" stroke="#f59e0b" strokeWidth="1.5" />

                  {/* Electric Motor Coupling */}
                  <rect x="380" y="190" width="140" height="120" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="360" y1="250" x2="380" y2="250" stroke="#f59e0b" strokeWidth="5" />
                  <text x="450" y="255" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">ELECTRIC MOTOR</text>
                  <text x="280" y="255" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">PUMP P-101</text>

                  {/* Suction Nozzle */}
                  <rect x="250" y="100" width="60" height="60" stroke="#38bdf8" strokeWidth="2" fill="#0f172a" />
                  <text x="280" y="90" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">SUCTION 12" 150#</text>

                  {/* Discharge Nozzle */}
                  <rect x="140" y="220" width="60" height="60" stroke="#38bdf8" strokeWidth="2" fill="#0f172a" />
                  <text x="110" y="255" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">DISCH 8"</text>
                </g>
              )}

              {/* Dimension Lines (when enabled) */}
              {showDimensions && (
                <g stroke="#94a3b8" strokeWidth="1" fill="none">
                  {/* Top overall dimension */}
                  <line x1="120" y1="80" x2="560" y2="80" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                  <line x1="120" y1="75" x2="120" y2="120" strokeDasharray="2 2" />
                  <line x1="560" y1="75" x2="560" y2="120" strokeDasharray="2 2" />
                  <text x="340" y="72" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">5,400 mm</text>

                  {/* Side overall dimension */}
                  <line x1="70" y1="120" x2="70" y2="380" />
                  <line x1="65" y1="120" x2="120" y2="120" strokeDasharray="2 2" />
                  <line x1="65" y1="380" x2="120" y2="380" strokeDasharray="2 2" />
                  <text x="60" y="255" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace" transform="rotate(-90 60 255)">3,200 mm</text>
                </g>
              )}

              {/* Standard ISO 7200 / Aconex Engineering Title Block (Bottom-Right Corner) */}
              <g transform="translate(480, 395)">
                {/* Outer title block border */}
                <rect x="0" y="0" width="270" height="100" fill="#070d19" stroke="#38bdf8" strokeWidth="1.5" />

                {/* Subdividing grid */}
                <line x1="0" y1="30" x2="270" y2="30" stroke="#1e293b" strokeWidth="1" />
                <line x1="0" y1="65" x2="270" y2="65" stroke="#1e293b" strokeWidth="1" />
                <line x1="180" y1="0" x2="180" y2="30" stroke="#1e293b" strokeWidth="1" />
                <line x1="135" y1="65" x2="135" y2="100" stroke="#1e293b" strokeWidth="1" />
                <line x1="210" y1="65" x2="210" y2="100" stroke="#1e293b" strokeWidth="1" />

                {/* Organization & Project */}
                <text x="8" y="14" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="sans-serif">PJMAK INTEGRATED SYSTEMS</text>
                <text x="8" y="24" fill="#cbd5e1" fontSize="8" fontFamily="sans-serif">{document.clientCompany} • {document.projectCode}</text>

                {/* Revision & Status in Header */}
                <text x="188" y="14" fill="#94a3b8" fontSize="7" fontWeight="bold">REV:</text>
                <text x="215" y="16" fill="#38bdf8" fontSize="12" fontWeight="bold" fontFamily="monospace">{document.currentRevision}</text>
                <text x="188" y="26" fill="#10b981" fontSize="7" fontWeight="bold">{document.reviewStatus.toUpperCase()}</text>

                {/* Drawing Title */}
                <text x="8" y="42" fill="#94a3b8" fontSize="7" fontWeight="bold">DRAWING / DOCUMENT TITLE:</text>
                <text x="8" y="55" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                  {document.title.length > 36 ? document.title.slice(0, 36) + '...' : document.title}
                </text>

                {/* Document Number */}
                <text x="8" y="76" fill="#94a3b8" fontSize="7" fontWeight="bold">DOCUMENT NUMBER:</text>
                <text x="8" y="90" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  {document.documentNumber}
                </text>

                {/* Scale & Sheet */}
                <text x="142" y="76" fill="#94a3b8" fontSize="7" fontWeight="bold">SCALE:</text>
                <text x="142" y="90" fill="#f8fafc" fontSize="9" fontFamily="monospace">1:50</text>

                <text x="216" y="76" fill="#94a3b8" fontSize="7" fontWeight="bold">SHEET:</text>
                <text x="216" y="90" fill="#f8fafc" fontSize="9" fontFamily="monospace">1 OF 1</text>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>Format: <strong>{document.fileFormat?.toUpperCase() || 'DWG (CAD)'}</strong></span>
          <span>Discipline: <strong>{document.discipline}</strong></span>
          <span>Reason: <strong>{document.reasonForIssue}</strong></span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
          <span>Security Watermark: Controlled PJMAK Internal Access</span>
        </div>
      </div>
    </div>
  );
};
