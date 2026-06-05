import { useState, useRef, useEffect } from "react";

const STEPS = ["upload", "analyze", "clues", "exploit"];
const PLATFORMS = ["HackTheBox", "TryHackMe", "PicoCTF", "CTFd", "pwn.college", "Other"];
const CRITICAL_LABELS = ["vulnerability", "attack surface", "attack type"];
const SLATE_LABELS = ["file type", "input method", "charset"];

function StepBar({ current }) {
  const ci = STEPS.indexOf(current);
  return (
    <div className="stepbar">
      {STEPS.map((s, i) => (
        <div key={s} className={`step ${i < ci ? "done" : i === ci ? "active" : ""}`}>
          <div className="step-num">{i < ci ? "✓" : i + 1}</div>
          <span>{["Upload","Analyze","Clues","Exploit"][i]}</span>
          {i < STEPS.length - 1 && <div className="step-connector" />}
        </div>
      ))}
    </div>
  );
}

function Card({ label, value, accent }) {
  const lk = (label || "").toLowerCase();
  const isCritical = CRITICAL_LABELS.some(l => lk.includes(l));
  const isSlate = SLATE_LABELS.some(l => lk.includes(l));
  const cls = isCritical ? "critical" : isSlate ? "slate" : accent ? "accent" : "";
  return (
    <div className="info-card">
      <div className="info-card-label">{label}</div>
      <div className={"info-card-value " + cls}>{value}</div>
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
  const [apiKey, setApiKey] = useState(() => { try { return localStorage.getItem("trek_active_key") || ""; } catch { return ""; } });
  const [savedKeys, setSavedKeys] = useState(() => { try { return JSON.parse(localStorage.getItem("trek_saved_keys") || "[]"); } catch { return []; } });
  const [showDashboard, setShowDashboard] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyVal, setNewKeyVal] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [clues, setClues] = useState(null);
  const [exploit, setExploit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState([]);
  const [loadingTitle, setLoadingTitle] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [exploitMode, setExploitMode] = useState("bruteforce");
  const [copied, setCopied] = useState("");
  const fileRef = useRef();
  const loadingTimers = useRef([]);

  useEffect(() => { try { localStorage.setItem("trek_active_key", apiKey); } catch {} }, [apiKey]);

  const PHASE_STEPS = {
    analyze: [
      { label: "Reading file bytes", ms: 0 },
      { label: "Examining file format", ms: 1200 },
      { label: "Scanning for embedded strings", ms: 2600 },
      { label: "Identifying binary architecture", ms: 4000 },
      { label: "Detecting input methods", ms: 5400 },
      { label: "Mapping attack surface", ms: 7000 },
      { label: "Sending to AI engine", ms: 8500 },
      { label: "Processing AI response", ms: 12000 },
    ],
    clues: [
      { label: "Parsing vulnerability class", ms: 0 },
      { label: "Calculating input space", ms: 1400 },
      { label: "Researching exploit techniques", ms: 3000 },
      { label: "Mapping attack vectors", ms: 4800 },
      { label: "Generating attack plan", ms: 6400 },
      { label: "Cross-referencing CVE patterns", ms: 8000 },
      { label: "Crafting insight summary", ms: 10000 },
    ],
    exploit: [
      { label: "Initializing pwntools framework", ms: 0 },
      { label: "Determining binary architecture", ms: 1200 },
      { label: "Calculating stack offset", ms: 2800 },
      { label: "Locating ROP gadgets", ms: 4400 },
      { label: "Building payload structure", ms: 6200 },
      { label: "Writing interaction logic", ms: 8000 },
      { label: "Assembling final exploit", ms: 10000 },
      { label: "Verifying script integrity", ms: 13000 },
    ],
  };

  const startLoadingSteps = (phase, title) => {
    setLoadingTitle(title);
    setLoadingSteps([]);
    loadingTimers.current.forEach(clearTimeout);
    loadingTimers.current = [];
    const steps = PHASE_STEPS[phase];
    steps.forEach((s, i) => {
      const t = setTimeout(() => {
        setLoadingSteps(prev => {
          const next = [...prev];
          if (i > 0 && next[i - 1]) next[i - 1] = { ...next[i - 1], active: false, done: true };
          next[i] = { label: s.label, active: true, done: false };
          return next;
        });
      }, s.ms);
      loadingTimers.current.push(t);
    });
  };

  const stopLoadingSteps = () => {
    loadingTimers.current.forEach(clearTimeout);
    loadingTimers.current = [];
    setLoadingSteps(prev => prev.map(s => ({ ...s, active: false, done: true })));
  };

  const saveKey = () => {
    if (!newKeyLabel.trim() || !newKeyVal.trim()) return;
    const entry = { id: Date.now(), label: newKeyLabel.trim(), key: newKeyVal.trim() };
    const updated = [...savedKeys, entry];
    setSavedKeys(updated);
    try { localStorage.setItem("trek_saved_keys", JSON.stringify(updated)); } catch {}
    setNewKeyLabel(""); setNewKeyVal("");
  };

  const deleteKey = (id) => {
    const updated = savedKeys.filter(k => k.id !== id);
    setSavedKeys(updated);
    try { localStorage.setItem("trek_saved_keys", JSON.stringify(updated)); } catch {}
  };

  const useKey = (k) => { setApiKey(k.key); setShowDashboard(false); };

  const handleFile = (f) => {
    if (!f) return;
    setFile(f); setAnalysis(null); setClues(null); setExploit(null); setError(""); setStep("upload");
  };

  const readAsText = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsText(f, "latin1");
  });

  const parseJSON = (raw) => {
    let s = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/g, "").trim();
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
    // sanitize control characters inside string values
    s = s.replace(/"((?:[^"\\]|\\.)*)"/g, (match) =>
      match
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t")
        .replace(/[\x00-\x1F\x7F]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
    );
    try { return JSON.parse(s); } catch (e) {
      // Try to recover truncated JSON by closing open braces
      try {
        let fixed = s;
        const opens = (fixed.match(/{/g) || []).length;
        const closes = (fixed.match(/}/g) || []).length;
        for (let i = 0; i < opens - closes; i++) fixed += "}";
        return JSON.parse(fixed);
      } catch { throw new Error("JSON parse failed: " + e.message); }
    }
  };

  const cleanKey = () => apiKey.replace(/[^\x20-\x7E]/g, "").trim();

  const callAI = async (messages, system, maxTokens) => {
    const mk = cleanKey();
    const makeReq = async (model) => {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + mk,
          "HTTP-Referer": "https://raid6-khaki.vercel.app",
          "X-Title": "TreK CTF Analyzer",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens || 1000,
          messages: [{ role: "system", content: system }, ...messages],
        }),
      });
      return r.json();
    };
    let data = await makeReq("poolside/laguna-m.1:free");
    if (data.error) data = await makeReq("openai/gpt-oss-120b:free");
    if (data.error) throw new Error(data.error.message);
    return data.choices?.[0]?.message?.content || "";
  };

  const doAnalyze = async () => {
    setLoading(true); setError(""); startLoadingSteps("analyze", "Analyzing Binary");
    try {
      const raw = await readAsText(file);
      const prompt = [
        "Analyze this CTF challenge file. Platform: " + platform + ". Filename: " + file.name + ". Size: " + file.size + " bytes.",
        "",
        "File sample (first 5000 chars, latin1):",
        raw.slice(0, 5000),
        "",
        "CRITICAL: Extract EXACT literal strings the binary prints before waiting for input.",
        "NEVER invent placeholder strings like 'Enter count:' or 'Enter data:' — only use strings actually present in the file sample.",
        "If the binary uses integer input, identify the C data type and any bounds checks.",
        "If there are input loops (for i=0..N), extract the loop count and indexed prompt format.",
        "",
        "Return ONLY valid JSON (no markdown):",
        JSON.stringify({
          fileType: "string",
          description: "2 sentences",
          inputMethod: "e.g. scanf %c, fgets, gets",
          vulnerability: "string",
          flag_hint: "string",
          strings_found: ["EXACT strings from binary"],
          difficulty: "easy|medium|hard",
          attack_surface: "string",
          input_prompts: ["EXACT prompt strings binary prints before each input"],
          loop_structure: "string or null",
          integer_type: "string or null e.g. unsigned int",
          overflow_target: "string or null"
        })
      ].join("\n");
      const resp = await callAI([{ role: "user", content: prompt }],
        "You are a CTF binary analysis expert. Return ONLY valid JSON, no markdown, no explanation.", 1800);
      setAnalysis(parseJSON(resp));
      setStep("analyze");
    } catch (e) { setError("Analysis failed: " + e.message); } finally { stopLoadingSteps(); setLoading(false); }
  };

  const doClues = async () => {
    setLoading(true); setError(""); startLoadingSteps("clues", "Generating Clues");
    try {
      const prompt = [
        "CTF analysis: " + JSON.stringify(analysis),
        "File: " + file.name + ", Platform: " + platform,
        "",
        "RULES:",
        "- Use input_prompts from analysis VERBATIM in all steps.",
        "- If integer_type is unsigned int/uint32, calculate overflow: wrap = 4294967296 - target. Verify wrap fits bounds.",
        "- If loop_structure is present, describe exact loop send pattern.",
        "",
        "Return ONLY valid JSON:",
        JSON.stringify({
          clue_summary: "string",
          input_space: "string",
          attack_type: "string",
          steps: ["use EXACT prompt strings from analysis.input_prompts"],
          key_insight: "string",
          charset: "string",
          expected_flag_format: "string",
          overflow_value: "string or null — exact integer to trigger overflow",
          overflow_math: "string or null — e.g. 4294967296 - 44 = 4294967252"
        })
      ].join("\n");
      const resp = await callAI([{ role: "user", content: prompt }],
        "You are a CTF mentor. Return ONLY valid JSON. Keep all values concise.", 1800);
      setClues(parseJSON(resp));
      setStep("clues");
    } catch (e) { setError("Clue generation failed: " + e.message); } finally { stopLoadingSteps(); setLoading(false); }
  };

  const doExploit = async () => {
    setLoading(true); setError(""); startLoadingSteps("exploit", "Generating Exploit");
    try {
      const mk = cleanKey();
      const arch = analysis?.fileType?.includes("64") ? "amd64" : "i386";
      const bits = arch === "amd64" ? 64 : 32;
      const packFn = bits === 64 ? "p64" : "p32";
      const gccFlag = bits === 64 ? "" : " -m32";
      const fname = file.name;

      const promptLines = [
        "Generate a production-grade pwntools exploit for this CTF challenge.",
        "",
        "CHALLENGE DETAILS:",
        "- Filename: " + fname,
        "- Platform: " + platform,
        "- Architecture: " + arch + " (" + bits + "-bit), packing: " + packFn + "()",
        "- Analysis: " + JSON.stringify(analysis),
        "- Clues: " + JSON.stringify(clues),
        "- Mode: " + exploitMode,
        "",
        analysis?.input_prompts?.length
          ? "EXACT INPUT PROMPTS — use these VERBATIM, never substitute:\n" + analysis.input_prompts.map((p, i) => "  [" + i + "] b'" + p + "'").join("\n")
          : "No prompts extracted — use p.recvuntil() to detect them at runtime.",
        clues?.overflow_value ? "INTEGER OVERFLOW: send exactly " + clues.overflow_value + " (" + (clues.overflow_math || "see clues") + "). Show math in comment." : "",
        analysis?.loop_structure ? "LOOP STRUCTURE: " + analysis.loop_structure + " — replicate EXACTLY in Python." : "",
        "",
        "STRICT SCRIPT STRUCTURE (no exceptions):",
        "LINE 1: from pwn import *",
        "LINE 2: context.update(arch='" + arch + "', os='linux', endian='little')",
        "LINE 3: p = remote(args.HOST, int(args.PORT)) if args.REMOTE else process('./" + fname + "')",
        "",
        "PAYLOAD RULES:",
        "- Use " + packFn + "() for all address packing",
        "- Hardcode exact offset — NO brute-force loops for offsets",
        "- payload = b'A' * OFFSET + " + packFn + "(ADDRESS)",
        "- Preserve trailing spaces in prompt strings exactly",
        "- Use p.sendlineafter(b'EXACT_PROMPT', payload)",
        bits === 64 ? "- Add ret gadget for 16-byte stack alignment if calling glibc" : "",
        "- End with p.interactive()",
        "- Add inline comments on every non-trivial line",
        exploitMode === "lookup" ? "- Build complete lookup_table dict mapping all 256 byte values (0-255) to binary responses" : "",
        "",
        "APPEND AS COMMENTS AT END OF SCRIPT:",
        "# --- COMPILE ---",
        "# gcc -fno-stack-protector -no-pie" + gccFlag + " " + fname + ".c -o " + fname,
        "# --- RUN LOCAL ---",
        "# python3 exploit.py",
        "# --- RUN REMOTE ---",
        "# python3 exploit.py REMOTE HOST=TARGET_IP PORT=TARGET_PORT",
        "",
        "Return ONLY this JSON (no markdown, no backticks, pure JSON):",
        '{"script":"COMPLETE_SCRIPT_WITH_NEWLINES_AS_\\n","lookup_table":"256_DICT_OR_EMPTY","usage":"python3 exploit.py","requirements":["pwntools"],"notes":"KEY_NOTES","arch":"' + arch + '","bits":' + bits + ',"gcc_cmd":"gcc -fno-stack-protector -no-pie' + gccFlag + ' ' + fname + '.c -o ' + fname + '"}'
      ].filter(Boolean).join("\n");

      const systemPrompt = [
        "You are an elite CTF binary exploitation engineer. You write production-grade pwntools scripts that work on first run.",
        "ABSOLUTE RULES:",
        "1. INPUT PROMPTS: Use ONLY exact literal strings from analysis.input_prompts. NEVER invent 'Enter count:', 'Enter data:', 'Enter choice:'.",
        "2. NO PLACEHOLDERS: If prompt is unknown, use p.recvuntil() — never guess.",
        "3. LOOP FIDELITY: Match loop count and indexed format exactly.",
        "4. OVERFLOW MATH: Use clues.overflow_value exactly. Show verification in a comment.",
        "5. Return ONLY valid JSON. No markdown. No explanation outside JSON."
      ].join("\n");

      const makeReq = async (model) => {
        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + mk,
            "HTTP-Referer": "https://raid6-khaki.vercel.app",
            "X-Title": "TreK CTF Analyzer",
          },
          body: JSON.stringify({
            model,
            max_tokens: 3000,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: promptLines },
            ],
          }),
        });
        return r.json();
      };

      let data = await makeReq("poolside/laguna-m.1:free");
      if (data.error) data = await makeReq("openai/gpt-oss-120b:free");
      if (data.error) throw new Error(data.error.message);
      const raw = data.choices?.[0]?.message?.content || "";
      setExploit(parseJSON(raw));
      setStep("exploit");
    } catch (e) { setError("Exploit generation failed: " + e.message); } finally { stopLoadingSteps(); setLoading(false); }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const reset = () => { setFile(null); setAnalysis(null); setClues(null); setExploit(null); setError(""); setStep("upload"); };

  const downloadScript = () => {
    const blob = new Blob([exploit.script], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "exploit.py";
    a.click();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f5f5; }
        .app { min-height: 100vh; background: #f5f5f5; font-family: 'Inter', sans-serif; color: #111; }

        /* Header */
        .header { background: #fff; border-bottom: 3px solid #d00; padding: 0 24px; height: 64px; display: flex; align-items: center; gap: 14px; position: sticky; top: 0; z-index: 50; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .logo-mark { width: 36px; height: 36px; background: #d00; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: 15px; flex-shrink: 0; border-radius: 2px; }
        .logo-text { font-size: 17px; font-weight: 700; color: #111; }
        .logo-text span { color: #d00; }
        .logo-sub { font-size: 11px; color: #888; margin-top: 1px; }
        .header-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }

        /* Key indicator */
        .key-indicator { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #555; font-weight: 500; }
        .key-dot { width: 7px; height: 7px; border-radius: 50%; background: #22a722; display: inline-block; animation: pulse 2s infinite; }

        /* Layout */
        .main { max-width: 880px; margin: 0 auto; padding: 32px 16px 80px; }

        /* Step bar */
        .stepbar { display: flex; align-items: center; margin-bottom: 28px; background: #fff; border: 1px solid #e5e5e5; border-radius: 6px; padding: 14px 20px; overflow-x: auto; gap: 0; }
        .step { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: #bbb; flex-shrink: 0; }
        .step.active { color: #d00; }
        .step.done { color: #111; }
        .step-num { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #bbb; flex-shrink: 0; }
        .step.active .step-num { border-color: #d00; color: #d00; background: #fff0f0; }
        .step.done .step-num { border-color: #111; background: #111; color: #fff; font-size: 11px; }
        .step-connector { width: 40px; height: 1px; background: #e5e5e5; margin: 0 10px; }

        /* Section */
        .section { background: #fff; border: 1px solid #e5e5e5; border-radius: 6px; margin-bottom: 16px; overflow: hidden; animation: slideUp 0.35s cubic-bezier(.22,.68,0,1.2) both; }
        .section-head { padding: 14px 20px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: space-between; }
        .section-title-text { font-size: 13px; font-weight: 600; color: #111; }
        .sec-sub { font-size: 11px; color: #888; margin-top: 2px; }
        .section-body { padding: 20px; }

        /* Drop zone */
        .dropzone { border: 2px dashed #ddd; border-radius: 6px; padding: 44px 20px; text-align: center; cursor: pointer; transition: all 0.25s cubic-bezier(.22,.68,0,1.2); }
        .dropzone:hover, .dropzone.over { border-color: #d00; background: #fff8f8; transform: scale(1.01); }
        .drop-icon { width: 44px; height: 44px; background: #fff0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 20px; }
        .drop-title { font-size: 14px; font-weight: 600; color: #111; margin-bottom: 5px; }
        .drop-sub { font-size: 12px; color: #888; }
        .drop-sub span { color: #d00; }
        .drop-input { display: none; }

        /* File pill */
        .file-pill { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #fafafa; border: 1px solid #e5e5e5; border-radius: 5px; margin-top: 12px; }
        .file-pill-name { font-size: 13px; font-weight: 500; flex: 1; }
        .file-pill-size { font-size: 11px; color: #888; }
        .icon-btn { background: none; border: none; cursor: pointer; color: #bbb; font-size: 14px; padding: 2px 6px; border-radius: 3px; transition: color 0.15s; }
        .icon-btn:hover { color: #d00; }

        /* Forms */
        .form-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; align-items: flex-end; }
        .form-field { display: flex; flex-direction: column; gap: 5px; }
        .form-label { font-size: 11px; font-weight: 600; color: #555; letter-spacing: 0.3px; text-transform: uppercase; }
        .form-select, .form-input { height: 36px; background: #fafafa; border: 1px solid #ddd; border-radius: 4px; color: #111; font-family: 'Inter', sans-serif; font-size: 13px; padding: 0 10px; outline: none; transition: border-color 0.15s; }
        .form-select:focus, .form-input:focus { border-color: #d00; background: #fff; }
        .form-input { width: 220px; }
        .form-input::placeholder { color: #bbb; }

        /* Buttons */
        .btn { display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 18px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.18s cubic-bezier(.22,.68,0,1.2); border: 1px solid transparent; white-space: nowrap; }
        .btn-primary { background: #d00; color: #fff; border-color: #d00; }
        .btn-primary:hover { background: #bb0000; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(204,0,0,0.25); }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary:disabled { background: #f0c0c0; border-color: #f0c0c0; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-outline { background: #fff; color: #111; border-color: #ddd; }
        .btn-outline:hover { border-color: #aaa; }

        /* Info grid */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        @media(max-width:560px) { .info-grid { grid-template-columns: 1fr; } }
        .info-card { background: #fafafa; border: 1px solid #efefef; border-radius: 5px; padding: 12px 14px; transition: box-shadow 0.2s, transform 0.2s; }
        .info-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); transform: translateY(-1px); }
        .info-card-label { font-size: 10px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
        .info-card-value { font-size: 13px; color: #111; line-height: 1.5; font-weight: 500; }
        .info-card-value.critical { color: #b30000; font-weight: 600; }
        .info-card-value.slate { color: #444; }
        .info-card-value.accent { color: #d00; }

        /* Badge */
        .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-easy { background: #e8f8e8; color: #1a8a1a; }
        .badge-medium { background: #fff4e0; color: #b07000; }
        .badge-hard { background: #ffe8e8; color: #cc0000; }

        /* Tags */
        .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .tag { padding: 3px 10px; background: #fff0f0; border: 1px solid #fcc; border-radius: 3px; font-size: 11px; color: #c00; font-family: 'JetBrains Mono', monospace; }

        /* Insight */
        .insight { background: #fff8f8; border-left: 3px solid #d00; border-radius: 0 4px 4px 0; padding: 12px 14px; font-size: 13px; color: #333; line-height: 1.7; margin-bottom: 14px; }
        .insight strong { color: #d00; }

        /* Steps list */
        .steps-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .step-item { display: flex; gap: 12px; align-items: flex-start; font-size: 13px; color: #333; line-height: 1.6; }
        .step-badge { width: 22px; height: 22px; flex-shrink: 0; background: #d00; color: #fff; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; margin-top: 1px; }

        /* Mode tabs */
        .mode-tabs { display: flex; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; width: fit-content; margin-bottom: 16px; }
        .mode-tab { padding: 7px 16px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; background: #fafafa; border: none; border-right: 1px solid #ddd; color: #666; transition: all 0.15s; }
        .mode-tab:last-child { border-right: none; }
        .mode-tab.active { background: #d00; color: #fff; }

        /* Code */
        .code-wrap { border: 1px solid #e5e5e5; border-radius: 5px; overflow: hidden; margin-top: 4px; }
        .code-topbar { background: #f8f8f8; border-bottom: 1px solid #e5e5e5; padding: 8px 14px; display: flex; align-items: center; justify-content: space-between; }
        .code-lang { font-size: 11px; color: #888; font-family: 'JetBrains Mono', monospace; }
        .copy-btn { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; color: #555; background: none; border: 1px solid #ddd; border-radius: 3px; padding: 2px 10px; cursor: pointer; transition: all 0.15s; }
        .copy-btn:hover { background: #d00; color: #fff; border-color: #d00; }
        .code-pre { font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.75; color: #1a1a2e; background: #fdfdfd; padding: 16px; overflow-x: auto; white-space: pre; max-height: 440px; overflow-y: auto; }

        /* Terminal */
        .terminal { background: #1a1a1a; border-radius: 5px; overflow: hidden; margin-top: 14px; }
        .terminal-bar { background: #2a2a2a; padding: 8px 14px; display: flex; align-items: center; gap: 6px; }
        .t-dot { width: 10px; height: 10px; border-radius: 50%; }
        .t-red { background: #ff5f57; } .t-yellow { background: #febc2e; } .t-green { background: #28c840; }
        .terminal-lines { padding: 12px 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 2; }
        .t-line { display: flex; gap: 6px; }
        .t-prompt { color: #d44; }
        .t-cmd { color: #eee; }
        .t-out { color: #6d9; padding-left: 16px; }
        .t-comment { color: #555; }

        /* Requirements */
        .req-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .req-tag { font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 3px 10px; background: #f0f4ff; border: 1px solid #c0cff0; border-radius: 3px; color: #2040a0; }

        /* Action row */
        .action-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; align-items: center; }
        .divider { border: none; border-top: 1px solid #f0f0f0; margin: 16px 0; }
        .mt-16 { margin-top: 16px; }
        .mb-4 { margin-bottom: 4px; }

        /* Error */
        .error-box { background: #fff8f8; border: 1px solid #fcc; border-left: 3px solid #d00; border-radius: 4px; padding: 12px 16px; font-size: 13px; color: #c00; margin-bottom: 14px; }

        /* Loading overlay */
        .overlay { position: fixed; inset: 0; z-index: 200; background: rgba(255,255,255,0.92); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px); animation: fadeIn 0.2s ease; }
        .overlay-card { background: #fff; border: 1px solid #e5e5e5; border-top: 3px solid #d00; border-radius: 6px; padding: 24px 28px; width: 320px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); animation: slideUp 0.25s cubic-bezier(.22,.68,0,1.2); }
        .overlay-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
        .spinner { width: 20px; height: 20px; flex-shrink: 0; border: 2px solid #f0c0c0; border-top-color: #d00; border-radius: 50%; animation: spin 0.7s linear infinite; }
        .overlay-title { font-size: 14px; font-weight: 700; color: #111; }
        .overlay-steps { display: flex; flex-direction: column; gap: 8px; }
        .overlay-step { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #bbb; transition: color 0.3s; }
        .overlay-step.active { color: #111; font-weight: 500; }
        .overlay-step.done { color: #888; }
        .step-icon { width: 16px; height: 16px; flex-shrink: 0; border-radius: 50%; border: 1.5px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 9px; position: relative; overflow: hidden; }
        .overlay-step.active .step-icon { border-color: #d00; background: #fff0f0; }
        .overlay-step.active .step-icon::after { content: ''; position: absolute; inset: 2px; border-radius: 50%; border: 1.5px solid transparent; border-top-color: #d00; animation: spin 0.7s linear infinite; }
        .overlay-step.done .step-icon { background: #d00; border-color: #d00; }
        .overlay-step.done .step-icon::before { content: "✓"; color: #fff; font-size: 9px; }
        .overlay-footer { margin-top: 14px; padding-top: 12px; border-top: 1px solid #f0f0f0; font-size: 10px; color: #666; letter-spacing: 0.5px; font-weight: 500; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease; padding: 16px; }
        .modal-card { background: #fff; border-radius: 8px; border-top: 3px solid #d00; width: 100%; max-width: 460px; box-shadow: 0 16px 48px rgba(0,0,0,0.18); animation: slideUp 0.25s cubic-bezier(.22,.68,0,1.2); overflow: hidden; }
        .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #f0f0f0; }
        .modal-title { font-size: 15px; font-weight: 700; color: #111; }
        .modal-body { padding: 18px; }
        .modal-section-label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; }
        .active-key-box { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #fafafa; border: 1px solid #eee; border-radius: 5px; }
        .active-key-val { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #333; flex: 1; }
        .saved-keys-list { display: flex; flex-direction: column; gap: 6px; }
        .saved-key-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid #eee; border-radius: 5px; transition: background 0.15s; }
        .saved-key-row:hover { background: #fafafa; }
        .saved-key-info { display: flex; flex-direction: column; gap: 2px; }
        .saved-key-label { font-size: 13px; font-weight: 600; color: #111; }
        .saved-key-preview { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #888; }
        .add-key-form { display: flex; gap: 8px; flex-wrap: wrap; }
        .modal-footer-note { font-size: 11px; color: #888; margin-top: 12px; line-height: 1.5; }

        /* Animations */
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .section:nth-child(1) { animation-delay: 0s; }
        .section:nth-child(2) { animation-delay: 0.05s; }
        .section:nth-child(3) { animation-delay: 0.1s; }
        .section:nth-child(4) { animation-delay: 0.15s; }
      `}</style>

      {loading && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="overlay-head">
              <div className="spinner" />
              <div className="overlay-title">{loadingTitle}</div>
            </div>
            <div className="overlay-steps">
              {loadingSteps.map((s, i) => (
                <div key={i} className={"overlay-step " + (s.done ? "done" : s.active ? "active" : "")}>
                  <div className="step-icon" />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
            <div className="overlay-footer">TreK CTF Analyzer · AI Processing</div>
          </div>
        </div>
      )}

      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="logo-mark">T</div>
          <div>
            <div className="logo-text"><span>TreK</span> CTF Analyzer</div>
            <div className="logo-sub">by projectAdnan</div>
          </div>
          <div className="header-right">
            {apiKey && <div className="key-indicator"><span className="key-dot" />API Active</div>}
            <button className="btn btn-outline" style={{ height: 32, padding: "0 12px", fontSize: 11 }} onClick={() => setShowDashboard(true)}>⚙ API Keys</button>
          </div>
        </header>

        {/* API Dashboard Modal */}
        {showDashboard && (
          <div className="modal-overlay" onClick={() => setShowDashboard(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-title">API Key Dashboard</div>
                <button className="icon-btn" onClick={() => setShowDashboard(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="modal-section-label">Active Key</div>
                <div className="active-key-box">
                  <span className="key-dot" style={{ flexShrink: 0 }} />
                  <span className="active-key-val">{apiKey ? apiKey.slice(0, 8) + "•".repeat(16) : "No key selected"}</span>
                  {apiKey && <button className="icon-btn" style={{ marginLeft: "auto", fontSize: 11, color: "#d00" }} onClick={() => { setApiKey(""); }}>Clear</button>}
                </div>

                {savedKeys.length > 0 && (
                  <>
                    <div className="modal-section-label" style={{ marginTop: 16 }}>Saved Keys</div>
                    <div className="saved-keys-list">
                      {savedKeys.map(k => (
                        <div key={k.id} className="saved-key-row">
                          <div className="saved-key-info">
                            <span className="saved-key-label">{k.label}</span>
                            <span className="saved-key-preview">{k.key.slice(0, 8)}{"•".repeat(12)}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-primary" style={{ height: 28, padding: "0 12px", fontSize: 11 }} onClick={() => useKey(k)}>Use</button>
                            <button className="icon-btn" style={{ color: "#d00" }} onClick={() => deleteKey(k.id)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="modal-section-label" style={{ marginTop: 16 }}>Add New Key</div>
                <div className="add-key-form">
                  <input className="form-input" style={{ flex: 1, minWidth: 0 }} placeholder="Label" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} />
                  <input className="form-input" style={{ flex: 2, minWidth: 0 }} type="password" placeholder="sk-or-..." value={newKeyVal} onChange={e => setNewKeyVal(e.target.value)} />
                  <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={saveKey}>Save</button>
                </div>

                <div className="modal-section-label" style={{ marginTop: 16 }}>Use Key Directly</div>
                <input className="form-input" style={{ width: "100%" }} type="password" placeholder="Paste key to use now..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
                <div className="modal-footer-note">Keys are stored in your browser only. Never sent anywhere except OpenRouter.</div>
              </div>
            </div>
          </div>
        )}

        <main className="main">
          <StepBar current={step} />
          {error && <div className="error-box">⚠ {error}</div>}

          {/* Upload */}
          <div className="section">
            <div className="section-head">
              <div>
                <div className="section-title-text">Upload Challenge File</div>
                <div className="sec-sub">ELF binary, Python script, ZIP archive — any CTF file</div>
              </div>
            </div>
            <div className="section-body">
              <div
                className={"dropzone " + (dragOver ? "over" : "")}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              >
                <div className="drop-icon">📂</div>
                <div className="drop-title">Drop your challenge file here</div>
                <div className="drop-sub">or <span>click to browse</span> — supports binaries, scripts, ZIPs</div>
                <input ref={fileRef} className="drop-input" type="file" onChange={e => handleFile(e.target.files[0])} />
              </div>

              {file && (
                <div className="file-pill">
                  <span>⬡</span>
                  <span className="file-pill-name">{file.name}</span>
                  <span className="file-pill-size">{(file.size / 1024).toFixed(1)} KB</span>
                  <button className="icon-btn" onClick={reset}>✕</button>
                </div>
              )}

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Platform</label>
                  <select className="form-select" value={platform} onChange={e => setPlatform(e.target.value)}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">OpenRouter API Key</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="form-input" type="password" placeholder={apiKey ? "Key loaded ✓" : "sk-or-... or manage in ⚙"} value={apiKey} onChange={e => setApiKey(e.target.value)} />
                    <button className="btn btn-outline" style={{ height: 36, padding: "0 10px", fontSize: 11, flexShrink: 0 }} onClick={() => setShowDashboard(true)}>⚙</button>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: "auto" }} disabled={!file} onClick={doAnalyze}>
                  Analyze File →
                </button>
              </div>
            </div>
          </div>

          {/* Analysis */}
          {analysis && (
            <div className="section">
              <div className="section-head">
                <div>
                  <div className="section-title-text">Analysis Report</div>
                  <div className="sec-sub">{file.name}</div>
                </div>
                <span className={"badge badge-" + (analysis.difficulty || "medium")}>{analysis.difficulty}</span>
              </div>
              <div className="section-body">
                <div className="info-grid">
                  <Card label="File Type" value={analysis.fileType} />
                  <Card label="Input Method" value={analysis.inputMethod} />
                  <Card label="Vulnerability" value={analysis.vulnerability} accent />
                  <Card label="Attack Surface" value={analysis.attack_surface} accent />
                  {analysis.flag_hint && <Card label="Flag Hint" value={analysis.flag_hint} accent />}
                  {analysis.integer_type && <Card label="Integer Type" value={analysis.integer_type} />}
                  {analysis.loop_structure && <Card label="Loop Structure" value={analysis.loop_structure} />}
                  {analysis.overflow_target && <Card label="Overflow Target" value={analysis.overflow_target} accent />}
                  <div className="info-card" style={{ gridColumn: "1/-1" }}>
                    <div className="info-card-label">Description</div>
                    <div className="info-card-value">{analysis.description}</div>
                  </div>
                </div>

                {analysis.strings_found?.length > 0 && (
                  <>
                    <div className="form-label mb-4">Strings Found in Binary</div>
                    <div className="tags">{analysis.strings_found.map((s, i) => <span key={i} className="tag">{s}</span>)}</div>
                  </>
                )}

                {analysis.input_prompts?.length > 0 && (
                  <>
                    <div className="form-label mb-4" style={{ marginTop: 12 }}>Exact Input Prompts</div>
                    <div className="tags">{analysis.input_prompts.map((s, i) => <span key={i} className="tag" style={{ background: "#f0fff0", borderColor: "#9c9", color: "#060" }}>{s}</span>)}</div>
                  </>
                )}

                <div className="action-row">
                  <button className="btn btn-primary" onClick={doClues}>Generate Clues →</button>
                </div>
              </div>
            </div>
          )}

          {/* Clues */}
          {clues && (
            <div className="section">
              <div className="section-head">
                <div className="section-title-text">Exploit Clues</div>
              </div>
              <div className="section-body">
                <div className="insight"><strong>Key Insight — </strong>{clues.key_insight}</div>

                <div className="info-grid">
                  <Card label="Attack Type" value={clues.attack_type?.toUpperCase()} accent />
                  <Card label="Input Space" value={clues.input_space} />
                  <Card label="Charset" value={clues.charset} />
                  <Card label="Expected Flag" value={clues.expected_flag_format} accent />
                  {clues.overflow_value && <Card label="Overflow Value" value={clues.overflow_value} accent />}
                  {clues.overflow_math && <Card label="Overflow Math" value={clues.overflow_math} />}
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
                    <span style={{ marginLeft: 8, fontSize: 10, color: "#555" }}>quick recon</span>
                  </div>
                  <div className="terminal-lines">
                    <div className="t-line t-comment"># quick reconnaissance</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> file ./{file?.name}</span></div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> strings ./{file?.name} | grep -i flag</span></div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> checksec --file=./{file?.name}</span></div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> chmod +x exploit.py && python3 exploit.py</span></div>
                  </div>
                </div>

                <hr className="divider" />
                <div className="form-label mb-4">Exploit Generation Mode</div>
                <div className="mode-tabs">
                  <button className={"mode-tab " + (exploitMode === "bruteforce" ? "active" : "")} onClick={() => setExploitMode("bruteforce")}>Bruteforce Script</button>
                  <button className={"mode-tab " + (exploitMode === "lookup" ? "active" : "")} onClick={() => setExploitMode("lookup")}>Lookup Table</button>
                </div>

                <div className="action-row">
                  <button className="btn btn-primary" onClick={doExploit}>Generate Exploit →</button>
                </div>
              </div>
            </div>
          )}

          {/* Exploit */}
          {exploit && (
            <div className="section">
              <div className="section-head">
                <div className="section-title-text">Exploit Script — exploit.py</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {exploit.arch && <span className="badge badge-medium">{exploit.arch?.toUpperCase()}</span>}
                  {exploit.bits && <span className="badge badge-easy">{exploit.bits}-BIT</span>}
                </div>
              </div>
              <div className="section-body">
                <div className="info-grid">
                  {exploit.notes && <Card label="Notes" value={exploit.notes} />}
                  {exploit.usage && <Card label="Usage" value={exploit.usage} accent />}
                </div>

                {exploit.requirements?.length > 0 && (
                  <>
                    <div className="form-label mb-4 mt-16">Requirements</div>
                    <div className="req-row">{exploit.requirements.map((r, i) => <span key={i} className="req-tag">pip install {r}</span>)}</div>
                  </>
                )}

                <div className="form-label mt-16 mb-4">exploit.py</div>
                <CodeBlock code={exploit.script} copyKey="script" copied={copied} onCopy={copy} />

                {exploitMode === "lookup" && exploit.lookup_table && (
                  <>
                    <div className="form-label mt-16 mb-4">Lookup Table (256-char map)</div>
                    <CodeBlock code={exploit.lookup_table} copyKey="lookup" copied={copied} onCopy={copy} />
                  </>
                )}

                <div className="terminal" style={{ marginTop: 16 }}>
                  <div className="terminal-bar">
                    <div className="t-dot t-red" /><div className="t-dot t-yellow" /><div className="t-dot t-green" />
                    <span style={{ marginLeft: 8, fontSize: 10, color: "#555" }}>quick reference</span>
                  </div>
                  <div className="terminal-lines">
                    <div className="t-line t-comment"># 1. install</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> pip install pwntools</span></div>
                    <div className="t-line t-comment"># 2. compile (if source available)</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> {exploit.gcc_cmd || ("gcc -fno-stack-protector -no-pie " + file?.name + ".c -o " + file?.name)}</span></div>
                    <div className="t-line t-comment"># 3. run local</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> python3 exploit.py</span></div>
                    <div className="t-line t-comment"># 4. run remote</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> python3 exploit.py REMOTE HOST=TARGET_IP PORT=TARGET_PORT</span></div>
                    <div className="t-line t-out">[+] Flag: {"{ ... }"}</div>
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
