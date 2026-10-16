import React, { useState } from 'react';
import {
  FileText,
  Shield,
  CheckCircle2,
  ExternalLink,
  Anchor,
  Compass,
  Layers,
  AlertTriangle,
  Award,
  DollarSign,
  Calendar,
  Send,
  Check,
  Building,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { TechnicalDocument, ExternalAccessSession } from '../types';

interface SecureProposalContentProps {
  document: TechnicalDocument;
  currentChapter: number;
  onSelectChapter: (chapterIndex: number) => void;
  watermarkText: string;
  secureSession: ExternalAccessSession | null;
  onSecurityEvent?: (eventType: string) => void;
}

export const SecureProposalContent: React.FC<SecureProposalContentProps> = ({
  document,
  currentChapter,
  onSelectChapter,
  watermarkText,
  secureSession,
  onSecurityEvent,
}) => {
  const chapters = document.chapters && document.chapters.length > 0 ? document.chapters : [
    {
      id: 'ch-1',
      title: 'Chapter 1: Executive Summary & Project Objectives',
      content: document.description || 'Proposal Executive Summary & Scope Overview.',
    },
    {
      id: 'ch-2',
      title: 'Chapter 2: Technical Approach & Engineering Methodology',
      content: 'Detailed engineering specifications and technical execution methodology.',
    },
    {
      id: 'ch-3',
      title: 'Chapter 3: HSE & Quality Compliance Framework',
      content: 'Health, safety, environmental, and quality compliance procedures.',
    },
    {
      id: 'ch-4',
      title: 'Chapter 4: Commercial Pricing & Payment Milestones',
      content: 'Commercial pricing structure and milestone breakdown.',
    },
    {
      id: 'ch-5',
      title: 'Chapter 5: Client Evaluation Questionnaire & Formal Acceptance',
      content: 'Client feedback and tender evaluation questionnaire portal.',
      questionnaireUrl: 'https://form.jotform.com/242500000000000',
    },
  ];

  // Chapter 5 in-viewer feedback state
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackChecklist, setFeedbackChecklist] = useState({
    techCompliant: true,
    hseAccepted: true,
    commercialReviewed: true,
    scheduleFeasible: true,
  });
  const [evaluationComments, setEvaluationComments] = useState('');

  const activeChapterData = chapters[currentChapter - 1] || chapters[0];

  return (
    <div className="space-y-6">
      {/* Chapter 1: Executive Summary */}
      {currentChapter === 1 && (
        <div className="space-y-6 text-slate-800">
          {/* Executive Overview Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
            <div className="flex items-center space-x-2 text-teal-800 font-mono text-xs font-bold uppercase tracking-wider mb-2">
              <FileText className="w-4 h-4" />
              <span>Section 1.1 • Executive Brief</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Technical & Commercial Proposal: Offshore Export Cable Installation
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              PJMAK is pleased to submit this comprehensive commercial and advisory proposal to <strong>{document.clientCompany}</strong> for the strategic management, business advisory, and case services associated with the <strong>{document.projectName} ({document.projectCode})</strong> development.
            </p>
          </div>

          {/* Key Value Pillars */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono mb-3">
              Section 1.2 • Key Technical Value Propositions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/40">
                <div className="font-bold text-teal-900 mb-1 flex items-center space-x-1.5">
                  <Anchor className="w-3.5 h-3.5 text-teal-700" />
                  <span>Subsea Trenching Rig</span>
                </div>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  Utilization of high-pressure fluidization jet-sleds achieving consistent 2.0m target burial depth across dense marine clays.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/40">
                <div className="font-bold text-blue-900 mb-1 flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5 text-blue-700" />
                  <span>Verified Track Record</span>
                </div>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  Over 420 km of successfully post-lay buried HVAC/HVDC subsea inter-array and export cables in the North Sea and Baltic waters.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/40">
                <div className="font-bold text-purple-900 mb-1 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-700" />
                  <span>Zero-Harm Safety</span>
                </div>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  IMCA & DNV-ST-N001 compliance with 1.8M man-hours worked LTI-free across marine offshore operations.
                </p>
              </div>
            </div>
          </div>

          {/* Project Parameters Matrix */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono mb-2">
              Section 1.3 • Project Parameters & Scope Matrix
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 font-bold border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-200">Parameter</th>
                    <th className="p-2 border-r border-slate-200">Specified Requirement</th>
                    <th className="p-2">PJMAK Proposed Solution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-2xs">
                  <tr>
                    <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">Total Route Length</td>
                    <td className="p-2 border-r border-slate-200 font-mono">38.4 km offshore export route</td>
                    <td className="p-2 text-teal-800 font-semibold">Continuous multi-phase trenching campaign</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">Target Burial Depth</td>
                    <td className="p-2 border-r border-slate-200 font-mono">1.5m to 2.0m Top of Cable (TOC)</td>
                    <td className="p-2 text-teal-800 font-semibold">2.0m target with real-time acoustic profilometry</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">Soil Condition</td>
                    <td className="p-2 border-r border-slate-200">Glacial till, stiff clay (cu &gt; 80 kPa), sand waves</td>
                    <td className="p-2 text-teal-800 font-semibold">Hybrid mechanical cutter & jet fluidization tool</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">Installation Vessel</td>
                    <td className="p-2 border-r border-slate-200">DP2 Construction Vessel</td>
                    <td className="p-2 text-teal-800 font-semibold">DP2 "PJMAK Endeavour" with 120t active heave winch</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Chapter 2: Technical Approach & Subsea Trenching Methodology */}
      {currentChapter === 2 && (
        <div className="space-y-6 text-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-teal-800 font-mono text-xs font-bold uppercase tracking-wider mb-2">
              <Compass className="w-4 h-4" />
              <span>Section 2.1 • Engineering Execution Philosophy</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Subsea Post-Lay Burial & Mechanical Trenching
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              Our proposed methodology minimizes cable residual tension during jetting while ensuring the cable settles smoothly to the bottom of the trench before fluidised sediment reconsolidates.
            </p>
          </div>

          {/* Trenching Cross-Section Schematic SVG */}
          <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase font-mono text-slate-800">
                Figure 2.1 — Subsea Trench Profile & Burial Protection Envelope
              </span>
              <span className="text-2xs font-mono text-slate-500">Scale: N.T.S • Reference: DWG-PJMAK-TNC-004</span>
            </div>

            <div className="h-56 bg-white border border-dashed border-slate-300 rounded-md p-2 flex items-center justify-center">
              <svg className="w-full h-full text-slate-700" viewBox="0 0 750 200">
                {/* Water Column */}
                <rect x="0" y="0" width="750" height="50" fill="#e0f2fe" opacity="0.4" />
                <text x="20" y="30" fontSize="11" fill="#0284c7" fontWeight="bold" fontFamily="monospace">Water Depth: 28m - 42m (LAT)</text>

                {/* Seabed Line */}
                <path d="M 0 60 L 220 60 L 290 150 L 460 150 L 530 60 L 750 60" fill="#fef3c7" stroke="#78350f" strokeWidth="2" />
                <text x="30" y="80" fontSize="10" fill="#92400e" fontWeight="bold">Natural Seabed Level</text>
                <text x="600" y="80" fontSize="10" fill="#92400e" fontWeight="bold">Natural Seabed Level</text>

                {/* Fluidized Trench Zone */}
                <polygon points="230,60 290,150 460,150 520,60" fill="#fde68a" opacity="0.5" stroke="#d97706" strokeDasharray="3 3" />
                <text x="315" y="100" fontSize="10" fill="#b45309" fontWeight="bold">Fluidized Backfill Zone</text>

                {/* Subsea Cable at Trench Bed */}
                <circle cx="375" cy="140" r="9" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
                <circle cx="375" cy="140" r="4" fill="#ffffff" />
                <text x="395" y="143" fontSize="10" fill="#dc2626" fontWeight="bold">HVAC 220kV Cable (OD 142mm)</text>

                {/* Dimension Arrows */}
                <line x1="200" y1="60" x2="200" y2="140" stroke="#0f172a" strokeWidth="1.5" markerEnd="url(#arrow)" />
                <line x1="195" y1="60" x2="205" y2="60" stroke="#0f172a" strokeWidth="1.5" />
                <line x1="195" y1="140" x2="205" y2="140" stroke="#0f172a" strokeWidth="1.5" />
                <text x="80" y="105" fontSize="10" fill="#0f172a" fontWeight="bold" fontFamily="monospace">Target Depth: 2.0m</text>

                {/* Trench Bottom Width */}
                <line x1="290" y1="165" x2="460" y2="165" stroke="#0f172a" strokeWidth="1.5" />
                <text x="330" y="180" fontSize="9" fill="#0f172a" fontFamily="monospace">Bottom Width: 600mm</text>
              </svg>
            </div>
          </div>

          {/* Operational Phases */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono mb-2">
              Section 2.2 • Operational Phasing & Sequence
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white border border-slate-200 p-3 rounded-lg">
                <span className="font-mono text-2xs text-teal-700 font-bold block">PHASE 1</span>
                <span className="font-bold text-slate-900 block mt-0.5">Pre-Lay Survey</span>
                <p className="text-2xs text-slate-600 mt-1">Multi-beam bathymetry, side-scan sonar, and boulder clearing sweep.</p>
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-lg">
                <span className="font-mono text-2xs text-teal-700 font-bold block">PHASE 2</span>
                <span className="font-bold text-slate-900 block mt-0.5">Surface Laying</span>
                <p className="text-2xs text-slate-600 mt-1">Controlled bight deployment with calibrated inline tensioning.</p>
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-lg">
                <span className="font-mono text-2xs text-teal-700 font-bold block">PHASE 3</span>
                <span className="font-bold text-slate-900 block mt-0.5">Simultaneous Jetting</span>
                <p className="text-2xs text-slate-600 mt-1">Continuous jet-trenching with variable nozzle water pressure up to 12 bar.</p>
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-lg">
                <span className="font-mono text-2xs text-teal-700 font-bold block">PHASE 4</span>
                <span className="font-bold text-slate-900 block mt-0.5">Post-Burial Survey</span>
                <p className="text-2xs text-slate-600 mt-1">TSS 440/350 inductive tracking verifying depth of burial (DOB).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chapter 3: HSE Compliance & Risk Mitigation */}
      {currentChapter === 3 && (
        <div className="space-y-6 text-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-teal-800 font-mono text-xs font-bold uppercase tracking-wider mb-2">
              <Shield className="w-4 h-4" />
              <span>Section 3.1 • Health, Safety & Environmental Governance</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              HSE Management System & Risk Mitigation Matrix
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              All offshore operations operate strictly under the PJMAK Integrated Management System (IMS) accredited to ISO 9001:2015, ISO 14001:2015, and ISO 45001:2018 standards, alongside client-specific safety mandates.
            </p>
          </div>

          {/* Risk Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 font-bold border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="p-2 border-r border-slate-200">Identified Operational Hazard</th>
                  <th className="p-2 border-r border-slate-200">Inherent Risk</th>
                  <th className="p-2 border-r border-slate-200">Engineered Mitigation Barrier</th>
                  <th className="p-2">Residual Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-2xs">
                <tr>
                  <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">
                    High residual tension leading to cable over-bending
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">HIGH</span>
                  </td>
                  <td className="p-2 border-r border-slate-200 text-slate-700">
                    Continuous inline load-cell monitoring with automated tension shut-off. Minimum Bending Radius (MBR) limiter installed on lay chute.
                  </td>
                  <td className="p-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">LOW</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">
                    Uncharted seabed debris / UXO encountering
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">HIGH</span>
                  </td>
                  <td className="p-2 border-r border-slate-200 text-slate-700">
                    Full magnetometer and ALARP survey completed 14 days prior to operations. 50m stand-off protocol for any unidentified acoustic contacts.
                  </td>
                  <td className="p-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">LOW</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">
                    Marine mammal disturbance from subsea jetting noise
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">MEDIUM</span>
                  </td>
                  <td className="p-2 border-r border-slate-200 text-slate-700">
                    Certified Marine Mammal Observers (MMOs) onboard with passive acoustic monitoring (PAM) and mandatory 30-minute soft-start jetting procedure.
                  </td>
                  <td className="p-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">LOW</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chapter 4: Commercial Terms & Milestone Pricing */}
      {currentChapter === 4 && (
        <div className="space-y-6 text-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-teal-800 font-mono text-xs font-bold uppercase tracking-wider mb-2">
              <DollarSign className="w-4 h-4" />
              <span>Section 4.1 • Commercial Investment & Payment Terms</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Lump-Sum Investment & Milestone Schedule
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              PJMAK offers a firm, lump-sum commercial price covering project advisory, management execution, and final executive dossier delivery.
            </p>
          </div>

          {/* Pricing Summary Card */}
          <div className="bg-slate-900 text-white rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between shadow-xs">
            <div>
              <span className="text-2xs font-mono text-teal-400 font-bold uppercase tracking-wider">
                Total Firm Tender Value
              </span>
              <div className="text-2xl font-bold font-mono text-white mt-0.5">
                $1,480,000.00 USD
              </div>
              <span className="text-2xs text-slate-400">
                Lump Sum Turnkey (Excluding VAT) • Fixed Validity: 90 Days
              </span>
            </div>
            <div className="mt-3 sm:mt-0 text-right sm:border-l sm:border-slate-800 sm:pl-6 text-2xs space-y-1 text-slate-300">
              <div>Payment Terms: <strong>Net 30 Days</strong></div>
              <div>Governing Law: <strong>English Law & Maritime Arbitration</strong></div>
              <div>Cost Center: <strong className="font-mono text-teal-300">CC-ORS-2026</strong></div>
            </div>
          </div>

          {/* Milestone Schedule */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono mb-2">
              Section 4.2 • Milestone Payment Schedule
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 font-bold border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-200">Milestone</th>
                    <th className="p-2 border-r border-slate-200">Deliverable / Trigger Event</th>
                    <th className="p-2 border-r border-slate-200 text-center">% Share</th>
                    <th className="p-2 text-right">Invoice Value (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-2xs">
                  <tr>
                    <td className="p-2 font-semibold text-slate-900 border-r border-slate-200 font-mono">MS-01</td>
                    <td className="p-2 border-r border-slate-200">Contract Execution & Engineering Subsea Procedures Approval</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">15%</td>
                    <td className="p-2 text-right font-mono font-bold">$222,000.00</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-slate-900 border-r border-slate-200 font-mono">MS-02</td>
                    <td className="p-2 border-r border-slate-200">Vessel & Jet-Sled Equipment Mobilization at Base Port</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">25%</td>
                    <td className="p-2 text-right font-mono font-bold">$370,000.00</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-slate-900 border-r border-slate-200 font-mono">MS-03</td>
                    <td className="p-2 border-r border-slate-200">Completion of 50% Route Burial (KP 0.0 to KP 19.2)</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">30%</td>
                    <td className="p-2 text-right font-mono font-bold">$444,000.00</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-slate-900 border-r border-slate-200 font-mono">MS-04</td>
                    <td className="p-2 border-r border-slate-200">Completion of 100% Route Burial & Demobilization</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">20%</td>
                    <td className="p-2 text-right font-mono font-bold">$296,000.00</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-slate-900 border-r border-slate-200 font-mono">MS-05</td>
                    <td className="p-2 border-r border-slate-200">Delivery of As-Built Survey Reports & Final Acceptance Sign-off</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">10%</td>
                    <td className="p-2 text-right font-mono font-bold">$148,000.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Chapter 5: Client Evaluation Questionnaire & Jotform Integration */}
      {currentChapter === 5 && (
        <div className="space-y-6 text-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-teal-800 font-mono text-xs font-bold uppercase tracking-wider mb-2">
              <UserCheck className="w-4 h-4" />
              <span>Section 5.1 • Client Evaluation & Feedback Portal</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Formal Proposal Evaluation & Feedback Questionnaire
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              We value your technical and commercial assessment. To facilitate your tender review committee's scoring and capture any points of clarification, please complete the official online evaluation questionnaire.
            </p>
          </div>

          {/* JOTFORM INTEGRATION PROMINENT CALLOUT CARD */}
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-xl p-6 shadow-lg border border-teal-500/30 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-2xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Direct Tender Evaluation Portal
                </span>
                <span className="text-2xs font-mono text-slate-400">
                  Form Ref: JOT-PJMAK-PRP-2026
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white mb-1">
                  Complete Client Evaluation Questionnaire on Jotform
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  Open the official, secure Jotform questionnaire to evaluate proposal sections, rate technical compliance, submit commercial queries, or provide formal approval recommendation.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={activeChapterData.questionnaireUrl || 'https://form.jotform.com/242500000000000'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-2 transition-all shadow-md hover:shadow-teal-500/25"
                >
                  <span>Open Client Evaluation Questionnaire (Jotform)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <span className="text-2xs text-slate-400">
                  Link opens securely in a separate browser tab
                </span>
              </div>
            </div>
          </div>

          {/* In-Viewer Quick Review Checklist Option */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono mb-1">
                Section 5.2 • Immediate Session Review & Acknowledgement
              </h4>
              <p className="text-2xs text-slate-600">
                You may also record your review status directly in this controlled session:
              </p>
            </div>

            {feedbackSubmitted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold block">Review Acknowledgement Recorded</span>
                  <span className="text-2xs text-emerald-700">
                    Thank you! Your feedback notes and review status have been registered for PJMAK Document Control.
                  </span>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setFeedbackSubmitted(true);
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedbackChecklist.techCompliant}
                      onChange={(e) =>
                        setFeedbackChecklist({ ...feedbackChecklist, techCompliant: e.target.checked })
                      }
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-800">Technical Approach & Trenching Approved</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedbackChecklist.hseAccepted}
                      onChange={(e) =>
                        setFeedbackChecklist({ ...feedbackChecklist, hseAccepted: e.target.checked })
                      }
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-800">HSE & Risk Mitigations Verified</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedbackChecklist.commercialReviewed}
                      onChange={(e) =>
                        setFeedbackChecklist({ ...feedbackChecklist, commercialReviewed: e.target.checked })
                      }
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-800">Commercial Terms & Milestones Evaluated</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedbackChecklist.scheduleFeasible}
                      onChange={(e) =>
                        setFeedbackChecklist({ ...feedbackChecklist, scheduleFeasible: e.target.checked })
                      }
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-800">Mobilization Schedule Acceptable</span>
                  </label>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Reviewer Notes / Clarifications Requested (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={evaluationComments}
                    onChange={(e) => setEvaluationComments(e.target.value)}
                    placeholder="Enter any specific technical questions or commercial notes for the PJMAK tender team..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs flex items-center space-x-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Review Acknowledgement</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
