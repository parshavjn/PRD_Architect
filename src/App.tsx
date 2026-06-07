import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Lightbulb, 
  Users, 
  Target, 
  ShieldAlert, 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  RotateCcw,
  LayoutDashboard,
  ClipboardCheck,
  ChevronRight,
  MessageSquareText,
  Upload,
  SearchCheck,
  FileUp,
  AlertCircle,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check
} from 'lucide-react';
import Markdown from 'react-markdown';
import { generatePRD, PRDInputs, analyzePRD } from './services/geminiService';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { sounds } from './services/soundEffects';
import InteractiveBg from './components/InteractiveBg';

// PDF worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const STEP_LABELS = [
  { id: 'idea', label: 'The Big Idea', icon: Lightbulb, description: 'What are you building?' },
  { id: 'feedback', label: 'User Feedback', icon: MessageSquareText, description: 'What are users saying?' },
  { id: 'assumptions', label: 'Vision & Assumptions', icon: Target, description: 'What is your intuition?' },
  { id: 'goals', label: 'Business Goals', icon: LayoutDashboard, description: 'What defines success?' },
  { id: 'constraints', label: 'Constraints', icon: ShieldAlert, description: 'Any limitations?' },
];

type AppMode = 'draft' | 'audit';

export default function App() {
  const [mode, setMode] = useState<AppMode>('draft');
  const [muted, setMuted] = useState(sounds.getMuted());
  const [inputs, setInputs] = useState<PRDInputs>({
    idea: '',
    feedback: '',
    assumptions: '',
    goals: '',
    constraints: '',
  });

  // Audit state
  const [auditFile, setAuditFile] = useState<File | null>(null);
  const [auditText, setAuditText] = useState<string>('');
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [prd, setPrd] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const downloadPRD = () => {
    const content = prd || auditResult;
    if (!content) return;
    sounds.playSuccess();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = auditResult 
      ? `PRD_Audit_Report_${new Date().toISOString().substring(0,10)}.md` 
      : `PRD_Specification_${new Date().toISOString().substring(0,10)}.md`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadWordPRD = () => {
    const rawContent = prd || auditResult;
    if (!rawContent) return;
    sounds.playSuccess();

    // Normalise line endings to avoid regex errors with \r
    let bodyHtml = rawContent.replace(/\r/g, '');

    // Convert headers (H1 to H4) properly
    bodyHtml = bodyHtml.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    bodyHtml = bodyHtml.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    bodyHtml = bodyHtml.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    bodyHtml = bodyHtml.replace(/^#### (.*)$/gm, '<h4>$1</h4>');

    // Convert bold and italics
    bodyHtml = bodyHtml.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    bodyHtml = bodyHtml.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Convert blockquotes
    bodyHtml = bodyHtml.replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>');

    // Convert lists (bullet and numeric)
    bodyHtml = bodyHtml.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
    bodyHtml = bodyHtml.replace(/^\s*\*\s+(.*)$/gm, '<li>$1</li>');
    bodyHtml = bodyHtml.replace(/^\s*\d+\.\s+(.*)$/gm, '<li style="list-style-type: decimal;">$1</li>');

    // Replace table row separators |---|---|
    bodyHtml = bodyHtml.replace(/^\|?[\s-:\\|]+$/gm, '');
    
    // Process markdown tables to HTML tables
    const lines = bodyHtml.split('\n');
    let inTable = false;
    let tableHtml = '';
    const newLines: string[] = [];

    for (let line of lines) {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);
        if (!inTable) {
          inTable = true;
          tableHtml = '<table border="1"><thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
        }
      } else {
        if (inTable) {
          tableHtml += '</tbody></table>';
          newLines.push(tableHtml);
          inTable = false;
          tableHtml = '';
        }
        newLines.push(line);
      }
    }
    if (inTable) {
      tableHtml += '</tbody></table>';
      newLines.push(tableHtml);
    }
    bodyHtml = newLines.join('\n');

    // Wrap plain lines in paragraph tags, except for structured HTML tag lines
    bodyHtml = bodyHtml.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || 
          trimmed.startsWith('<li') || 
          trimmed.startsWith('<table') || 
          trimmed.startsWith('<thead') || 
          trimmed.startsWith('<tbody') || 
          trimmed.startsWith('<tr') || 
          trimmed.startsWith('</') || 
          trimmed.startsWith('<pre') || 
          trimmed.startsWith('<blockquote') ||
          trimmed.startsWith('<!--')) {
        return line;
      }
      return `<p>${line}</p>`;
    }).join('\n');

    // Put together the full Word document HTML template
    const fullWordTemplate = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Strategic Product Requirement Document</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: "Calibri", "Segoe UI", Arial, sans-serif;
            font-size: 11.5pt;
            line-height: 1.6;
            color: #111827;
            margin: 1.2in;
          }
          h1 {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 24pt;
            color: #1E1B4B;
            border-bottom: 2px solid #6366F1;
            padding-bottom: 6pt;
            margin-top: 28pt;
            margin-bottom: 14pt;
            font-weight: bold;
          }
          h2 {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 17pt;
            color: #4F46E5;
            margin-top: 22pt;
            margin-bottom: 10pt;
            font-weight: 600;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 3pt;
          }
          h3 {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 13.5pt;
            color: #312E81;
            margin-top: 16pt;
            margin-bottom: 8pt;
            font-weight: 600;
          }
          p {
            margin-top: 0;
            margin-bottom: 10pt;
            color: #374151;
            font-size: 11pt;
          }
          ul, ol {
            margin-top: 0;
            margin-bottom: 10pt;
            padding-left: 20pt;
          }
          li {
            margin-bottom: 5pt;
            color: #374151;
          }
          blockquote {
            border-left: 4px solid #6366F1;
            background: #F5F3FF;
            padding: 10pt 14pt;
            margin: 0 0 12pt 0;
            color: #4F46E5;
            font-style: italic;
          }
          pre {
            font-family: "Consolas", "Courier New", monospace;
            font-size: 10pt;
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            padding: 10pt;
            margin-top: 0;
            margin-bottom: 12pt;
            border-radius: 4px;
          }
          code {
            font-family: "Consolas", "Courier New", monospace;
            font-size: 10pt;
            background-color: #F3F4F6;
            padding: 2px 4px;
            color: #D946EF;
            border-radius: 3px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 14pt;
            margin-top: 8pt;
          }
          th {
            background-color: #EEF2FF;
            border: 1px solid #C7D2FE;
            padding: 8pt;
            color: #312E81;
            font-family: Arial, sans-serif;
            font-weight: bold;
            text-align: left;
          }
          td {
            border: 1px solid #E5E7EB;
            padding: 8pt;
            color: #4B5563;
          }
          .footer {
            font-size: 9pt;
            color: #9CA3AF;
            border-top: 1px solid #E5E7EB;
            margin-top: 50pt;
            padding-top: 10pt;
            text-align: center;
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
        <div class="footer">
          Generated and verified by Founders' PRD Architect on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + fullWordTemplate], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = auditResult 
      ? `PRD_Audit_Report_${new Date().toISOString().substring(0, 10)}.doc` 
      : `PRD_Specification_${new Date().toISOString().substring(0, 10)}.doc`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => {
    const content = prd || auditResult;
    if (!content) return;
    sounds.playSuccess();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    sounds.setMuted(nextMuted);
    setMuted(nextMuted);
    if (!nextMuted) {
      sounds.playSuccess();
    }
  };

  const handleInputChange = (key: keyof PRDInputs, value: string) => {
    // Subtle tick on typing or content modifications so the user feels highly interactive
    if (value.length % 15 === 0) {
      sounds.playTick();
    }
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    sounds.playBubble();
    setAuditFile(file);
    setIsParsing(true);
    setAuditResult(null);

    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
        setAuditText(fullText);
        sounds.playTick();
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setAuditText(result.value);
        sounds.playTick();
      } else {
        // Assume text file
        const text = await file.text();
        setAuditText(text);
        sounds.playTick();
      }
    } catch (error) {
      console.error('File parsing error:', error);
      alert('Failed to parse file. Please try a different format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleAudit = async () => {
    if (!auditText) return;
    sounds.playClick();
    setLoading(true);
    try {
      const result = await analyzePRD(auditText);
      setAuditResult(result);
      sounds.playSuccess();
    } catch (error) {
      alert('Failed to audit PRD. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    sounds.playClick();
    setLoading(true);
    setPrd(null);
    try {
      const result = await generatePRD(inputs);
      setPrd(result);
      sounds.playSuccess();
    } catch (error) {
      alert('Failed to generate PRD. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < STEP_LABELS.length - 1) {
      sounds.playSweep();
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      sounds.playSweep();
      setCurrentStep(currentStep - 1);
    }
  };

  const isCurrentStepValid = () => {
    const key = STEP_LABELS[currentStep].id as keyof PRDInputs;
    return inputs[key].trim().length > 10;
  };

  const reset = () => {
    sounds.playClick();
    setPrd(null);
    setAuditResult(null);
    setAuditFile(null);
    setAuditText('');
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col font-sans text-[#E0E0E6] relative overflow-x-hidden">
      {/* Interactive Laser Background with Ambient Chimes support */}
      <InteractiveBg />

      {/* Header */}
      <header className="min-h-20 py-3 border-b border-white/10 bg-[#0A0A0B]/85 backdrop-blur-md flex flex-wrap gap-4 items-end px-8 justify-between sticky top-0 z-50 relative">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex flex-col">
            <div className="text-[9px] uppercase tracking-[0.2em] text-[#8B5CF6] font-bold mb-0.5">
              Founders' Strategy Suite v1.5
            </div>
            <h1 className="text-2xl font-light tracking-tight font-serif italic text-white flex items-center gap-3">
              <ClipboardCheck className="w-5 h-5 text-[#8B5CF6] animate-pulse" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 font-semibold">PRD Architect</span>
            </h1>
          </div>
        </div>
        
        <div className="flex gap-4 text-[11px] uppercase tracking-widest text-[#E0E0E6]/50 items-center relative z-10">
          {/* Snd Toggle controller */}
          <button 
            onClick={toggleMute}
            className={`flex items-center justify-center p-2 rounded-full border border-white/10 transition-all ${!muted ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] scale-110' : 'bg-white/5 hover:bg-white/10 text-white/40'}`}
            title={muted ? "Unmute UI Sounds" : "Mute UI Sounds"}
          >
            {!muted ? (
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Volume2 className="w-4 h-4" />
              </motion.div>
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {prd || auditResult ? (
            <button 
              onClick={reset}
              className="flex items-center gap-2 text-white hover:text-[#8B5CF6] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Draft
            </button>
          ) : (
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10 overflow-hidden relative">
               <button 
                 onClick={() => { setMode('draft'); sounds.playSweep(); }}
                 className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${mode === 'draft' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'hover:text-white'}`}
               >
                 Draft
               </button>
               <button 
                 onClick={() => { setMode('audit'); sounds.playSweep(); }}
                 className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${mode === 'audit' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'hover:text-white'}`}
               >
                 Audit
               </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-10 flex flex-col">
        <AnimatePresence mode="wait">
            {!prd && !auditResult && !loading && mode === 'draft' && (
              <motion.div
                key="input-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-10 flex-1"
              >
                {/* Sidebar Navigation */}
                <div className="space-y-4">
                  <label className="text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase font-black tracking-widest block mb-4">
                    Drafting Sequence
                  </label>
                  <div className="space-y-2">
                    {STEP_LABELS.map((step, index) => (
                      <button
                        key={step.id}
                        onClick={() => { sounds.playClick(); setCurrentStep(index); }}
                        onMouseEnter={() => sounds.playTick()}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 text-left group ${
                          index === currentStep 
                            ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-indigo-500/30 text-white shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                            : 'text-[#E0E0E6]/40 hover:text-[#E0E0E6]/70 hover:bg-white/[0.02]'
                        }`}
                      >
                        <step.icon className={`w-5 h-5 transition-transform duration-300 ${index === currentStep ? 'text-[#8B5CF6] scale-110' : 'text-white/20 group-hover:text-white/40'}`} />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold tracking-wide">{step.label}</span>
                          <span className="text-[9px] opacity-40 uppercase tracking-[0.1em] mt-0.5 whitespace-nowrap">Step 0{index + 1}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-8 mt-8 border-t border-white/5">
                    <div className="bg-white/5 p-5 rounded-xl border border-white/10 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles className="w-12 h-12 text-indigo-400" />
                      </div>
                      <p className="text-[11px] text-[#E0E0E6]/60 leading-relaxed relative z-10 font-medium">
                        Fill out each section to help the AI Strategist build a production-ready PRD.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="bg-[#0A0A0B]/40 backdrop-blur-md rounded-2xl border border-white/10 p-10 flex flex-col min-h-[550px] shadow-2xl relative">
                  <div className="mb-10">
                    <label className="text-[10px] text-[#8B5CF6] uppercase font-black tracking-widest">
                      {STEP_LABELS[currentStep].id}
                    </label>
                    <h2 className="text-3xl font-light text-white mt-1">{STEP_LABELS[currentStep].label}</h2>
                    <p className="text-sm text-[#E0E0E6]/40 mt-2">{STEP_LABELS[currentStep].description}</p>
                  </div>

                  <textarea
                    value={inputs[STEP_LABELS[currentStep].id as keyof PRDInputs]}
                    onChange={(e) => handleInputChange(STEP_LABELS[currentStep].id as keyof PRDInputs, e.target.value)}
                    placeholder={`Describe ${STEP_LABELS[currentStep].label.toLowerCase()} here...`}
                    className="flex-1 w-full bg-white/[0.03] rounded-xl p-6 text-[#E0E0E6] placeholder:text-white/10 focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none border border-white/5 focus:bg-white/[0.05] transition-all font-mono text-sm leading-relaxed"
                  />

                  <div className="mt-10 flex justify-between items-center pt-6 border-t border-white/5">
                    <div className="flex gap-4">
                      {currentStep > 0 && (
                        <button 
                          onClick={prevStep}
                          onMouseEnter={() => sounds.playTick()}
                          className="px-6 py-2.5 text-xs font-bold text-[#E0E0E6]/50 hover:text-white transition-colors flex items-center gap-2"
                        >
                          Previous Step
                        </button>
                      )}
                    </div>
                    
                    {currentStep < STEP_LABELS.length - 1 ? (
                      <button 
                        onClick={nextStep}
                        onMouseEnter={() => { if (isCurrentStepValid()) sounds.playTick(); }}
                        disabled={!isCurrentStepValid()}
                        className={`flex items-center gap-3 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                          isCurrentStepValid() 
                            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-indigo-500/20 active:scale-95' 
                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                        }`}
                      >
                        Next Strategy
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={handleGenerate}
                        onMouseEnter={() => { if (isCurrentStepValid()) sounds.playTick(); }}
                        disabled={!isCurrentStepValid()}
                        className={`flex items-center gap-3 px-10 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                          isCurrentStepValid() 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 shadow-xl shadow-indigo-500/30 active:scale-95 animate-pulse' 
                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        Engage Architect
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Audit Mode View */}
            {!prd && !auditResult && !loading && mode === 'audit' && (
              <motion.div
                key="audit-form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center flex-1"
              >
                <div className="max-w-xl w-full bg-[#0A0A0B]/40 border border-white/10 rounded-3xl p-12 text-center shadow-2xl backdrop-blur-md relative overflow-hidden group">
                  <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent"></div>
                  
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-105 transition-transform duration-500 relative overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                     <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <Upload className="w-10 h-10 text-[#6366F1] relative z-10 group-hover:scale-110 transition-transform" />
                  </div>
                  
                  <h2 className="text-3xl font-light text-white italic font-serif text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-purple-300">Strategic Audit</h2>
                  <p className="text-[#E0E0E6]/40 mt-3 text-sm leading-relaxed">
                    Upload an existing PRD to verify its strategic depth, identify gaps, and receive production-ready modifications.
                  </p>

                  <div className="mt-10 space-y-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                    />
                    
                    {!auditFile ? (
                      <button 
                        onClick={() => { sounds.playClick(); fileInputRef.current?.click(); }}
                        onMouseEnter={() => sounds.playTick()}
                        className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-[#E0E0E6]/30 font-bold uppercase tracking-widest text-[10px] hover:border-purple-500/50 hover:text-white transition-all flex flex-col items-center gap-2 group cursor-pointer bg-white/[0.01]"
                      >
                        <FileUp className="w-5 h-5 group-hover:animate-bounce text-[#6366F1]" />
                        Select PDF, DOCX, or TEXT
                      </button>
                    ) : (
                      <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#8B5CF6]/20 rounded-lg">
                            <FileText className="w-4 h-4 text-[#A78BFA]" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-white truncate max-w-[180px]">{auditFile.name}</span>
                            <span className="text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-black tracking-widest">Ready for Analysis</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => { sounds.playSweep(); setAuditFile(null); setAuditText(''); }}
                          className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-red-400 transition-colors"
                        >
                           <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {isParsing && (
                      <div className="flex items-center justify-center gap-2 text-[10px] font-black text-[#8B5CF6] uppercase tracking-widest py-2">
                         <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                         Extracting Text...
                      </div>
                    )}

                    {auditText && !isParsing && (
                      <button 
                        onClick={handleAudit}
                        onMouseEnter={() => sounds.playTick()}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-3 animate-pulse"
                      >
                        <SearchCheck className="w-4 h-4" />
                        Begin Strategic Audit
                      </button>
                    )}
                  </div>

                  <div className="mt-8 flex justify-center gap-6 opacity-40">
                     <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        PDF
                     </div>
                     <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        DOCX
                     </div>
                     <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                        TXT
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center flex-1"
              >
                <div className="relative">
                  <div className="w-20 h-20 border-t-2 border-[#8B5CF6] rounded-full animate-spin"></div>
                  <div className="w-20 h-20 border-b-2 border-white/5 rounded-full absolute top-0 left-0 rotate-45"></div>
                  <Sparkles className="w-8 h-8 text-[#A78BFA] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <h2 className="mt-12 text-3xl font-light italic font-serif text-white uppercase tracking-tight">Architecting Strategy</h2>
                <p className="text-[#E0E0E6]/40 mt-4 max-w-sm text-sm">
                  Clustering feedback patterns and mapping competitive moats into a lean product mandate...
                </p>
                
                <div className="mt-16 flex gap-4 text-[9px] font-black text-[#8B5CF6] uppercase tracking-[0.3em]">
                  <div className="animate-pulse">Synthesis</div>
                  <span className="opacity-20">•</span>
                  <div className="animate-pulse delay-150">Refinement</div>
                  <span className="opacity-20">•</span>
                  <div className="animate-pulse delay-300">Validation</div>
                </div>
              </motion.div>
            )}

            {(prd || auditResult) && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row h-full max-h-[85vh] shadow-[0_45px_100px_rgba(139,92,246,0.12)] relative z-10 backdrop-blur-md"
              >
                <aside className="w-full md:w-72 bg-black/40 border-r border-white/5 p-8 flex flex-col relative z-10">
                  <div className="space-y-8 flex-1">
                    <div>
                      <label className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-[0.2em] mb-4 block">
                        {auditResult ? 'Audit Findings' : 'Strategic Map'}
                      </label>
                      <ul className="space-y-4 text-[11px] font-bold uppercase tracking-widest">
                        <li className="flex items-center gap-3 text-white">
                          <div className="w-6 h-6 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[10px] text-[#A78BFA]">01</div>
                          {auditResult ? 'Strategic Rating' : 'Product Mandate'}
                        </li>
                        <li className="flex items-center gap-3 text-white/40">
                          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px]">02</div>
                          {auditResult ? 'Critical Gaps' : 'Architecture'}
                        </li>
                        <li className="flex items-center gap-3 text-white/40">
                          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px]">03</div>
                          {auditResult ? 'Modifications' : 'V1 Blueprint'}
                        </li>
                      </ul>
                    </div>
                    
                    <div className="pt-8 border-t border-white/5 space-y-3">
                      <button 
                        onClick={downloadPRD}
                        onMouseEnter={() => sounds.playTick()}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-indigo-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E0E0E6] hover:from-blue-600/35 hover:to-purple-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        {auditResult ? 'Download Audit (.md)' : 'Download PRD (.md)'}
                      </button>

                      <button 
                        onClick={downloadWordPRD}
                        onMouseEnter={() => sounds.playTick()}
                        className="w-full py-3 px-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E0E0E6] hover:from-purple-600/35 hover:to-pink-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.1)]"
                      >
                        <FileText className="w-3.5 h-3.5 text-pink-400" />
                        {auditResult ? 'Download Audit (.doc)' : 'Download PRD (.doc)'}
                      </button>

                      <button 
                        onClick={copyToClipboard}
                        onMouseEnter={() => sounds.playTick()}
                        className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E0E0E6] hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-indigo-400" />
                            Copy Markdown
                          </>
                        )}
                      </button>

                      <button 
                        onClick={() => { sounds.playClick(); setTimeout(() => window.print(), 100); }}
                        onMouseEnter={() => sounds.playTick()}
                        className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E0E0E6]/60 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        Print Spec
                      </button>

                      <div className="bg-gradient-to-r from-blue-950/10 to-purple-950/10 p-5 rounded-2xl border border-indigo-500/25 shadow-inner">
                        <p className="text-[9px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-[0.1em] mb-2 italic">Architect Note</p>
                        <p className="text-[11px] leading-relaxed text-[#E0E0E6]/60">
                          {auditResult 
                            ? "Apply these modifications to reach technical accuracy and strategic depth."
                            : "This PRD is optimized for AI-assisted prototype generators. Feed this context into a UI builder to start building v1."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-8 flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full border border-white/10 p-0.5">
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white uppercase italic">PJ</div>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white">Parshav J.</span>
                        <span className="text-[9px] text-[#A78BFA] uppercase tracking-tighter">Strategist-in-Chief</span>
                     </div>
                  </div>
                </aside>

                <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0B]/90 relative z-10">
                  <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between gap-4 bg-black/20 backdrop-blur-xl sticky top-0 z-20">
                     <div className="flex items-center gap-3 overflow-hidden">
                        {auditResult ? <SearchCheck className="w-4 h-4 text-[#8B5CF6] shrink-0" /> : <LayoutDashboard className="w-4 h-4 text-[#8B5CF6] shrink-0" />}
                        <span className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 truncate uppercase tracking-[0.2em]">
                          {auditResult ? 'Strategic Assessment Report' : 'Validated Product Blueprint v1.03'}
                        </span>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]"></div>
                        <span className="text-[9px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 uppercase tracking-widest">
                          {auditResult ? 'Assess Completed' : 'Ready'}
                        </span>
                     </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-10 md:p-16 scroll-smooth custom-scrollbar">
                    <div className="markdown-body">
                      <Markdown>{prd || auditResult}</Markdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </main>

      {/* Footer Meta */}
      <footer className="h-16 px-8 flex justify-between items-center border-t border-white/10 text-[9px] uppercase tracking-[0.3em] font-black text-white/20 relative z-10 bg-[#0A0A0B]/30">
        <div className="flex gap-10">
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-3 h-3 text-[#8B5CF6]" />
            Encrypted Analysis
          </span>
          <span>Build Engine 8.0</span>
        </div>
        <div className="flex gap-3 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse"></div>
          <span>Architect Online</span>
        </div>
      </footer>
    </div>

  );
}

