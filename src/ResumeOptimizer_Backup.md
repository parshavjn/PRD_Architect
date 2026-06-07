# Resume Optimizer - Complete Modular Code Backup

This file contains the complete, fully functional, premium source code for the **Resume Optimizer & Alignment Evaluator** suite that we developed. 
You can use this codebase to spin up a brand new dedicated Google AI Studio project for the Resume Optimizer in just a few clicks!

---

## 🛠️ Step-by-Step Setup in a New Project
1. **Create a New Web App** (React + Vite + Tailwind) in Google AI Studio.
2. **Install the required npm packages**:
   - `npm install xlsx mammoth pdfjs-dist @google/genai motion/react`
3. **Re-create and copy the files** from the backups below:
   - Create `/src/services/resumeService.ts` and paste the **Resume Service Code**.
   - Create `/src/components/ResumeBuilderDeck.tsx` and paste the **Resume Builder Component Code**.
   - Import and render `<ResumeBuilderDeck />` inside your `App.tsx` main content.

---

## 💻 Code Backups

### 1. Resume Service Backend Controller
Save this file as: `/src/services/resumeService.ts`

```typescript
import { GoogleGenAI } from "@google/genai";

export interface ResumeMatchRequest {
  masterResume: string;
  jobDescription: string;
  excelKeywords?: string[];
  targetRole: 'Product Manager' | 'Product Owner' | 'Solution Architect' | 'AI Product Manager';
}

export interface MatchAnalysisResult {
  matchPercentage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  analysisReport: string;
}

export async function analyzeResumeAlignment(req: ResumeMatchRequest): Promise<MatchAnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const keywordsList = req.excelKeywords && req.excelKeywords.length > 0 
    ? req.excelKeywords.join(", ") 
    : "automatic extraction from Job Description";

  const prompt = `
Act as a premier Executive recruiter and Lead Technical Recruiter specializing in Product Management, Product Ownership, Solutions Architecture, and AI Technology.
Compare the candidate's Master Resume with the target Job Description (JD) for the role of: "${req.targetRole}".

Master Resume:
\${req.masterResume}

Target Job Description:
\${req.jobDescription}

Relevant Keywords (from spreadsheet/input parameters):
\${keywordsList}

Your objective:
1. Provide a rigorous, realistic MATCH PERCENTAGE (0-100%) indicating how close the master resume complies with this target Job Description. 
2. Match actual vocabulary from the Master Resume with target JD requirements and spreadsheet keywords.
3. Identify exactly which keywords/skills match and which ones are currently missing.
4. Prepare a raw JSON block at the start of your response, followed by a professional Markdown analysis.

The response MUST start exactly with a JSON block in this schema:
\`\`\`json
{
  "matchPercentage": 75,
  "matchedKeywords": ["Product Roadmap", "KPIs", "User Stories"],
  "missingKeywords": ["A/B Testing", "AI models", "Cloud Migration"]
}
\`\`\`
And then immediately follow with a premium Markdown section containing check-points:
- **Role Alignment Assessment**: Critique of the current master resume against the "\${req.targetRole}" title.
- **Critical Experience Gap Analysis**: What major architectural or business delivery factors are absent.
- **Optimization Backlog**: Direct actions required to bring the match percentage close to 95%+.

Respond exactly matching this layout.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const text = response.text || "";
    
    // Extract the JSON block
    const jsonMatch = text.match(/```json\\s*([\\s\\S]*?)\\s*```/);
    let parsedJson = {
      matchPercentage: 50,
      matchedKeywords: [] as string[],
      missingKeywords: [] as string[]
    };

    if (jsonMatch) {
      try {
        parsedJson = JSON.parse(jsonMatch[1].trim());
      } catch (err) {
        console.error("JSON parsing error inside resume align response", err);
      }
    }

    // Clean markdown text (remove the JSON block so we can display it cleanly)
    const cleanedReport = text.replace(/```json\\s*[\\s\\S]*?\\s*```/, '').trim();

    return {
      matchPercentage: parsedJson.matchPercentage || 50,
      matchedKeywords: parsedJson.matchedKeywords || [],
      missingKeywords: parsedJson.missingKeywords || [],
      analysisReport: cleanedReport || text
    };
  } catch (error) {
    console.error("Error analyzing resume alignment:", error);
    throw error;
  }
}

export async function generateOptimizedResume(req: ResumeMatchRequest): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const keywordsList = req.excelKeywords && req.excelKeywords.length > 0 
    ? req.excelKeywords.join(", ") 
    : "automatic";

  const prompt = `
Act as a professional CV writer, Career Coach, and Technical Recruiter.
You are tasked with reworking the candidate's Master Resume to perfectly match the target Job Description (JD) and target Role of: "${req.targetRole}".

Master Resume:
\${req.masterResume}

Target Job Description:
\${req.jobDescription}

Mandatory Excel Keywords to integrate:
\${keywordsList}

CRITICAL RULES:
1. STRICT FORMAT MAINTENANCE: You MUST strictly adopt and reproduce the original resume's structural format (including sections like Contact Info, Executive Summary, Career History in order with exact Employer names, employment dates, and Education history).
2. DO NOT FABRICATE EXPERIENCE: Do not invent false companies, fake dates, or imaginary credentials. Rewrite existing bullet points to accentuate, rephrase, and align experience with high-priority JD keywords/requirements (e.g. if the JD asks for KPI-driven metrics under \${req.targetRole}, highlight existing metrics in the style of the target JD).
3. INTEGRATE KEYWORDS: Seamlessly inject relevant keywords from the Excel list and the JD text into the active bullet points.
4. Professional tone is a absolute must.
5. Provide the output in a clean, elegant Markdown resume format ready for exporting to Word or PDF. Do not write commentaries or introductory notes - output ONLY the optimized markdown resume directly.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Failed to generate optimized resume.";
  } catch (error) {
    console.error("Error generating optimized resume:", error);
    throw error;
  }
}
```

---

### 2. Resume Builder UI Deck Card Component
Save this file as: `/src/components/ResumeBuilderDeck.tsx`

```tsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  FileUp, 
  Loader2, 
  RotateCcw, 
  SearchCheck, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  Briefcase, 
  FileSpreadsheet, 
  Percent, 
  CheckCircle2, 
  XCircle,
  Sparkle
} from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { sounds } from '../services/soundEffects';
import { analyzeResumeAlignment, generateOptimizedResume, MatchAnalysisResult } from '../services/resumeService';
import Markdown_MarkdownImport from 'react-markdown';

// Set PDF JS worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/\${pdfjsLib.version}/pdf.worker.min.js`;

interface ResumeBuilderDeckProps {
  muted: boolean;
}

export default function ResumeBuilderDeck({ muted }: ResumeBuilderDeckProps) {
  // Master Resume state
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [masterText, setMasterText] = useState<string>('');
  const [isParsingMaster, setIsParsingMaster] = useState(false);
  const masterInputRef = useRef<HTMLInputElement>(null);

  // Job Description state
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState<string>('');
  const [isParsingJd, setIsParsingJd] = useState(false);
  const jdInputRef = useRef<HTMLInputElement>(null);

  // Excel Keywords state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelKeywords, setExcelKeywords] = useState<string[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Target role state
  const [targetRole, setTargetRole] = useState<'Product Manager' | 'Product Owner' | 'Solution Architect' | 'AI Product Manager'>('Product Manager');

  // Logic flow states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MatchAnalysisResult | null>(null);
  const [tailoredResume, setTailoredResume] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // File parsing logic
  const parseDocument = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\\n';
      }
      return fullText;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else {
      // Plain text files
      return await file.text();
    }
  };

  const handleMasterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    sounds.playBubble();
    setMasterFile(file);
    setIsParsingMaster(true);
    setAnalysisResult(null);
    setTailoredResume(null);

    try {
      const text = await parseDocument(file);
      setMasterText(text);
      sounds.playTick();
    } catch (error) {
      console.error('Master Resume parsing error:', error);
      alert('Failed to parse Master Resume file. Please try PDF, DOCX or TXT.');
    } finally {
      setIsParsingMaster(false);
    }
  };

  const handleJdUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    sounds.playBubble();
    setJdFile(file);
    setIsParsingJd(true);
    setAnalysisResult(null);
    setTailoredResume(null);

    try {
      const text = await parseDocument(file);
      setJdText(text);
      sounds.playTick();
    } catch (error) {
      console.error('JD parsing error:', error);
      alert('Failed to parse Job Description file. Please try PDF, DOCX or TXT.');
    } finally {
      setIsParsingJd(false);
    }
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    sounds.playBubble();
    setExcelFile(file);
    setIsParsingExcel(true);
    setExcelKeywords([]);
    setAnalysisResult(null);
    setTailoredResume(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
      
      const keywords: string[] = [];
      json.forEach((row: any) => {
        if (Array.isArray(row)) {
          row.forEach(cell => {
            if (cell !== undefined && cell !== null) {
              const str = String(cell).trim();
              if (str.length > 2 && str.length < 60 && !str.includes('\\n')) {
                keywords.push(str);
              }
            }
          });
        }
      });

      // Filter uniques
      const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 50);
      setExcelKeywords(uniqueKeywords);
      sounds.playSuccess();
    } catch (error) {
      console.error('Excel keyword parsing error:', error);
      alert('Failed to parse Excel spreadsheet. Make sure it is a valid .xlsx or .xls file.');
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Perform JD matching assessment
  const handleAnalyzeAndMatch = async () => {
    const actualResume = masterText.trim();
    const actualJd = jdText.trim();

    if (!actualResume) {
      alert("Please upload or type your Master Resume first!");
      return;
    }
    if (!actualJd) {
      alert("Please upload or type the Target Job Description (JD) first!");
      return;
    }

    sounds.playClick();
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setTailoredResume(null);

    try {
      const result = await analyzeResumeAlignment({
        masterResume: actualResume,
        jobDescription: actualJd,
        excelKeywords: excelKeywords,
        targetRole: targetRole
      });
      setAnalysisResult(result);
      sounds.playSuccess();
    } catch (err) {
      console.error(err);
      alert("Error occurred performing resume JD keywords alignment. Check API connectivity.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Tailor Resume based on standard layout maintaining
  const handleTailorResume = async () => {
    const actualResume = masterText.trim();
    const actualJd = jdText.trim();

    if (!actualResume || !actualJd) return;

    sounds.playClick();
    setIsGenerating(true);
    setTailoredResume(null);

    try {
      const result = await generateOptimizedResume({
        masterResume: actualResume,
        jobDescription: actualJd,
        excelKeywords: excelKeywords,
        targetRole: targetRole
      });
      setTailoredResume(result);
      sounds.playSuccess();
    } catch (err) {
      console.error(err);
      alert("Error occurred tailoring your resume. Check API connectivity.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Output utilities
  const downloadTailoredMd = () => {
    if (!tailoredResume) return;
    sounds.playSuccess();
    const blob = new Blob([tailoredResume], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Tailored_Resume_\${targetRole.replace(/\\s+/g, '_')}_\${new Date().toISOString().substring(0,10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTailoredDoc = () => {
    if (!tailoredResume) return;
    sounds.playSuccess();

    let bodyHtml = tailoredResume.replace(/\\r/g, '');

    // Convert headings
    bodyHtml = bodyHtml.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    bodyHtml = bodyHtml.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    bodyHtml = bodyHtml.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    bodyHtml = bodyHtml.replace(/^#### (.*)$/gm, '<h4>$1</h4>');

    // Bold/Italic
    bodyHtml = bodyHtml.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
    bodyHtml = bodyHtml.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');

    // Bullet points
    bodyHtml = bodyHtml.replace(/^\\s*-\\s+(.*)$/gm, '<li>$1</li>');
    bodyHtml = bodyHtml.replace(/^\\s*\\*\\s+(.*)$/gm, '<li>$1</li>');

    // Wrap plain text lines not styled
    bodyHtml = bodyHtml.split('\\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('</')) return line;
      return `<p>\${line}</p>`;
    }).join('\\n');

    const wordTemplate = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Tailored Executive Resume</title>
        <style>
          body {
            font-family: "Calibri", "Arial", sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #1f2937;
            margin: 1.0in;
          }
          h1 {
            font-size: 20pt;
            color: #111827;
            text-align: center;
            margin-bottom: 2pt;
            font-weight: bold;
          }
          h2 {
            font-size: 13pt;
            color: #4f46e5;
            border-bottom: 1.5px solid #4f46e5;
            padding-bottom: 2pt;
            margin-top: 14pt;
            margin-bottom: 6pt;
          }
          h3 {
            font-size: 11pt;
            color: #111827;
            margin-top: 8pt;
            margin-bottom: 2pt;
            font-weight: bold;
          }
          p {
            margin: 0 0 4pt 0;
            color: #374151;
          }
          ul {
            margin: 0 0 6pt 0;
            padding-left: 18pt;
          }
          li {
            margin-bottom: 3pt;
            color: #374151;
          }
        </style>
      </head>
      <body>
        \${bodyHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\\ufeff' + wordTemplate], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Tailored_Resume_\${targetRole.replace(/\\s+/g, '_')}_\${new Date().toISOString().substring(0,10)}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => {
    if (!tailoredResume) return;
    sounds.playSuccess();
    navigator.clipboard.writeText(tailoredResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAll = () => {
    sounds.playClick();
    setMasterFile(null);
    setMasterText('');
    setJdFile(null);
    setJdText('');
    setExcelFile(null);
    setExcelKeywords([]);
    setAnalysisResult(null);
    setTailoredResume(null);
  };

  return (
    <div className="w-full flex flex-col gap-10">
      <AnimatePresence mode="wait">
        {!isAnalyzing && !isGenerating && !analysisResult && !tailoredResume && (
          <motion.div
            key="resume-inputs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Step 1: Master Resume Input */}
            <div className="bg-[#0A0A0B]/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex flex-col min-h-[460px] relative shadow-xl hover:border-indigo-5050/30 transition-all duration-300">
              <div className="mb-4">
                <span className="text-[9px] text-[#A78BFA] uppercase font-black tracking-widest bg-purple-500/10 px-2.5 py-1 rounded-full">Step 01</span>
                <h3 className="text-lg font-light text-white mt-2">Master Resume</h3>
                <p className="text-xs text-[#E0E0E6]/40 mt-1">Standard format target context source</p>
              </div>

              {/* Drag/Drop Upload Container */}
              <div className="flex-1 flex flex-col gap-4">
                <input
                  type="file"
                  ref={masterInputRef}
                  onChange={handleMasterUpload}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                />
                
                {!masterFile ? (
                  <button
                    onClick={() => { sounds.playClick(); masterInputRef.current?.click(); }}
                    className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-xl hover:border-indigo-5050/40 bg-white/[0.01] hover:bg-white/[0.02] transition-all cursor-pointer group"
                  >
                    <FileUp className="w-8 h-8 text-indigo-400 group-hover:scale-110 group-hover:text-indigo-300 transition-all duration-300" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/40 group-hover:text-white/70 mt-3 text-center">
                      Upload PDF, DOCX, TXT
                    </span>
                    <span className="text-[9px] text-white/20 mt-1">or write raw text below</span>
                  </button>
                ) : (
                  <div className="bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-purple-400" />
                      <div className="flex flex-col text-left overflow-hidden">
                        <span className="text-xs font-bold text-white truncate max-w-[150px]">{masterFile.name}</span>
                        <span className="text-[9px] text-purple-400 uppercase tracking-widest font-bold">Successfully Parsed</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { sounds.playSweep(); setMasterFile(null); setMasterText(''); }}
                      className="p-1 hover:bg-white/5 rounded text-white/30 hover:text-red-400 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <textarea
                  value={masterText}
                  onChange={(e) => {
                    setMasterText(e.target.value);
                    if (e.target.value.length % 20 === 0) sounds.playTick();
                  }}
                  placeholder="Paste your current Master Resume content here..."
                  className="h-44 w-full bg-white/[0.02] rounded-xl p-3 text-xs text-[#E0E0E6] placeholder:text-white/10 focus:ring-1 focus:ring-indigo-500/30 outline-none resize-none border border-white/5 text-left custom-scrollbar font-mono leading-relaxed"
                />

                {isParsingMaster && (
                  <div className="flex items-center gap-2 justify-center text-[9px] text-purple-400 uppercase tracking-widest font-black py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    Extracting File...
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Target Job Description (JD) */}
            <div className="bg-[#0A0A0B]/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex flex-col min-h-[460px] relative shadow-xl hover:border-indigo-500/30 transition-all duration-300">
              <div className="mb-4">
                <span className="text-[9px] text-[#A78BFA] uppercase font-black tracking-widest bg-purple-500/10 px-2.5 py-1 rounded-full">Step 02</span>
                <h3 className="text-lg font-light text-white mt-2">Target JD</h3>
                <p className="text-xs text-[#E0E0E6]/40 mt-1">Role requirements & scope benchmark</p>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <input
                  type="file"
                  ref={jdInputRef}
                  onChange={handleJdUpload}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                />

                {!jdFile ? (
                  <button
                    onClick={() => { sounds.playClick(); jdInputRef.current?.click(); }}
                    className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-xl hover:border-indigo-500/40 bg-white/[0.01] hover:bg-white/[0.02] transition-all cursor-pointer group"
                  >
                    <FileUp className="w-8 h-8 text-indigo-400 group-hover:scale-110 group-hover:text-indigo-300 transition-all duration-300" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/40 group-hover:text-white/70 mt-3 text-center">
                      Upload PDF, DOCX, TXT
                    </span>
                    <span className="text-[9px] text-white/20 mt-1">or write raw text below</span>
                  </button>
                ) : (
                  <div className="bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-purple-400" />
                      <div className="flex flex-col text-left overflow-hidden">
                        <span className="text-xs font-bold text-white truncate max-w-[150px]">{jdFile.name}</span>
                        <span className="text-[9px] text-purple-400 uppercase tracking-widest font-bold">Successfully Parsed</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { sounds.playSweep(); setJdFile(null); setJdText(''); }}
                      className="p-1 hover:bg-white/5 rounded text-white/30 hover:text-red-400 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <textarea
                  value={jdText}
                  onChange={(e) => {
                    setJdText(e.target.value);
                    if (e.target.value.length % 20 === 0) sounds.playTick();
                  }}
                  placeholder="Paste the target Job Description (JD) here..."
                  className="h-44 w-full bg-white/[0.02] rounded-xl p-3 text-xs text-[#E0E0E6] placeholder:text-white/10 focus:ring-1 focus:ring-indigo-500/30 outline-none resize-none border border-white/5 text-left custom-scrollbar font-mono leading-relaxed"
                />

                {isParsingJd && (
                  <div className="flex items-center gap-2 justify-center text-[9px] text-purple-400 uppercase tracking-widest font-black py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    Extracting File...
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Excel Keyword Sheet + Target Role */}
            <div className="bg-[#0A0A0B]/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex flex-col min-h-[460px] relative shadow-xl hover:border-indigo-500/32 transition-all duration-300">
              <div className="mb-4">
                <span className="text-[9px] text-[#A78BFA] uppercase font-black tracking-widest bg-purple-500/10 px-2.5 py-1 rounded-full">Step 03</span>
                <h3 className="text-lg font-light text-white mt-2">Keywords & Target</h3>
                <p className="text-xs text-[#E0E0E6]/40 mt-1">Excel uploader & target role criteria</p>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <input
                  type="file"
                  ref={excelInputRef}
                  onChange={handleExcelUpload}
                  accept=".xlsx,.xls"
                  className="hidden"
                />

                {!excelFile ? (
                  <button
                    onClick={() => { sounds.playClick(); excelInputRef.current?.click(); }}
                    className="h-24 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl hover:border-purple-500/40 bg-white/[0.01] hover:bg-white/[0.02] transition-all cursor-pointer group"
                  >
                    <FileSpreadsheet className="w-7 h-7 text-emerald-400 group-hover:scale-110 group-hover:text-emerald-300 transition-all duration-300" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/40 group-hover:text-white/70 mt-2 text-center">
                      Upload Keywords Excel (.XLSX)
                    </span>
                  </button>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="flex flex-col text-left overflow-hidden">
                        <span className="text-xs font-bold text-white truncate max-w-[140px]">{excelFile.name}</span>
                        <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">
                          {excelKeywords.length} Keywords Parsed
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { sounds.playSweep(); setExcelFile(null); setExcelKeywords([]); }}
                      className="p-1 hover:bg-white/5 rounded text-white/30 hover:text-red-400 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Display extracted keywords preview if exists */}
                {excelKeywords.length > 0 && (
                  <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 h-20 overflow-y-auto custom-scrollbar flex flex-wrap gap-1.5 align-content-start">
                    {excelKeywords.map((tag, i) => (
                      <span key={i} className="text-[9px] font-medium bg-white/5 border border-white/10 rounded text-[#E0E0E6]/70 px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Target Role Selector */}
                <div className="space-y-2 mt-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A78BFA] block">Select Target Role Criteria</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Product Manager', 'Product Owner', 'Solution Architect', 'AI Product Manager'] as const).map((role) => (
                      <button
                        key={role}
                        onClick={() => { sounds.playClick(); setTargetRole(role); }}
                        className={`text-[10px] font-bold uppercase py-2.5 px-2 rounded-xl transition-all duration-300 text-center border cursor-pointer \${
                          targetRole === role 
                            ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border-purple-500/50 shadow-md shadow-indigo-500/10' 
                            : 'bg-white/5 border-white/5 text-[#E0E0E6]/30 hover:border-white/10 hover:text-white/70'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {isParsingExcel && (
                  <div className="flex items-center gap-2 justify-center text-[9px] text-purple-400 uppercase tracking-widest font-black py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    Parsing Spreadsheet...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Trigger Matching Button */}
        {!isAnalyzing && !isGenerating && !analysisResult && !tailoredResume && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <button
              onClick={handleAnalyzeAndMatch}
              disabled={!masterText.trim() || !jdText.trim()}
              className={`flex items-center gap-3 px-12 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all bg-gradient-to-r \${
                (masterText.trim() && jdText.trim()) 
                  ? 'from-blue-600 via-indigo-600 to-purple-600 text-white hover:shadow-xl hover:shadow-indigo-500/20 cursor-pointer active:scale-95 duration-300' 
                  : 'from-white/5 to-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <SearchCheck className="w-4 h-4" />
              Calculate Compliance Match
            </button>
          </motion.div>
        )}

        {/* Loading Assessment */}
        {isAnalyzing && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="relative">
              <div className="w-20 h-20 border-t-2 border-[#8B5CF6] rounded-full animate-spin"></div>
              <div className="w-20 h-20 border-b-2 border-white/5 rounded-full absolute top-0 left-0 rotate-45"></div>
              <Sparkle className="w-8 h-8 text-[#A78BFA] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h2 className="mt-8 text-2xl font-light italic font-serif text-white uppercase tracking-tight">Calculating Alignment</h2>
            <p className="text-[#E0E0E6]/40 mt-3 max-w-sm text-xs leading-relaxed">
              Evaluating master CV credentials, matching keyword dictionaries & counting missing vocabulary metrics...
            </p>
          </motion.div>
        )}

        {/* Loading tailoring */}
        {isGenerating && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="relative animate-bounce">
              <div className="w-20 h-20 border-t-2 border-pink-500 rounded-full animate-spin"></div>
              <div className="w-20 h-20 border-b-2 border-white/5 rounded-full absolute top-0 left-0 rotate-45"></div>
              <Sparkles className="w-8 h-8 text-pink-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h2 className="mt-8 text-2xl font-light italic font-serif text-white uppercase tracking-tight">Tailoring Resume Layout</h2>
            <p className="text-[#E0E0E6]/40 mt-3 max-w-sm text-xs leading-relaxed">
              Mapping standard master format sections and rewriting active bullet points with high-value JD keywords...
            </p>
          </motion.div>
        )}

        {/* Analysis Result Screen */}
        {analysisResult && !tailoredResume && !isGenerating && (
          <motion.div
            key="analysis-result"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row shadow-[0_45px_100px_rgba(139,92,246,0.1)] relative z-10 backdrop-blur-md"
          >
            {/* Sidebar metrics feedback card */}
            <aside className="w-full md:w-80 bg-black/40 border-r border-white/5 p-8 flex flex-col">
              <div className="space-y-8 flex-1">
                <div className="text-center">
                  <span className="text-[10px] font-black text-[#A78BFA] uppercase tracking-[0.2em] block mb-2">Match Rating</span>
                  
                  {/* Matching Radial Gauge */}
                  <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="54" className="stroke-white/5" strokeWidth="6" fill="transparent" />
                      <circle cx="64" cy="64" r="54" className="stroke-indigo-500" strokeWidth="6" fill="transparent"
                        strokeDasharray={339}
                        strokeDashoffset={339 - (339 * Math.min(analysisResult.matchPercentage, 100)) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-3xl font-black font-sans text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                        {analysisResult.matchPercentage}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-[#E0E0E6]/30 uppercase tracking-widest font-black mt-3">Overall Compliance</p>
                </div>

                {/* Keyword Analysis Lists */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      Matched Keywords ({analysisResult.matchedKeywords.length})
                    </h4>
                    <div className="max-h-24 overflow-y-auto custom-scrollbar flex flex-wrap gap-1 align-content-start">
                      {analysisResult.matchedKeywords.slice(0, 15).map((kw, idx) => (
                        <span key={idx} className="text-[8px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                      {analysisResult.matchedKeywords.length === 0 && <span className="text-[9px] text-white/20">None extracted</span>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase text-orange-400 tracking-wider flex items-center gap-1.5 mb-2">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      Missing Keywords ({analysisResult.missingKeywords.length})
                    </h4>
                    <div className="max-h-24 overflow-y-auto custom-scrollbar flex flex-wrap gap-1 align-content-start">
                      {analysisResult.missingKeywords.slice(0, 15).map((kw, idx) => (
                        <span key={idx} className="text-[8px] bg-orange-500/10 text-orange-300 border border-orange-500/20 px-1.5 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                      {analysisResult.missingKeywords.length === 0 && <span className="text-[9px] text-white/20">None extracted</span>}
                    </div>
                  </div>
                </div>

                {/* Actions bottom sequence */}
                <div className="space-y-3 pt-6 border-t border-[#FFFFFF]/5">
                  <button
                    onClick={handleTailorResume}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border border-purple-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-95 transition-all text-center cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.2)] animate-pulse"
                  >
                    Tailor/Optimize Resume
                  </button>

                  <button
                    onClick={resetAll}
                    className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] uppercase font-bold tracking-widest text-center text-white/40 hover:text-white transition-all cursor-pointer"
                  >
                    Back / Try Another
                  </button>
                </div>
              </div>
            </aside>

            {/* Analysis Review Report Panel */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0B]/90">
              <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-xl sticky top-0 z-20">
                <span className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-[0.2em]">
                  Resumes Match Compliance Report
                </span>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded border border-indigo-500/20 font-mono">
                  {targetRole} Alignment
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-10 md:p-14 scroll-smooth custom-scrollbar max-h-[60vh]">
                <div className="markdown-body">
                  <Markdown_MarkdownImport>{analysisResult.analysisReport}</Markdown_MarkdownImport>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tailored CV Output Screen */}
        {tailoredResume && (
          <motion.div
            key="tailored-output"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row shadow-[0_45px_100px_rgba(139,92,246,0.1)] relative z-10 backdrop-blur-md"
          >
            {/* Download side actions panel */}
            <aside className="w-full md:w-80 bg-black/40 border-r border-white/5 p-8 flex flex-col justify-between">
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-[0.2em] mb-4 block">
                    Optimized Resume Deck
                  </label>
                  <p className="text-[11px] leading-relaxed text-[#E0E0E6]/60">
                    Your master resume was tailored to perfectly integrate high-priority keywords while rigidly preserving the exact layout structure you expect.
                  </p>
                </div>

                <div className="space-y-3 pt-6 border-t border-white/5">
                  <button 
                    onClick={downloadTailoredDoc}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E0E0E6] hover:from-purple-600/35 hover:to-pink-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                  >
                    <Download className="w-3.5 h-3.5 text-pink-400" />
                    Download MS Word (.doc)
                  </button>

                  <button 
                    onClick={downloadTailoredMd}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-indigo-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E0E0E6] hover:from-blue-600/35 hover:to-purple-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    Download Markdown (.md)
                  </button>

                  <button 
                    onClick={copyToClipboard}
                    className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E0E0E6] hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied Markdown!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-indigo-400" />
                        Copy Raw Markdown
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => { sounds.playClick(); setTimeout(() => window.print(), 100); }}
                    className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E0E0E6]/60 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Print Tailored CV
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <button
                  onClick={resetAll}
                  className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] uppercase font-black text-[#A78BFA] tracking-widest border border-white/10 cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restart Build Suite
                </button>
              </div>
            </aside>

            {/* Document preview panel */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0B]/95">
              <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-xl sticky top-0 z-20">
                <span className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-[0.2em]">
                  Tailored Professional Resume Preview
                </span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-300 px-3 py-1 rounded border border-emerald-500/20 font-bold uppercase tracking-widest">
                  Optimized
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-12 md:p-16 scroll-smooth custom-scrollbar max-h-[60vh] bg-white text-gray-900 border-t border-white/5 relative selection:bg-indigo-200">
                <div className="prose prose-slate max-w-none text-left leading-relaxed">
                  <Markdown_MarkdownImport>{tailoredResume}</Markdown_MarkdownImport>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```
