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

const CRITICAL_LABELS = ["vulnerability", "attack surface", "attack type"];
const SLATE_LABELS = ["file type", "input method", "charset"];

function Card({ label, value, accent }) {
  const lk = label.toLowerCase();
  const isCritical = CRITICAL_LABELS.some(l => lk.includes(l));
  const isSlate = SLATE_LABELS.some(l => lk.includes(l));
  const cls = isCritical ? "critical" : isSlate ? "slate" : accent ? "accent" : "";
  return (
    <div className="info-card">
      <div className="info-card-label">{label}</div>
      <div className={`info-card-value ${cls}`}>{value}</div>
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
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("trek_active_key") || "");
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

  // persist active key
  useEffect(() => { localStorage.setItem("trek_active_key", apiKey); }, [apiKey]);

  const saveKey = () => {
    if (!newKeyLabel.trim() || !newKeyVal.trim()) return;
    const entry = { id: Date.now(), label: newKeyLabel.trim(), key: newKeyVal.trim() };
    const updated = [...savedKeys, entry];
    setSavedKeys(updated);
    localStorage.setItem("trek_saved_keys", JSON.stringify(updated));
    setNewKeyLabel(""); setNewKeyVal("");
  };

  const deleteKey = (id) => {
    const updated = savedKeys.filter(k => k.id !== id);
    setSavedKeys(updated);
    localStorage.setItem("trek_saved_keys", JSON.stringify(updated));
  };

  const useKey = (k) => {
    setApiKey(k.key);
    setShowDashboard(false);
  };

  const PHASE_STEPS = {
    analyze: [
      { label: "Reading file bytes", ms: 0 },
      { label: "Examining file format", ms: 1200 },
      { label: "Scanning for embedded strings", ms: 2400 },
      { label: "Identifying binary architecture", ms: 3800 },
      { label: "Detecting input methods", ms: 5200 },
      { label: "Mapping attack surface", ms: 6800 },
      { label: "Sending to AI engine", ms: 8200 },
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
          // mark previous as done
          if (i > 0) next[i-1] = { ...next[i-1], done: true };
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
        model: "poolside/laguna-m.1:free",
        max_tokens: 1000,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    const data = await res.json();
    // fallback to DeepSeek R1 if rate limited
    if (data.error?.code === 429 || data.error?.message?.includes("rate") || data.error?.message?.includes("endpoint")) {
      const res2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cleanKey}`,
          "HTTP-Referer": "https://raid6-khaki.vercel.app",
          "X-Title": "TreK CTF Analyzer",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b:free",
          max_tokens: 1000,
          messages: [{ role: "system", content: system }, ...messages],
        }),
      });
      const data2 = await res2.json();
      if (data2.error) throw new Error(data2.error.message);
      return data2.choices?.[0]?.message?.content || "";
    }
    if (data.error) throw new Error(data.error.message);
    return data.choices?.[0]?.message?.content || "";
  };

  const parseJSON = (raw) => {
    // Step 1: strip markdown fences
    let s = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/g, "").trim();

    // Step 2: extract first {...} block in case model adds preamble
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end !== -1) s = s.slice(start, end + 1);

    // Step 3: sanitize control characters INSIDE JSON string values only
    // Replace raw newlines/tabs/carriage returns inside string values with escaped versions
    s = s.replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (match) =>
        match
          .replace(/\n/g, "\\n")     // raw newline → \n
          .replace(/\r/g, "\\r")     // raw CR → \r
          .replace(/\t/g, "\\t")     // raw tab → \t
          .replace(/[\x00-\x1F\x7F]/g, (c) => {
            const hex = c.charCodeAt(0).toString(16).padStart(4, "0");
            return `\\u${hex}`;
          })
    );

    try {
      return JSON.parse(s);
    } catch (e) {
      // Step 4: last resort — use Function constructor to eval as JS object literal
      try {
        // eslint-disable-next-line no-new-func
        return Function('"use strict"; return (' + s + ')')();
      } catch {
        throw new Error("JSON parse failed: " + e.message);
      }
    }
  };

  const doAnalyze = async () => {
    setLoading(true); setError(""); startLoadingSteps('analyze', 'Analyzing Binary');
    try {
      const raw = await readAsText(file);
      const resp = await callAI([{ role: "user", content: `Analyze this CTF challenge file for a security competition. Platform: ${platform}. Filename: "${file.name}". Size: ${file.size} bytes.

File sample (first 5000 chars, latin1):
${raw.slice(0, 5000)}

CRITICAL EXTRACTION RULES:
1. Extract the EXACT literal prompt strings the binary prints before waiting for input.
   - Scan the strings_found list and file content for printf/puts/write output strings.
   - Examples: "Enter your name: ", "Config index 3: ", "Place your bet: " — use the EXACT text.
   - NEVER invent generic placeholders like "Enter count:" or "Enter data:" if real strings exist.
2. If the binary uses integer input, identify the exact C data type (int, unsigned int, long, size_t).
   - Note any bounds checks visible in the source (e.g., count > 0 && count < 512).
   - Flag any integer overflow potential (e.g., unsigned 32-bit rollover past 4294967295).
3. For looping input (e.g., for i in 0..N), extract the loop count and the indexed prompt format.

Return ONLY valid JSON:
{
  "fileType": "string",
  "description": "string (2 sentences)",
  "inputMethod": "string (exact method: scanf %c, fgets, read, gets, etc.)",
  "vulnerability": "string",
  "flag_hint": "string",
  "strings_found": ["EXACT literal strings from binary — prompts, banners, format strings"],
  "difficulty": "easy|medium|hard",
  "attack_surface": "string",
  "input_prompts": ["EXACT prompt strings binary prints before each input, e.g. 'Place your bet: '"],
  "loop_structure": "string or null — describe any input loops (e.g. 'for i in 0..16: sends Config index i')",
  "integer_type": "string or null — C type of key integer inputs (e.g. 'unsigned int', 'size_t')",
  "overflow_target": "string or null — describe overflow if applicable (e.g. 'unsigned 32-bit wraps at 4294967296')"
}` }],
        "You are a CTF binary analysis expert. Return ONLY valid JSON, no markdown, no explanation.");
      setAnalysis(parseJSON(resp));
      setStep("analyze");
    } catch (e) { setError("Analysis failed: " + e.message); } finally { stopLoadingSteps(); setLoading(false); }
  };

  const doClues = async () => {
    setLoading(true); setError(""); startLoadingSteps('clues', 'Generating Clues');
    try {
      const resp = await callAI([{ role: "user", content: `CTF analysis: ${JSON.stringify(analysis)}
File: "${file.name}", Platform: ${platform}

RULES:
- If input_prompts are provided in the analysis, use them VERBATIM in all steps and scripts.
- If integer_type is unsigned int/uint32 and overflow_target is set, calculate the exact overflow value:
  wrap = 4294967296 - target_low_value. Verify wrap % (upper_bound+1) == target_low_value.
- If loop_structure is present, describe how to send data in the exact loop pattern.

Return ONLY valid JSON:
{
  "clue_summary": "string",
  "input_space": "string",
  "attack_type": "string",
  "steps": ["step array — use EXACT prompt strings from analysis.input_prompts"],
  "key_insight": "string",
  "charset": "string",
  "expected_flag_format": "string",
  "overflow_value": "string or null — the exact integer to send to trigger overflow",
  "overflow_math": "string or null — show the calculation e.g. 4294967296 - 44 = 4294967252"
}` }],
        "You are a CTF mentor. Return ONLY valid JSON.");
      setClues(parseJSON(resp));
      setStep("clues");
    } catch (e) { setError("Clue generation failed: " + e.message); } finally { stopLoadingSteps(); setLoading(false); }
  };

  const doExploit = async () => {
    setLoading(true); setError(""); startLoadingSteps('exploit', 'Generating Exploit');
    try {
      const cleanKey = apiKey.replace(/[^\x20-\x7E]/g, "").trim();
      const systemPrompt = `You are an elite CTF binary exploitation engineer. You write production-grade pwntools scripts that work on first run.

ABSOLUTE RULES — NEVER VIOLATE:
1. INPUT PROMPT ACCURACY: Never invent or guess prompt strings. Use ONLY the exact literal strings from analysis.input_prompts. If a prompt is "Place your bet: " use b'Place your bet: ' exactly — including spaces.
2. NO GENERIC PLACEHOLDERS: Never use b'Enter count:', b'Enter data:', b'Enter choice:' or any invented string. If you don't know the exact prompt, use p.recvuntil() to wait for it by its real content.
3. LOOP FIDELITY: If analysis.loop_structure describes a loop (e.g. 16 iterations of "Config index %d: "), generate a Python loop that matches EXACTLY — same count, same indexed format.
4. INTEGER OVERFLOW MATH: If the vulnerability is integer overflow, use clues.overflow_value as the exact integer to send. Verify: value % (bound+1) == desired_low. Show the math in a comment.
5. Return ONLY valid JSON. No markdown. No explanation outside the JSON.`;
      const userPrompt = `Generate a production-grade Python pwntools exploit for this CTF challenge.

CHALLENGE DETAILS:
- Filename: ${file.name}
- Platform: ${platform}
- Analysis: ${JSON.stringify(analysis)}
- Clues: ${JSON.stringify(clues)}
- Mode: ${exploitMode}

STRICT ENGINEERING REQUIREMENTS:
1. TOP OF SCRIPT: include local/remote toggle:
   p = remote(args.HOST, int(args.PORT)) if args.REMOTE else process('./${file.name}')
2. Set pwntools context: context.update(arch='DETECTED_ARCH', os='linux', endian='little')
3. DO NOT brute-force offsets in loops. Hardcode or calculate the exact padding:
   payload = b'A' * OFFSET + p64(ADDRESS)
4. Use sendlineafter() with exact byte prompt matching
5. End with p.interactive()
6. If 64-bit and calling glibc functions, add ret gadget for 16-byte stack alignment
7. Include all imports at the top (from pwn import *)
8. Add inline comments explaining each step

Return ONLY this JSON (no markdown, no extra text):
{"script":"COMPLETE_PYTHON_SCRIPT_WITH_NEWLINES_AS_\\n","lookup_table":"PYTHON_DICT_OF_256_CHARS_OR_EMPTY_STRING","usage":"python3 exploit.py or python3 exploit.py REMOTE HOST=1.2.3.4 PORT=1337","requirements":["pwntools"],"notes":"KEY_NOTES_ABOUT_THE_EXPLOIT"}`;

      const makeReq = async (model, maxTok) => {
        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cleanKey}`,
            "HTTP-Referer": "https://raid6-khaki.vercel.app",
            "X-Title": "TreK CTF Analyzer",
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTok,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });
        return r.json();
      };

      let data = await makeReq("poolside/laguna-m.1:free", 3000);
      if (data.error) {
        data = await makeReq("openai/gpt-oss-120b:free", 3000);
      }
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
        .header-right { font-size: 11px; color: #666; letter-spacing: 0.5px; font-weight: 500; }

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
          background: rgba(255,255,255,0.92);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          backdrop-filter: blur(3px);
        }
        .overlay-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-top: 3px solid #d00;
          border-radius: 6px;
          padding: 28px 32px;
          width: 340px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .overlay-head {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 20px;
        }
        .spinner {
          width: 20px; height: 20px; flex-shrink: 0;
          border: 2px solid #f0c0c0;
          border-top-color: #d00;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .overlay-title { font-size: 14px; font-weight: 700; color: #111; }
        .overlay-steps { display: flex; flex-direction: column; gap: 8px; }
        .overlay-step {
          display: flex; align-items: center; gap: 10px;
          font-size: 12px; color: #aaa;
          transition: color 0.3s;
        }
        .overlay-step.active { color: #111; font-weight: 500; }
        .overlay-step.done { color: #888; }
        .step-icon {
          width: 16px; height: 16px; flex-shrink: 0;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px;
          border: 1.5px solid #ddd;
          color: transparent;
        }
        .overlay-step.active .step-icon {
          border-color: #d00;
          background: #fff0f0;
          color: transparent;
          position: relative;
          overflow: hidden;
        }
        .overlay-step.active .step-icon::after {
          content: '';
          position: absolute;
          inset: 2px;
          border-radius: 50%;
          border: 1.5px solid transparent;
          border-top-color: #d00;
          animation: spin 0.7s linear infinite;
        }
        .overlay-step.done .step-icon {
          background: #d00; border-color: #d00; color: #fff; font-size: 9px;
        }
        .overlay-step.done .step-icon::before { content: "✓"; color: #fff; font-size: 9px; }
        .overlay-footer { margin-top: 16px; padding-top: 14px; border-top: 1px solid #f0f0f0; font-size: 10px; color: #666; letter-spacing: 0.5px; font-weight: 500; }

        /* ── Misc ── */
        .full-w { grid-column: 1 / -1; }
        .mt-16 { margin-top: 16px; }
        .mb-4 { margin-bottom: 4px; }
        .sec-sub { font-size: 12px; color: #888; margin-top: 2px; }
        .flex-between { display: flex; align-items: center; justify-content: space-between; }

        /* ── Animations ── */
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .section { animation: slideUp 0.35s cubic-bezier(.22,.68,0,1.2) both; }
        .section:nth-child(2) { animation-delay: 0.05s; }
        .section:nth-child(3) { animation-delay: 0.1s; }
        .section:nth-child(4) { animation-delay: 0.15s; }
        .info-card { transition: box-shadow 0.2s, transform 0.2s; }
        .info-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); transform: translateY(-1px); }
        .btn { transition: all 0.18s cubic-bezier(.22,.68,0,1.2); }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(204,0,0,0.25); }
        .btn-primary:active { transform: translateY(0); }
        .dropzone { transition: all 0.25s cubic-bezier(.22,.68,0,1.2); }
        .dropzone.over { transform: scale(1.01); }
        .step-badge { transition: background 0.2s; }
        .saved-key-row { transition: background 0.15s; }
        .saved-key-row:hover { background: #fafafa; }

        /* ── Card value colors ── */
        .info-card-value.critical { color: #b30000; font-weight: 600; }
        .info-card-value.slate { color: #444; }
        .info-card-value.accent { color: #d00; }

        /* ── Key indicator ── */
        .key-indicator { display:flex; align-items:center; gap:6px; font-size:11px; color:#666; font-weight:500; }
        .key-dot { width:7px; height:7px; border-radius:50%; background:#22a722; display:inline-block; animation: pulse 2s infinite; }

        /* ── Modal ── */
        .modal-overlay {
          position:fixed; inset:0; z-index:300;
          background:rgba(0,0,0,0.45);
          display:flex; align-items:center; justify-content:center;
          animation: fadeIn 0.2s ease;
          padding: 20px;
        }
        .modal-card {
          background:#fff;
          border-radius:8px;
          border-top:3px solid #d00;
          width:100%; max-width:480px;
          box-shadow:0 16px 48px rgba(0,0,0,0.18);
          animation: slideUp 0.25s cubic-bezier(.22,.68,0,1.2);
          overflow:hidden;
        }
        .modal-head {
          display:flex; align-items:center; justify-content:space-between;
          padding:16px 20px;
          border-bottom:1px solid #f0f0f0;
        }
        .modal-title { font-size:15px; font-weight:700; color:#111; }
        .modal-body { padding:20px; }
        .modal-section-label { font-size:10px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px; }
        .active-key-box {
          display:flex; align-items:center; gap:10px;
          padding:10px 14px;
          background:#fafafa; border:1px solid #eee; border-radius:5px;
        }
        .active-key-val { font-family:'JetBrains Mono',monospace; font-size:12px; color:#333; flex:1; }
        .saved-keys-list { display:flex; flex-direction:column; gap:6px; }
        .saved-key-row {
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 14px;
          border:1px solid #eee; border-radius:5px;
        }
        .saved-key-info { display:flex; flex-direction:column; gap:2px; }
        .saved-key-label { font-size:13px; font-weight:600; color:#111; }
        .saved-key-preview { font-family:'JetBrains Mono',monospace; font-size:10px; color:#888; }
        .add-key-form { display:flex; gap:8px; flex-wrap:wrap; }
        .add-key-form .form-input { height:36px; }
        .modal-footer-note { font-size:11px; color:#999; margin-top:12px; line-height:1.5; }
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
                <div key={i} className={`overlay-step ${s.done ? "done" : s.active ? "active" : ""}`}>
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
          <div className="header-left">
            <div className="logo-mark">T</div>
            <div>
              <div className="logo-text"><span>TreK</span> CTF Analyzer</div>
              <div className="logo-sub">by projectAdnan</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginLeft:"auto"}}>
            {apiKey && <div className="key-indicator"><span className="key-dot" />API Active</div>}
            <button className="btn btn-outline" style={{height:32,padding:"0 14px",fontSize:11}} onClick={() => setShowDashboard(true)}>
              ⚙ API Keys
            </button>
          </div>
        </header>

        {/* ── API KEY DASHBOARD ── */}
        {showDashboard && (
          <div className="modal-overlay" onClick={() => setShowDashboard(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-title">API Key Dashboard</div>
                <button className="icon-btn" onClick={() => setShowDashboard(false)}>✕</button>
              </div>

              <div className="modal-body">
                {/* Active key display */}
                <div className="modal-section-label">Active Key</div>
                <div className="active-key-box">
                  <span className="key-dot" style={{flexShrink:0}} />
                  <span className="active-key-val">{apiKey ? `${apiKey.slice(0,8)}${"•".repeat(16)}` : "No key selected"}</span>
                  {apiKey && <button className="icon-btn" style={{marginLeft:"auto",fontSize:11,color:"#d00"}} onClick={() => { setApiKey(""); localStorage.removeItem("trek_active_key"); }}>Clear</button>}
                </div>

                {/* Saved keys list */}
                {savedKeys.length > 0 && (
                  <>
                    <div className="modal-section-label" style={{marginTop:16}}>Saved Keys</div>
                    <div className="saved-keys-list">
                      {savedKeys.map(k => (
                        <div key={k.id} className="saved-key-row">
                          <div className="saved-key-info">
                            <span className="saved-key-label">{k.label}</span>
                            <span className="saved-key-preview">{k.key.slice(0,8)}{"•".repeat(12)}</span>
                          </div>
                          <div style={{display:"flex",gap:6}}>
                            <button className="btn btn-primary" style={{height:28,padding:"0 12px",fontSize:11}} onClick={() => useKey(k)}>Use</button>
                            <button className="icon-btn" style={{color:"#d00"}} onClick={() => deleteKey(k.id)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Add new key */}
                <div className="modal-section-label" style={{marginTop:16}}>Add New Key</div>
                <div className="add-key-form">
                  <input className="form-input" style={{flex:1,minWidth:0}} placeholder="Label (e.g. My OpenRouter)" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} />
                  <input className="form-input" style={{flex:2,minWidth:0}} type="password" placeholder="sk-or-..." value={newKeyVal} onChange={e => setNewKeyVal(e.target.value)} />
                  <button className="btn btn-primary" style={{flexShrink:0}} onClick={saveKey}>Save</button>
                </div>

                {/* Manual input */}
                <div className="modal-section-label" style={{marginTop:16}}>Use Key Directly</div>
                <div style={{display:"flex",gap:8}}>
                  <input className="form-input" style={{flex:1}} type="password" placeholder="Paste key to use now..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
                </div>
                <div className="modal-footer-note">Keys are stored in your browser only. Never sent to any server except OpenRouter.</div>
              </div>
            </div>
          </div>
        )}

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
                  <div style={{display:"flex",gap:6}}>
                    <input className="form-input" style={{flex:1}} type="password" placeholder={apiKey ? "Key loaded ✓" : "sk-or-... or manage in ⚙"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                    <button className="btn btn-outline" style={{height:36,padding:"0 10px",fontSize:11,flexShrink:0}} onClick={() => setShowDashboard(true)}>⚙</button>
                  </div>
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
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> checksec --file=./{file?.name}</span></div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> chmod +x exploit.py && python3 exploit.py</span></div>
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
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
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
                    <div className="form-label mt-16 mb-4">Requirements</div>
                    <div className="req-row">
                      {exploit.requirements.map((r, i) => <span key={i} className="req-tag">pip install {r}</span>)}
                    </div>
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

                {/* Compilation & runtime hints */}
                <div className="terminal" style={{marginTop:20}}>
                  <div className="terminal-bar">
                    <div className="t-dot t-red" /><div className="t-dot t-yellow" /><div className="t-dot t-green" />
                    <span style={{marginLeft:8,fontSize:10,color:"#555"}}>quick reference</span>
                  </div>
                  <div className="terminal-lines">
                    <div className="t-line t-comment"># 1. install dependency</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> pip install pwntools</span></div>
                    <div className="t-line t-comment"># 2. compile target (if you have source)</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> {exploit.gcc_cmd || `gcc -fno-stack-protector -no-pie ${file?.name}.c -o ${file?.name}`}</span></div>
                    <div className="t-line t-comment"># 3. run local</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> python3 exploit.py</span></div>
                    <div className="t-line t-comment"># 4. run remote</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> python3 exploit.py REMOTE HOST=TARGET_IP PORT=TARGET_PORT</span></div>
                    <div className="t-line t-out">[*] Switching to interactive mode</div>
                    <div className="t-line t-out">[+] Flag: {`{...}`}</div>
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
}      const arch = analysis?.fileType?.includes("64") ? "amd64" : "i386";
      const bits = arch === "amd64" ? 64 : 32;
      const packFn = bits === 64 ? "p64" : "p32";
      const gccFlag = bits === 64 ? "" : " -m32";
      const exactPrompts = analysis?.input_prompts?.length
        ? `EXACT INPUT PROMPTS (use these VERBATIM — never substitute):\n${(analysis.input_prompts).map((p,i) => `  [${i}] b'${p}'`).join('\n')}`
        : "No prompts extracted — use p.recvuntil() to detect them at runtime.";
      const overflowNote = clues?.overflow_value
        ? `INTEGER OVERFLOW: send exactly ${clues.overflow_value} (${clues.overflow_math || "see clues"}). Verify in a comment.`
        : "";
      const loopNote = analysis?.loop_structure
        ? `LOOP STRUCTURE: ${analysis.loop_structure} — replicate this EXACTLY in Python.`
        : "";
      const userPrompt = `Generate a production-grade pwntools exploit for this CTF challenge.

CHALLENGE DETAILS:
- Filename: ${file.name}
- Platform: ${platform}
- Architecture: ${arch} (${bits}-bit), packing: ${packFn}()
- Analysis: ${JSON.stringify(analysis)}
- Clues: ${JSON.stringify(clues)}
- Mode: ${exploitMode}

${exactPrompts}
${overflowNote}
${loopNote}

STRICT STRUCTURE (follow in order, no exceptions):

LINE 1: from pwn import *
LINE 2: context.update(arch='${arch}', os='linux', endian='little')
LINE 3+: p = remote(args.HOST, int(args.PORT)) if args.REMOTE else process('./${file.name}')

PAYLOAD RULES:
- Use ${packFn}() for all address packing
- Hardcode exact offset — NO brute-force loops
- payload = b'A' * OFFSET + ${packFn}(ADDRESS)
- For 64-bit glibc calls: add ret gadget for 16-byte stack alignment
- Use p.sendlineafter(b'EXACT_PROMPT', payload) — copy prompts from above VERBATIM

INTEGER OVERFLOW (if applicable):
- Send the precomputed overflow_value from clues
- Add comment: # overflow: ${clues?.overflow_math || 'see analysis'}
- Verify with assert in a comment

LOOP INPUT (if applicable):
- Match loop count and indexed format exactly from loop_structure above

END: p.interactive()

APPEND AS COMMENTS AT END:
# --- COMPILE ---
# gcc -fno-stack-protector -no-pie${gccFlag} ${file.name}.c -o ${file.name}
# --- RUN LOCAL ---
# python3 exploit.py
# --- RUN REMOTE ---
# python3 exploit.py REMOTE HOST=TARGET_IP PORT=TARGET_PORT

Return ONLY this JSON (no markdown, no backticks, no extra text):
{"script":"COMPLETE_SCRIPT_WITH_\\n_FOR_NEWLINES","lookup_table":"256_ENTRY_DICT_OR_EMPTY","usage":"python3 exploit.py","requirements":["pwntools"],"notes":"KEY_NOTES","arch":"${arch}","bits":${bits},"gcc_cmd":"gcc -fno-stack-protector -no-pie${gccFlag} ${file.name}.c -o ${file.name}"}`= STEPS.indexOf(current);
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

const CRITICAL_LABELS = ["vulnerability", "attack surface", "attack type"];
const SLATE_LABELS = ["file type", "input method", "charset"];

function Card({ label, value, accent }) {
  const lk = label.toLowerCase();
  const isCritical = CRITICAL_LABELS.some(l => lk.includes(l));
  const isSlate = SLATE_LABELS.some(l => lk.includes(l));
  const cls = isCritical ? "critical" : isSlate ? "slate" : accent ? "accent" : "";
  return (
    <div className="info-card">
      <div className="info-card-label">{label}</div>
      <div className={`info-card-value ${cls}`}>{value}</div>
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
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("trek_active_key") || "");
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

  // persist active key
  useEffect(() => { localStorage.setItem("trek_active_key", apiKey); }, [apiKey]);

  const saveKey = () => {
    if (!newKeyLabel.trim() || !newKeyVal.trim()) return;
    const entry = { id: Date.now(), label: newKeyLabel.trim(), key: newKeyVal.trim() };
    const updated = [...savedKeys, entry];
    setSavedKeys(updated);
    localStorage.setItem("trek_saved_keys", JSON.stringify(updated));
    setNewKeyLabel(""); setNewKeyVal("");
  };

  const deleteKey = (id) => {
    const updated = savedKeys.filter(k => k.id !== id);
    setSavedKeys(updated);
    localStorage.setItem("trek_saved_keys", JSON.stringify(updated));
  };

  const useKey = (k) => {
    setApiKey(k.key);
    setShowDashboard(false);
  };

  const PHASE_STEPS = {
    analyze: [
      { label: "Reading file bytes", ms: 0 },
      { label: "Examining file format", ms: 1200 },
      { label: "Scanning for embedded strings", ms: 2400 },
      { label: "Identifying binary architecture", ms: 3800 },
      { label: "Detecting input methods", ms: 5200 },
      { label: "Mapping attack surface", ms: 6800 },
      { label: "Sending to AI engine", ms: 8200 },
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
          // mark previous as done
          if (i > 0) next[i-1] = { ...next[i-1], done: true };
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
        model: "poolside/laguna-m.1:free",
        max_tokens: 1000,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    const data = await res.json();
    // fallback to DeepSeek R1 if rate limited
    if (data.error?.code === 429 || data.error?.message?.includes("rate") || data.error?.message?.includes("endpoint")) {
      const res2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cleanKey}`,
          "HTTP-Referer": "https://raid6-khaki.vercel.app",
          "X-Title": "TreK CTF Analyzer",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b:free",
          max_tokens: 1000,
          messages: [{ role: "system", content: system }, ...messages],
        }),
      });
      const data2 = await res2.json();
      if (data2.error) throw new Error(data2.error.message);
      return data2.choices?.[0]?.message?.content || "";
    }
    if (data.error) throw new Error(data.error.message);
    return data.choices?.[0]?.message?.content || "";
  };

  const parseJSON = (raw) => {
    // Step 1: strip markdown fences
    let s = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/g, "").trim();

    // Step 2: extract first {...} block in case model adds preamble
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end !== -1) s = s.slice(start, end + 1);

    // Step 3: sanitize control characters INSIDE JSON string values only
    // Replace raw newlines/tabs/carriage returns inside string values with escaped versions
    s = s.replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (match) =>
        match
          .replace(/\n/g, "\\n")     // raw newline → \n
          .replace(/\r/g, "\\r")     // raw CR → \r
          .replace(/\t/g, "\\t")     // raw tab → \t
          .replace(/[\x00-\x1F\x7F]/g, (c) => {
            const hex = c.charCodeAt(0).toString(16).padStart(4, "0");
            return `\\u${hex}`;
          })
    );

    try {
      return JSON.parse(s);
    } catch (e) {
      // Step 4: last resort — use Function constructor to eval as JS object literal
      try {
        // eslint-disable-next-line no-new-func
        return Function('"use strict"; return (' + s + ')')();
      } catch {
        throw new Error("JSON parse failed: " + e.message);
      }
    }
  };

  const doAnalyze = async () => {
    setLoading(true); setError(""); startLoadingSteps('analyze', 'Analyzing Binary');
    try {
      const raw = await readAsText(file);
      const resp = await callAI([{ role: "user", content: `Analyze this CTF challenge file for a security competition. Platform: ${platform}. Filename: "${file.name}". Size: ${file.size} bytes.

File sample (first 5000 chars, latin1):
${raw.slice(0, 5000)}

CRITICAL EXTRACTION RULES:
1. Extract the EXACT literal prompt strings the binary prints before waiting for input.
   - Scan the strings_found list and file content for printf/puts/write output strings.
   - Examples: "Enter your name: ", "Config index 3: ", "Place your bet: " — use the EXACT text.
   - NEVER invent generic placeholders like "Enter count:" or "Enter data:" if real strings exist.
2. If the binary uses integer input, identify the exact C data type (int, unsigned int, long, size_t).
   - Note any bounds checks visible in the source (e.g., count > 0 && count < 512).
   - Flag any integer overflow potential (e.g., unsigned 32-bit rollover past 4294967295).
3. For looping input (e.g., for i in 0..N), extract the loop count and the indexed prompt format.

Return ONLY valid JSON:
{
  "fileType": "string",
  "description": "string (2 sentences)",
  "inputMethod": "string (exact method: scanf %c, fgets, read, gets, etc.)",
  "vulnerability": "string",
  "flag_hint": "string",
  "strings_found": ["EXACT literal strings from binary — prompts, banners, format strings"],
  "difficulty": "easy|medium|hard",
  "attack_surface": "string",
  "input_prompts": ["EXACT prompt strings binary prints before each input, e.g. 'Place your bet: '"],
  "loop_structure": "string or null — describe any input loops (e.g. 'for i in 0..16: sends Config index i')",
  "integer_type": "string or null — C type of key integer inputs (e.g. 'unsigned int', 'size_t')",
  "overflow_target": "string or null — describe overflow if applicable (e.g. 'unsigned 32-bit wraps at 4294967296')"
}` }],
        "You are a CTF binary analysis expert. Return ONLY valid JSON, no markdown, no explanation.");
      setAnalysis(parseJSON(resp));
      setStep("analyze");
    } catch (e) { setError("Analysis failed: " + e.message); } finally { stopLoadingSteps(); setLoading(false); }
  };

  const doClues = async () => {
    setLoading(true); setError(""); startLoadingSteps('clues', 'Generating Clues');
    try {
      const resp = await callAI([{ role: "user", content: `CTF analysis: ${JSON.stringify(analysis)}
File: "${file.name}", Platform: ${platform}

RULES:
- If input_prompts are provided in the analysis, use them VERBATIM in all steps and scripts.
- If integer_type is unsigned int/uint32 and overflow_target is set, calculate the exact overflow value:
  wrap = 4294967296 - target_low_value. Verify wrap % (upper_bound+1) == target_low_value.
- If loop_structure is present, describe how to send data in the exact loop pattern.

Return ONLY valid JSON:
{
  "clue_summary": "string",
  "input_space": "string",
  "attack_type": "string",
  "steps": ["step array — use EXACT prompt strings from analysis.input_prompts"],
  "key_insight": "string",
  "charset": "string",
  "expected_flag_format": "string",
  "overflow_value": "string or null — the exact integer to send to trigger overflow",
  "overflow_math": "string or null — show the calculation e.g. 4294967296 - 44 = 4294967252"
}` }],
        "You are a CTF mentor. Return ONLY valid JSON.");
      setClues(parseJSON(resp));
      setStep("clues");
    } catch (e) { setError("Clue generation failed: " + e.message); } finally { stopLoadingSteps(); setLoading(false); }
  };

  const doExploit = async () => {
    setLoading(true); setError(""); startLoadingSteps('exploit', 'Generating Exploit');
    try {
      const cleanKey = apiKey.replace(/[^\x20-\x7E]/g, "").trim();
      const systemPrompt = `You are an elite CTF binary exploitation engineer. You write production-grade pwntools scripts that work on first run.

ABSOLUTE RULES — NEVER VIOLATE:
1. INPUT PROMPT ACCURACY: Never invent or guess prompt strings. Use ONLY the exact literal strings from analysis.input_prompts. If a prompt is "Place your bet: " use b'Place your bet: ' exactly — including spaces.
2. NO GENERIC PLACEHOLDERS: Never use b'Enter count:', b'Enter data:', b'Enter choice:' or any invented string. If you don't know the exact prompt, use p.recvuntil() to wait for it by its real content.
3. LOOP FIDELITY: If analysis.loop_structure describes a loop (e.g. 16 iterations of "Config index %d: "), generate a Python loop that matches EXACTLY — same count, same indexed format.
4. INTEGER OVERFLOW MATH: If the vulnerability is integer overflow, use clues.overflow_value as the exact integer to send. Verify: value % (bound+1) == desired_low. Show the math in a comment.
5. Return ONLY valid JSON. No markdown. No explanation outside the JSON.`;
      const userPrompt = `Generate a production-grade Python pwntools exploit for this CTF challenge.

CHALLENGE DETAILS:
- Filename: ${file.name}
- Platform: ${platform}
- Analysis: ${JSON.stringify(analysis)}
- Clues: ${JSON.stringify(clues)}
- Mode: ${exploitMode}

STRICT ENGINEERING REQUIREMENTS:
1. TOP OF SCRIPT: include local/remote toggle:
   p = remote(args.HOST, int(args.PORT)) if args.REMOTE else process('./${file.name}')
2. Set pwntools context: context.update(arch='DETECTED_ARCH', os='linux', endian='little')
3. DO NOT brute-force offsets in loops. Hardcode or calculate the exact padding:
   payload = b'A' * OFFSET + p64(ADDRESS)
4. Use sendlineafter() with exact byte prompt matching
5. End with p.interactive()
6. If 64-bit and calling glibc functions, add ret gadget for 16-byte stack alignment
7. Include all imports at the top (from pwn import *)
8. Add inline comments explaining each step

Return ONLY this JSON (no markdown, no extra text):
{"script":"COMPLETE_PYTHON_SCRIPT_WITH_NEWLINES_AS_\\n","lookup_table":"PYTHON_DICT_OF_256_CHARS_OR_EMPTY_STRING","usage":"python3 exploit.py or python3 exploit.py REMOTE HOST=1.2.3.4 PORT=1337","requirements":["pwntools"],"notes":"KEY_NOTES_ABOUT_THE_EXPLOIT"}`;

      const makeReq = async (model, maxTok) => {
        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cleanKey}`,
            "HTTP-Referer": "https://raid6-khaki.vercel.app",
            "X-Title": "TreK CTF Analyzer",
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTok,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });
        return r.json();
      };

      let data = await makeReq("poolside/laguna-m.1:free", 3000);
      if (data.error) {
        data = await makeReq("openai/gpt-oss-120b:free", 3000);
      }
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
        .header-right { font-size: 11px; color: #666; letter-spacing: 0.5px; font-weight: 500; }

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
          background: rgba(255,255,255,0.92);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          backdrop-filter: blur(3px);
        }
        .overlay-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-top: 3px solid #d00;
          border-radius: 6px;
          padding: 28px 32px;
          width: 340px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .overlay-head {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 20px;
        }
        .spinner {
          width: 20px; height: 20px; flex-shrink: 0;
          border: 2px solid #f0c0c0;
          border-top-color: #d00;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .overlay-title { font-size: 14px; font-weight: 700; color: #111; }
        .overlay-steps { display: flex; flex-direction: column; gap: 8px; }
        .overlay-step {
          display: flex; align-items: center; gap: 10px;
          font-size: 12px; color: #aaa;
          transition: color 0.3s;
        }
        .overlay-step.active { color: #111; font-weight: 500; }
        .overlay-step.done { color: #888; }
        .step-icon {
          width: 16px; height: 16px; flex-shrink: 0;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px;
          border: 1.5px solid #ddd;
          color: transparent;
        }
        .overlay-step.active .step-icon {
          border-color: #d00;
          background: #fff0f0;
          color: transparent;
          position: relative;
          overflow: hidden;
        }
        .overlay-step.active .step-icon::after {
          content: '';
          position: absolute;
          inset: 2px;
          border-radius: 50%;
          border: 1.5px solid transparent;
          border-top-color: #d00;
          animation: spin 0.7s linear infinite;
        }
        .overlay-step.done .step-icon {
          background: #d00; border-color: #d00; color: #fff; font-size: 9px;
        }
        .overlay-step.done .step-icon::before { content: "✓"; color: #fff; font-size: 9px; }
        .overlay-footer { margin-top: 16px; padding-top: 14px; border-top: 1px solid #f0f0f0; font-size: 10px; color: #666; letter-spacing: 0.5px; font-weight: 500; }

        /* ── Misc ── */
        .full-w { grid-column: 1 / -1; }
        .mt-16 { margin-top: 16px; }
        .mb-4 { margin-bottom: 4px; }
        .sec-sub { font-size: 12px; color: #888; margin-top: 2px; }
        .flex-between { display: flex; align-items: center; justify-content: space-between; }

        /* ── Animations ── */
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .section { animation: slideUp 0.35s cubic-bezier(.22,.68,0,1.2) both; }
        .section:nth-child(2) { animation-delay: 0.05s; }
        .section:nth-child(3) { animation-delay: 0.1s; }
        .section:nth-child(4) { animation-delay: 0.15s; }
        .info-card { transition: box-shadow 0.2s, transform 0.2s; }
        .info-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); transform: translateY(-1px); }
        .btn { transition: all 0.18s cubic-bezier(.22,.68,0,1.2); }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(204,0,0,0.25); }
        .btn-primary:active { transform: translateY(0); }
        .dropzone { transition: all 0.25s cubic-bezier(.22,.68,0,1.2); }
        .dropzone.over { transform: scale(1.01); }
        .step-badge { transition: background 0.2s; }
        .saved-key-row { transition: background 0.15s; }
        .saved-key-row:hover { background: #fafafa; }

        /* ── Card value colors ── */
        .info-card-value.critical { color: #b30000; font-weight: 600; }
        .info-card-value.slate { color: #444; }
        .info-card-value.accent { color: #d00; }

        /* ── Key indicator ── */
        .key-indicator { display:flex; align-items:center; gap:6px; font-size:11px; color:#666; font-weight:500; }
        .key-dot { width:7px; height:7px; border-radius:50%; background:#22a722; display:inline-block; animation: pulse 2s infinite; }

        /* ── Modal ── */
        .modal-overlay {
          position:fixed; inset:0; z-index:300;
          background:rgba(0,0,0,0.45);
          display:flex; align-items:center; justify-content:center;
          animation: fadeIn 0.2s ease;
          padding: 20px;
        }
        .modal-card {
          background:#fff;
          border-radius:8px;
          border-top:3px solid #d00;
          width:100%; max-width:480px;
          box-shadow:0 16px 48px rgba(0,0,0,0.18);
          animation: slideUp 0.25s cubic-bezier(.22,.68,0,1.2);
          overflow:hidden;
        }
        .modal-head {
          display:flex; align-items:center; justify-content:space-between;
          padding:16px 20px;
          border-bottom:1px solid #f0f0f0;
        }
        .modal-title { font-size:15px; font-weight:700; color:#111; }
        .modal-body { padding:20px; }
        .modal-section-label { font-size:10px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px; }
        .active-key-box {
          display:flex; align-items:center; gap:10px;
          padding:10px 14px;
          background:#fafafa; border:1px solid #eee; border-radius:5px;
        }
        .active-key-val { font-family:'JetBrains Mono',monospace; font-size:12px; color:#333; flex:1; }
        .saved-keys-list { display:flex; flex-direction:column; gap:6px; }
        .saved-key-row {
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 14px;
          border:1px solid #eee; border-radius:5px;
        }
        .saved-key-info { display:flex; flex-direction:column; gap:2px; }
        .saved-key-label { font-size:13px; font-weight:600; color:#111; }
        .saved-key-preview { font-family:'JetBrains Mono',monospace; font-size:10px; color:#888; }
        .add-key-form { display:flex; gap:8px; flex-wrap:wrap; }
        .add-key-form .form-input { height:36px; }
        .modal-footer-note { font-size:11px; color:#999; margin-top:12px; line-height:1.5; }
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
                <div key={i} className={`overlay-step ${s.done ? "done" : s.active ? "active" : ""}`}>
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
          <div className="header-left">
            <div className="logo-mark">T</div>
            <div>
              <div className="logo-text"><span>TreK</span> CTF Analyzer</div>
              <div className="logo-sub">by projectAdnan</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginLeft:"auto"}}>
            {apiKey && <div className="key-indicator"><span className="key-dot" />API Active</div>}
            <button className="btn btn-outline" style={{height:32,padding:"0 14px",fontSize:11}} onClick={() => setShowDashboard(true)}>
              ⚙ API Keys
            </button>
          </div>
        </header>

        {/* ── API KEY DASHBOARD ── */}
        {showDashboard && (
          <div className="modal-overlay" onClick={() => setShowDashboard(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-title">API Key Dashboard</div>
                <button className="icon-btn" onClick={() => setShowDashboard(false)}>✕</button>
              </div>

              <div className="modal-body">
                {/* Active key display */}
                <div className="modal-section-label">Active Key</div>
                <div className="active-key-box">
                  <span className="key-dot" style={{flexShrink:0}} />
                  <span className="active-key-val">{apiKey ? `${apiKey.slice(0,8)}${"•".repeat(16)}` : "No key selected"}</span>
                  {apiKey && <button className="icon-btn" style={{marginLeft:"auto",fontSize:11,color:"#d00"}} onClick={() => { setApiKey(""); localStorage.removeItem("trek_active_key"); }}>Clear</button>}
                </div>

                {/* Saved keys list */}
                {savedKeys.length > 0 && (
                  <>
                    <div className="modal-section-label" style={{marginTop:16}}>Saved Keys</div>
                    <div className="saved-keys-list">
                      {savedKeys.map(k => (
                        <div key={k.id} className="saved-key-row">
                          <div className="saved-key-info">
                            <span className="saved-key-label">{k.label}</span>
                            <span className="saved-key-preview">{k.key.slice(0,8)}{"•".repeat(12)}</span>
                          </div>
                          <div style={{display:"flex",gap:6}}>
                            <button className="btn btn-primary" style={{height:28,padding:"0 12px",fontSize:11}} onClick={() => useKey(k)}>Use</button>
                            <button className="icon-btn" style={{color:"#d00"}} onClick={() => deleteKey(k.id)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Add new key */}
                <div className="modal-section-label" style={{marginTop:16}}>Add New Key</div>
                <div className="add-key-form">
                  <input className="form-input" style={{flex:1,minWidth:0}} placeholder="Label (e.g. My OpenRouter)" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} />
                  <input className="form-input" style={{flex:2,minWidth:0}} type="password" placeholder="sk-or-..." value={newKeyVal} onChange={e => setNewKeyVal(e.target.value)} />
                  <button className="btn btn-primary" style={{flexShrink:0}} onClick={saveKey}>Save</button>
                </div>

                {/* Manual input */}
                <div className="modal-section-label" style={{marginTop:16}}>Use Key Directly</div>
                <div style={{display:"flex",gap:8}}>
                  <input className="form-input" style={{flex:1}} type="password" placeholder="Paste key to use now..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
                </div>
                <div className="modal-footer-note">Keys are stored in your browser only. Never sent to any server except OpenRouter.</div>
              </div>
            </div>
          </div>
        )}

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
                  <div style={{display:"flex",gap:6}}>
                    <input className="form-input" style={{flex:1}} type="password" placeholder={apiKey ? "Key loaded ✓" : "sk-or-... or manage in ⚙"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                    <button className="btn btn-outline" style={{height:36,padding:"0 10px",fontSize:11,flexShrink:0}} onClick={() => setShowDashboard(true)}>⚙</button>
                  </div>
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
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> checksec --file=./{file?.name}</span></div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> chmod +x exploit.py && python3 exploit.py</span></div>
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
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
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
                    <div className="form-label mt-16 mb-4">Requirements</div>
                    <div className="req-row">
                      {exploit.requirements.map((r, i) => <span key={i} className="req-tag">pip install {r}</span>)}
                    </div>
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

                {/* Compilation & runtime hints */}
                <div className="terminal" style={{marginTop:20}}>
                  <div className="terminal-bar">
                    <div className="t-dot t-red" /><div className="t-dot t-yellow" /><div className="t-dot t-green" />
                    <span style={{marginLeft:8,fontSize:10,color:"#555"}}>quick reference</span>
                  </div>
                  <div className="terminal-lines">
                    <div className="t-line t-comment"># 1. install dependency</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> pip install pwntools</span></div>
                    <div className="t-line t-comment"># 2. compile target (if you have source)</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> {exploit.gcc_cmd || `gcc -fno-stack-protector -no-pie ${file?.name}.c -o ${file?.name}`}</span></div>
                    <div className="t-line t-comment"># 3. run local</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> python3 exploit.py</span></div>
                    <div className="t-line t-comment"># 4. run remote</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> python3 exploit.py REMOTE HOST=TARGET_IP PORT=TARGET_PORT</span></div>
                    <div className="t-line t-out">[*] Switching to interactive mode</div>
                    <div className="t-line t-out">[+] Flag: {`{...}`}</div>
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
