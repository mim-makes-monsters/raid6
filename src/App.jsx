import { useState, useRef, useEffect } from "react";

const STEPS = ["upload", "analyze", "clues", "exploit"];
const STEP_LABELS = ["01 Upload", "02 Analyze", "03 Clues", "04 Exploit"];
const PLATFORMS = ["HackTheBox", "TryHackMe", "PicoCTF", "CTFd", "pwn.college", "Other"];

function StepBar({ current }) {
  const ci = STEPS.indexOf(current);
  return (
    <div className="stepbar">
      {STEPS.map((s, i) => (
        <div key={s} className={`step ${i < ci ? "done" : i === ci ? "active" : ""}`}>
          <div className="step-num">{i < ci ? "✓" : String(i + 1).padStart(2, "0")}</div>
          <span>{STEP_LABELS[i].slice(3)}</span>
          {i < STEPS.length - 1 && <div className="step-connector" />}
        </div>
      ))}
    </div>
  );
}

function Card({ label, value, accent }) {
  return (
    <div className="info-card">
      <div className="info-card-label">{label}</div>
      <div className={`info-card-value ${accent ? "accent" : ""}`}>{value}</div>
    </div>
  );
}

function CodeBlock({ code, copyKey, copied, onCopy }) {
  return (
    <div className="code-wrap">
      <div className="code-topbar">
        <span className="code-lang">python</span>
        <button className="copy-btn" onClick={() => onCopy(code, copyKey)}>
          {copied === copyKey ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="code-pre">{code}</pre>
    </div>
  );
}

export default function TreKCTF() {
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [platform, setPlatform] = useState("HackTheBox");
  const [apiKey, setApiKey] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [clues, setClues] = useState(null);
  const [exploit, setExploit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [exploitMode, setExploitMode] = useState("bruteforce");
  const [copied, setCopied] = useState("");
  const fileRef = useRef();
  const loadingTimer = useRef(null);

  const ANALYZE_MSGS = [
    "Reading file bytes...",
    "Examining file format...",
    "Scanning for strings...",
    "Identifying binary type...",
    "Detecting input methods...",
    "Mapping attack surface...",
    "Consulting AI engine...",
    "Processing results...",
  ];
  const CLUES_MSGS = [
    "Analyzing vulnerability class...",
    "Calculating input space...",
    "Researching exploit techniques...",
    "Mapping attack vectors...",
    "Generating step-by-step plan...",
    "Cross-referencing CVE patterns...",
    "Crafting insight summary...",
  ];
  const EXPLOIT_MSGS = [
    "Initializing exploit framework...",
    "Checking pwntools compatibility...",
    "Building bruteforce logic...",
    "Generating charset table...",
    "Writing flag detection routine...",
    "Assembling Python script...",
    "Optimizing loop structure...",
    "Finalizing exploit code...",
  ];

  const startLoadingCycle = (msgs) => {
    setLoadingPhase(0);
    setLoadingMsg(msgs[0]);
    let i = 1;
    loadingTimer.current = setInterval(() => {
      setLoadingMsg(msgs[i % msgs.length]);
      i++;
    }, 1800);
  };

  const stopLoadingCycle = () => {
    if (loadingTimer.current) clearInterval(loadingTimer.current);
  };

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setAnalysis(null); setClues(null); setExploit(null); setError("");
    setStep("upload");
  };

  const readAsText = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsText(f, "latin1");
  });

  const callAI = async (messages, system) => {
    const cleanKey = apiKey.replace(/[^\x20-\x7E]/g, "").trim();
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cleanKey}`,
        "HTTP-Referer": "https://raid6-khaki.vercel.app",
        "X-Title": "TreK CTF Analyzer",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        max_tokens: 1000,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices?.[0]?.message?.content || "";
  };

  const parseJSON = (raw) => JSON.parse(raw.replace(/```json|```/g, "").trim());

  const doAnalyze = async () => {
    setLoading(true); setError(""); startLoadingCycle(ANALYZE_MSGS);
    try {
      const raw = await readAsText(file);
      const resp = await callAI([{ role: "user", content: `Analyze this CTF challenge file for a security competition. Platform: ${platform}. Filename: "${file.name}". Size: ${file.size} bytes.\n\nFile sample (first 5000 chars, latin1):\n${raw.slice(0, 5000)}\n\nReturn ONLY valid JSON:\n{\n  "fileType": "string",\n  "description": "string (2 sentences)",\n  "inputMethod": "string (e.g. scanf %c, fgets, argv)",\n  "vulnerability": "string",\n  "flag_hint": "string",\n  "strings_found": ["array of notable strings"],\n  "difficulty": "easy|medium|hard",\n  "attack_surface": "string"\n}` }],
        "You are a CTF binary analysis expert. Return ONLY valid JSON, no markdown, no explanation.");
      setAnalysis(parseJSON(resp));
      setStep("analyze");
    } catch (e) { setError("Analysis failed: " + e.message); } finally { stopLoadingCycle(); setLoading(false); }
  };

  const doClues = async () => {
    setLoading(true); setError(""); startLoadingCycle(CLUES_MSGS);
    try {
      const resp = await callAI([{ role: "user", content: `CTF analysis: ${JSON.stringify(analysis)}\nFile: "${file.name}", Platform: ${platform}\n\nReturn ONLY valid JSON:\n{\n  "clue_summary": "string",\n  "input_space": "string",\n  "attack_type": "string",\n  "steps": ["step array"],\n  "key_insight": "string",\n  "charset": "string",\n  "expected_flag_format": "string"\n}` }],
        "You are a CTF mentor. Return ONLY valid JSON.");
      setClues(parseJSON(resp));
      setStep("clues");
    } catch (e) { setError("Clue generation failed: " + e.message); } finally { stopLoadingCycle(); setLoading(false); }
  };

  const doExploit = async () => {
    setLoading(true); setError(""); startLoadingCycle(EXPLOIT_MSGS);
    try {
      const cleanKey = apiKey.replace(/[^\x20-\x7E]/g, "").trim();
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cleanKey}`,
          "HTTP-Referer": "https://raid6-khaki.vercel.app",
          "X-Title": "TreK CTF Analyzer",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          max_tokens: 3000,
          messages: [
            { role: "system", content: "You are a CTF exploit developer. Return ONLY valid JSON, no markdown fences, no explanation outside JSON." },
            { role: "user", content: `Generate a Python exploit for this CTF challenge.\nAnalysis: ${JSON.stringify(analysis)}\nClues: ${JSON.stringify(clues)}\nFile: "${file.name}", Mode: ${exploitMode}\n\nReturn ONLY valid JSON with these exact keys:\n{"script":"complete Python script as a single string with \\n for newlines","lookup_table":"Python dict string mapping 0-255 byte values to responses","usage":"how to run it","requirements":["pip packages"],"notes":"important notes"}` }
          ],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.choices?.[0]?.message?.content || "";
      setExploit(parseJSON(raw));
      setStep("exploit");
    } catch (e) { setError("Exploit generation failed: " + e.message); } finally { stopLoadingCycle(); setLoading(false); }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const reset = () => { setFile(null); setAnalysis(null); setClues(null); setExploit(null); setError(""); setStep("upload"); };

  const downloadScript = () => {
    const blob = new Blob([exploit.script], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "exploit.py"; a.click();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f5f5; }

        .app {
          min-height: 100vh;
          background: #f5f5f5;
          font-family: 'Inter', sans-serif;
          color: #111;
        }

        /* ── Header ── */
        .header {
          background: #fff;
          border-bottom: 3px solid #d00;
          padding: 0 40px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .header-left { display: flex; align-items: center; gap: 14px; }
        .logo-mark {
          width: 36px; height: 36px;
          background: #d00;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; color: #fff; font-size: 15px; letter-spacing: -0.5px;
          flex-shrink: 0;
        }
        .logo-text { font-size: 17px; font-weight: 700; color: #111; letter-spacing: -0.3px; }
        .logo-text span { color: #d00; }
        .logo-sub { font-size: 11px; color: #888; font-weight: 400; margin-top: 1px; }
        .header-right { font-size: 11px; color: #bbb; letter-spacing: 0.5px; }

        /* ── Layout ── */
        .main { max-width: 880px; margin: 0 auto; padding: 40px 24px 80px; }

        /* ── Step bar ── */
        .stepbar {
          display: flex;
          align-items: center;
          margin-bottom: 36px;
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 16px 24px;
          gap: 0;
          overflow-x: auto;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 500;
          color: #bbb;
          flex-shrink: 0;
        }
        .step.active { color: #d00; }
        .step.done { color: #111; }
        .step-num {
          width: 24px; height: 24px;
          border-radius: 50%;
          border: 1.5px solid #ddd;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 600;
          color: #bbb;
          flex-shrink: 0;
        }
        .step.active .step-num { border-color: #d00; color: #d00; background: #fff0f0; }
        .step.done .step-num { border-color: #111; background: #111; color: #fff; font-size: 11px; }
        .step-connector {
          width: 48px; height: 1px;
          background: #e5e5e5;
          margin: 0 12px;
        }

        /* ── Section ── */
        .section {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          margin-bottom: 20px;
          overflow: hidden;
          animation: rise 0.3s ease;
        }
        @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .section-head {
          padding: 16px 24px;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .section-title-text { font-size: 13px; font-weight: 600; color: #111; }
        .section-body { padding: 24px; }

        /* ── Drop zone ── */
        .dropzone {
          border: 2px dashed #ddd;
          border-radius: 6px;
          padding: 52px 20px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .dropzone:hover, .dropzone.over {
          border-color: #d00;
          background: #fff8f8;
        }
        .drop-icon {
          width: 44px; height: 44px;
          background: #fff0f0;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
          font-size: 20px;
        }
        .drop-title { font-size: 14px; font-weight: 600; color: #111; margin-bottom: 6px; }
        .drop-sub { font-size: 12px; color: #888; }
        .drop-sub span { color: #d00; }
        .drop-input { display: none; }

        /* ── File pill ── */
        .file-pill {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px;
          background: #fafafa;
          border: 1px solid #e5e5e5;
          border-radius: 5px;
          margin-top: 14px;
        }
        .file-pill-icon { font-size: 18px; }
        .file-pill-name { font-size: 13px; font-weight: 500; color: #111; flex: 1; }
        .file-pill-size { font-size: 11px; color: #888; }
        .icon-btn {
          background: none; border: none; cursor: pointer;
          color: #bbb; font-size: 14px; padding: 2px 6px;
          border-radius: 3px; transition: color 0.15s;
        }
        .icon-btn:hover { color: #d00; }

        /* ── Form controls ── */
        .form-row { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 20px; align-items: flex-end; }
        .form-field { display: flex; flex-direction: column; gap: 5px; }
        .form-label { font-size: 11px; font-weight: 600; color: #555; letter-spacing: 0.3px; text-transform: uppercase; }
        .form-select, .form-input {
          height: 36px;
          background: #fafafa;
          border: 1px solid #ddd;
          border-radius: 4px;
          color: #111;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          padding: 0 10px;
          outline: none;
          transition: border-color 0.15s;
        }
        .form-select:focus, .form-input:focus { border-color: #d00; background: #fff; }
        .form-input { width: 240px; }
        .form-input::placeholder { color: #bbb; }

        /* ── Buttons ── */
        .btn {
          display: inline-flex; align-items: center; gap: 7px;
          height: 36px; padding: 0 18px;
          border-radius: 4px;
          font-family: 'Inter', sans-serif;
          font-size: 13px; font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid transparent;
          white-space: nowrap;
        }
        .btn-primary { background: #d00; color: #fff; border-color: #d00; }
        .btn-primary:hover { background: #bb0000; border-color: #bb0000; }
        .btn-primary:disabled { background: #f0c0c0; border-color: #f0c0c0; cursor: not-allowed; }
        .btn-outline { background: #fff; color: #111; border-color: #ddd; }
        .btn-outline:hover { border-color: #aaa; }
        .btn-ghost { background: transparent; color: #555; border-color: transparent; }
        .btn-ghost:hover { background: #f5f5f5; color: #111; }

        /* ── Info grid ── */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        @media(max-width:560px) { .info-grid { grid-template-columns: 1fr; } }
        .info-card {
          background: #fafafa;
          border: 1px solid #efefef;
          border-radius: 5px;
          padding: 12px 14px;
        }
        .info-card-label { font-size: 10px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
        .info-card-value { font-size: 13px; color: #111; line-height: 1.5; font-weight: 500; }
        .info-card-value.accent { color: #d00; }

        /* ── Badge ── */
        .badge {
          display: inline-block; padding: 2px 8px;
          border-radius: 3px; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .badge-easy { background: #e8f8e8; color: #1a8a1a; }
        .badge-medium { background: #fff4e0; color: #b07000; }
        .badge-hard { background: #ffe8e8; color: #cc0000; }

        /* ── Tags ── */
        .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .tag {
          padding: 3px 10px;
          background: #fff0f0;
          border: 1px solid #fcc;
          border-radius: 3px;
          font-size: 11px;
          color: #c00;
          font-family: 'JetBrains Mono', monospace;
        }
        .tag-blue {
          background: #f0f4ff;
          border-color: #c0cff0;
          color: #2040a0;
        }

        /* ── Insight box ── */
        .insight {
          background: #fff8f8;
          border-left: 3px solid #d00;
          border-radius: 0 4px 4px 0;
          padding: 14px 16px;
          font-size: 13px;
          color: #333;
          line-height: 1.7;
          margin-bottom: 16px;
        }
        .insight strong { color: #d00; }

        /* ── Steps list ── */
        .steps-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .step-item {
          display: flex; gap: 12px; align-items: flex-start;
          font-size: 13px; color: #333; line-height: 1.6;
        }
        .step-badge {
          width: 22px; height: 22px; flex-shrink: 0;
          background: #d00; color: #fff;
          border-radius: 3px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; margin-top: 1px;
        }

        /* ── Mode tabs ── */
        .mode-tabs {
          display: flex;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
          width: fit-content;
          margin-bottom: 20px;
        }
        .mode-tab {
          padding: 7px 18px;
          font-family: 'Inter', sans-serif;
          font-size: 12px; font-weight: 600;
          cursor: pointer;
          background: #fafafa;
          border: none;
          border-right: 1px solid #ddd;
          color: #666;
          transition: all 0.15s;
        }
        .mode-tab:last-child { border-right: none; }
        .mode-tab.active { background: #d00; color: #fff; }

        /* ── Code ── */
        .code-wrap {
          border: 1px solid #e5e5e5;
          border-radius: 5px;
          overflow: hidden;
          margin-top: 4px;
        }
        .code-topbar {
          background: #f8f8f8;
          border-bottom: 1px solid #e5e5e5;
          padding: 8px 14px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .code-lang { font-size: 11px; color: #888; font-family: 'JetBrains Mono', monospace; }
        .copy-btn {
          font-family: 'Inter', sans-serif;
          font-size: 11px; font-weight: 600;
          color: #555; background: none; border: 1px solid #ddd;
          border-radius: 3px; padding: 2px 10px; cursor: pointer;
          transition: all 0.15s;
        }
        .copy-btn:hover { background: #d00; color: #fff; border-color: #d00; }
        .code-pre {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; line-height: 1.75;
          color: #1a1a2e;
          background: #fdfdfd;
          padding: 18px;
          overflow-x: auto;
          white-space: pre;
          max-height: 440px;
          overflow-y: auto;
        }

        /* ── Terminal snippet ── */
        .terminal {
          background: #1a1a1a;
          border-radius: 5px;
          overflow: hidden;
          margin-top: 16px;
        }
        .terminal-bar {
          background: #2a2a2a;
          padding: 8px 14px;
          display: flex; align-items: center; gap: 6px;
        }
        .t-dot { width: 10px; height: 10px; border-radius: 50%; }
        .t-red { background: #ff5f57; }
        .t-yellow { background: #febc2e; }
        .t-green { background: #28c840; }
        .terminal-lines { padding: 14px 18px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 2; }
        .t-line { display: flex; gap: 6px; }
        .t-prompt { color: #d44; }
        .t-cmd { color: #eee; }
        .t-out { color: #6d9; padding-left: 16px; }
        .t-comment { color: #555; }

        /* ── Requirements ── */
        .req-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .req-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; padding: 3px 10px;
          background: #f0f4ff; border: 1px solid #c0cff0;
          border-radius: 3px; color: #2040a0;
        }

        /* ── Divider ── */
        .divider { border: none; border-top: 1px solid #f0f0f0; margin: 20px 0; }

        /* ── Action row ── */
        .action-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; align-items: center; }

        /* ── Error ── */
        .error-box {
          background: #fff8f8;
          border: 1px solid #fcc;
          border-left: 3px solid #d00;
          border-radius: 4px;
          padding: 12px 16px;
          font-size: 13px;
          color: #c00;
          margin-bottom: 16px;
        }

        /* ── Loading ── */
        .overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(255,255,255,0.85);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 18px;
          backdrop-filter: blur(2px);
        }
        .spinner {
          width: 40px; height: 40px;
          border: 3px solid #f0c0c0;
          border-top-color: #d00;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .overlay-msg { font-size: 13px; font-weight: 500; color: #333; letter-spacing: 0.2px; }
        .overlay-sub { font-size: 11px; color: #aaa; margin-top: 4px; }
        .overlay-bar { width: 200px; height: 2px; background: #f0c0c0; border-radius: 1px; overflow: hidden; }
        .overlay-bar-fill { height: 100%; background: #d00; border-radius: 1px; animation: barload 1.8s ease-in-out infinite; }
        @keyframes barload { 0% { width: 0%; margin-left: 0; } 50% { width: 60%; } 100% { width: 0%; margin-left: 100%; } }

        /* ── Misc ── */
        .full-w { grid-column: 1 / -1; }
        .mt-16 { margin-top: 16px; }
        .mb-4 { margin-bottom: 4px; }
        .sec-sub { font-size: 12px; color: #888; margin-top: 2px; }
        .flex-between { display: flex; align-items: center; justify-content: space-between; }
      `}</style>

      {loading && (
        <div className="overlay">
          <div className="spinner" />
          <div className="overlay-msg">{loadingMsg}</div>
          <div className="overlay-bar"><div className="overlay-bar-fill" /></div>
          <div className="overlay-sub">TreK CTF Analyzer · AI Processing</div>
        </div>
      )}

      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <div className="logo-mark">T</div>
            <div>
              <div className="logo-text"><span>TreK</span> CTF Analyzer</div>
              <div className="logo-sub">by projectAdnan</div>
            </div>
          </div>
          <div className="header-right">AI-POWERED · CTF TOOLKIT</div>
        </header>

        <main className="main">
          <StepBar current={step} />

          {error && <div className="error-box">⚠ {error}</div>}

          {/* ── UPLOAD ── */}
          <div className="section">
            <div className="section-head">
              <div>
                <div className="section-title-text">Upload Challenge File</div>
                <div className="sec-sub">ELF binary, Python script, ZIP archive — any CTF file</div>
              </div>
            </div>
            <div className="section-body">
              <div
                className={`dropzone ${dragOver ? "over" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              >
                <div className="drop-icon">📂</div>
                <div className="drop-title">Drop your challenge file here</div>
                <div className="drop-sub">or <span>click to browse</span> — supports binaries, scripts, ZIPs</div>
                <input ref={fileRef} className="drop-input" type="file" onChange={(e) => handleFile(e.target.files[0])} />
              </div>

              {file && (
                <div className="file-pill">
                  <span className="file-pill-icon">⬡</span>
                  <span className="file-pill-name">{file.name}</span>
                  <span className="file-pill-size">{(file.size / 1024).toFixed(1)} KB</span>
                  <button className="icon-btn" onClick={reset}>✕</button>
                </div>
              )}

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Platform</label>
                  <select className="form-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">OpenRouter API Key</label>
                  <input className="form-input" type="password" placeholder="sk-or-... OpenRouter key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                </div>
                <button className="btn btn-primary" style={{ marginTop: "auto" }} disabled={!file} onClick={doAnalyze}>
                  Analyze File →
                </button>
              </div>
            </div>
          </div>

          {/* ── ANALYSIS ── */}
          {analysis && (
            <div className="section">
              <div className="section-head">
                <div>
                  <div className="section-title-text">Analysis Report</div>
                  <div className="sec-sub">{file.name}</div>
                </div>
                <span className={`badge badge-${analysis.difficulty}`}>{analysis.difficulty}</span>
              </div>
              <div className="section-body">
                <div className="info-grid">
                  <Card label="File Type" value={analysis.fileType} accent />
                  <Card label="Input Method" value={analysis.inputMethod} />
                  <Card label="Vulnerability" value={analysis.vulnerability} accent />
                  <Card label="Attack Surface" value={analysis.attack_surface} />
                  {analysis.flag_hint && <Card label="Flag Hint" value={analysis.flag_hint} accent />}
                  <Card label="Description" value={analysis.description} />
                </div>

                {analysis.strings_found?.length > 0 && (
                  <>
                    <div className="form-label mb-4">Strings Found in Binary</div>
                    <div className="tags">
                      {analysis.strings_found.map((s, i) => <span key={i} className="tag">{s}</span>)}
                    </div>
                  </>
                )}

                <div className="action-row">
                  <button className="btn btn-primary" onClick={doClues}>Generate Clues →</button>
                </div>
              </div>
            </div>
          )}

          {/* ── CLUES ── */}
          {clues && (
            <div className="section">
              <div className="section-head">
                <div className="section-title-text">Exploit Clues</div>
              </div>
              <div className="section-body">
                <div className="insight">
                  <strong>Key Insight — </strong>{clues.key_insight}
                </div>

                <div className="info-grid">
                  <Card label="Attack Type" value={clues.attack_type?.toUpperCase()} accent />
                  <Card label="Input Space" value={clues.input_space} />
                  <Card label="Charset" value={clues.charset} />
                  <Card label="Expected Flag" value={clues.expected_flag_format} accent />
                </div>

                <div className="form-label mb-4">Step-by-Step Attack Plan</div>
                <ul className="steps-list mt-16">
                  {clues.steps?.map((s, i) => (
                    <li key={i} className="step-item">
                      <div className="step-badge">{String(i + 1).padStart(2, "0")}</div>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>

                <div className="terminal">
                  <div className="terminal-bar">
                    <div className="t-dot t-red" /><div className="t-dot t-yellow" /><div className="t-dot t-green" />
                  </div>
                  <div className="terminal-lines">
                    <div className="t-line t-comment"># quick reconnaissance</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> file ./{file?.name}</span></div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> strings ./{file?.name} | grep -i flag</span></div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> chmod +x ./{file?.name} && python3 exploit.py</span></div>
                  </div>
                </div>

                <hr className="divider" />
                <div className="form-label mb-4">Exploit Generation Mode</div>
                <div className="mode-tabs">
                  <button className={`mode-tab ${exploitMode === "bruteforce" ? "active" : ""}`} onClick={() => setExploitMode("bruteforce")}>Bruteforce Script</button>
                  <button className={`mode-tab ${exploitMode === "lookup" ? "active" : ""}`} onClick={() => setExploitMode("lookup")}>Lookup Table</button>
                </div>

                <div className="action-row">
                  <button className="btn btn-primary" onClick={doExploit}>Generate Exploit →</button>
                </div>
              </div>
            </div>
          )}

          {/* ── EXPLOIT ── */}
          {exploit && (
            <div className="section">
              <div className="section-head">
                <div className="section-title-text">Exploit Script — exploit.py</div>
              </div>
              <div className="section-body">
                <div className="info-grid">
                  <Card label="Usage" value={exploit.usage} />
                  {exploit.notes && <Card label="Notes" value={exploit.notes} />}
                </div>

                {exploit.requirements?.length > 0 && (
                  <>
                    <div className="form-label mb-4">Requirements</div>
                    <div className="req-row">
                      {exploit.requirements.map((r, i) => <span key={i} className="req-tag">pip install {r}</span>)}
                    </div>
                  </>
                )}

                <div className="form-label mt-16 mb-4">
                  {exploitMode === "bruteforce" ? "Bruteforce Script" : "Lookup Table"}
                </div>
                <CodeBlock
                  code={exploitMode === "lookup" && exploit.lookup_table ? exploit.lookup_table : exploit.script}
                  copyKey="main"
                  copied={copied}
                  onCopy={copy}
                />

                {exploitMode === "lookup" && exploit.lookup_table && (
                  <>
                    <div className="form-label mt-16 mb-4">Full Bruteforce Script</div>
                    <CodeBlock code={exploit.script} copyKey="full" copied={copied} onCopy={copy} />
                  </>
                )}

                <div className="terminal">
                  <div className="terminal-bar">
                    <div className="t-dot t-red" /><div className="t-dot t-yellow" /><div className="t-dot t-green" />
                  </div>
                  <div className="terminal-lines">
                    <div className="t-line t-comment"># run your exploit</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> pip install pwntools</span></div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> python3 exploit.py</span></div>
                    <div className="t-line t-out">[*] Starting bruteforce against {file?.name}...</div>
                    <div className="t-line t-out">[+] Flag found: HTB{"{ ... }"}</div>
                  </div>
                </div>

                <div className="action-row">
                  <button className="btn btn-outline" onClick={reset}>← New Challenge</button>
                  <button className="btn btn-primary" onClick={downloadScript}>⬇ Download exploit.py</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
