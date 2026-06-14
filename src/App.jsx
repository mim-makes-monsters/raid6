import { useState, useRef, useEffect } from "react";

const PLATFORMS = ["HackTheBox","TryHackMe","PicoCTF","CTFd","pwn.college","Other"];
const CATEGORIES = [
  { id:"ctf",      label:"CTF Challenge",      icon:"⚔",  desc:"Binary exploitation, reverse engineering, web, crypto", free:true  },
  { id:"malware",  label:"Malware Analysis",   icon:"☣",  desc:"Static & dynamic analysis, IOC extraction, sandbox detonation", free:false },
  { id:"pentest",  label:"Penetration Testing",icon:"⬡",  desc:"Network recon, service enumeration, privilege escalation", free:false },
  { id:"osint",    label:"OSINT",              icon:"◎",  desc:"Open-source intelligence, social footprinting, data correlation", free:false },
  { id:"forensics",label:"Digital Forensics",  icon:"⬢",  desc:"Disk images, memory dumps, artifact recovery", free:false },
  { id:"red",      label:"Red Team Ops",       icon:"✕",  desc:"C2 frameworks, payload crafting, lateral movement chains", free:false },
];
const ENGINES = [
  { id:"free",    label:"Free Engine", badge:"FREE",  color:"#ff3333", locked:false, desc:"Powered by OpenRouter free-tier models." },
  { id:"bonehead",label:"Bonehead",   badge:"PRO",   color:"#ff3333", locked:true,  desc:"Fast, aggressive exploit generation with minimal hand-holding." },
  { id:"ted",     label:"Ted Bundy",  badge:"PRO",   color:"#cc00cc", locked:true,  desc:"Deep pattern profiling of binary behaviour and edge-case exploit paths." },
  { id:"codex",   label:"Codex Giga",badge:"ELITE",  color:"#ff9900", locked:true,  desc:"480B parameter model with full pwntools runtime validation." },
];
const CRIT = ["vulnerability","attack surface","attack type"];
const SLATE = ["file type","input method","charset"];

function Card({ label, value, accent }) {
  const lk = (label||"").toLowerCase();
  const cls = CRIT.some(l=>lk.includes(l)) ? "crit" : SLATE.some(l=>lk.includes(l)) ? "slate" : accent ? "acc" : "";
  return (
    <div className="g-card">
      <div className="g-card-label">{label}</div>
      <div className={"g-card-value "+cls}>{value}</div>
    </div>
  );
}

function CodeBlock({ code, copyKey, copied, onCopy }) {
  return (
    <div className="code-wrap">
      <div className="code-bar">
        <span className="code-lang">python</span>
        <button className="code-copy-btn" onClick={()=>onCopy(code,copyKey)}>{copied===copyKey?"✓ Copied":"Copy"}</button>
      </div>
      <pre className="code-pre">{code}</pre>
    </div>
  );
}

export default function App() {
  const [page, setPage]   = useState("home");
  const [step, setStep]   = useState("upload");
  const [file, setFile]   = useState(null);
  const [platform, setPlatform] = useState("HackTheBox");
  const [category, setCategory] = useState("ctf");
  const [engine, setEngine]     = useState("free");
  const [apiKey, setApiKey]     = useState(()=>{ try{return localStorage.getItem("cxc_key")||"";}catch{return "";} });
  const [savedKeys, setSavedKeys] = useState(()=>{ try{return JSON.parse(localStorage.getItem("cxc_keys")||"[]");}catch{return [];} });
  const [showDash, setShowDash]   = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [lockedItem, setLockedItem]   = useState(null);
  const [showPricing, setShowPricing] = useState(false);
  const [orderPlan, setOrderPlan]     = useState(null);
  const [txId, setTxId]               = useState('');
  const [orderSent, setOrderSent]     = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newVal, setNewVal]     = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [clues, setClues]       = useState(null);
  const [exploit, setExploit]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [lSteps, setLSteps]     = useState([]);
  const [lTitle, setLTitle]     = useState("");
  const [error, setError]       = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [exploitMode, setExploitMode] = useState("bruteforce");
  const [copied, setCopied]     = useState("");
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [remoteHost, setRemoteHost] = useState("");
  const [remotePort, setRemotePort] = useState("");
  const fileRef = useRef();
  const timers  = useRef([]);

  useEffect(()=>{ try{localStorage.setItem("cxc_key",apiKey);}catch{} },[apiKey]);

  const PHASES = {
    analyze:[
      {label:"Reading file bytes",ms:0},{label:"Examining file format",ms:1200},
      {label:"Scanning for embedded strings",ms:2600},{label:"Identifying binary architecture",ms:4000},
      {label:"Detecting input methods",ms:5400},{label:"Mapping attack surface",ms:7000},
      {label:"Dispatching to AI engine",ms:8500},{label:"Processing response",ms:12000},
    ],
    clues:[
      {label:"Parsing vulnerability class",ms:0},{label:"Calculating input space",ms:1400},
      {label:"Researching exploit techniques",ms:3000},{label:"Mapping attack vectors",ms:4800},
      {label:"Generating attack plan",ms:6400},{label:"Cross-referencing CVE patterns",ms:8000},
      {label:"Crafting insight summary",ms:10000},
    ],
    exploit:[
      {label:"Initializing pwntools framework",ms:0},{label:"Determining architecture",ms:1200},
      {label:"Calculating stack offset",ms:2800},{label:"Locating ROP gadgets",ms:4400},
      {label:"Building payload structure",ms:6200},{label:"Writing interaction logic",ms:8000},
      {label:"Assembling final script",ms:10000},{label:"Verifying integrity",ms:13000},
    ],
  };

  const startLoad = (phase, title) => {
    setLTitle(title); setLSteps([]);
    timers.current.forEach(clearTimeout); timers.current=[];
    PHASES[phase].forEach((s,i)=>{
      const t = setTimeout(()=>{
        setLSteps(prev=>{
          const n=[...prev];
          if(i>0&&n[i-1]) n[i-1]={...n[i-1],active:false,done:true};
          n[i]={label:s.label,active:true,done:false};
          return n;
        });
      }, s.ms);
      timers.current.push(t);
    });
  };
  const stopLoad = () => {
    timers.current.forEach(clearTimeout); timers.current=[];
    setLSteps(p=>p.map(s=>({...s,active:false,done:true})));
  };

  const saveKey = () => {
    if(!newLabel.trim()||!newVal.trim()) return;
    const e={id:Date.now(),label:newLabel.trim(),key:newVal.trim()};
    const u=[...savedKeys,e]; setSavedKeys(u);
    try{localStorage.setItem("cxc_keys",JSON.stringify(u));}catch{}
    setNewLabel(""); setNewVal("");
  };
  const deleteKey = id => {
    const u=savedKeys.filter(k=>k.id!==id); setSavedKeys(u);
    try{localStorage.setItem("cxc_keys",JSON.stringify(u));}catch{}
  };
  const useKey = k => { setApiKey(k.key); setShowDash(false); };

  const handleFile = f => {
    if(!f) return;
    setFile(f); setAnalysis(null); setClues(null); setExploit(null); setError(""); setStep("upload");
  };
  const readAsText = f => new Promise((res,rej)=>{
    const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsText(f,"latin1");
  });

  const parseJSON = raw => {
    if (!raw || typeof raw !== "string") throw new Error("Empty AI response");
    let s = raw;
    // Remove thinking blocks
    s = s.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
    // Remove markdown fences
    s = s.replace(/```json/gi, "").replace(/```/g, "").trim();
    // Find outermost JSON object
    const st = s.indexOf("{"), en = s.lastIndexOf("}");
    if (st === -1 || en <= st) throw new Error("No JSON in response");
    s = s.slice(st, en + 1);
    // Remove literal newlines/tabs inside the JSON string (safe to do before parse)
    s = s.split("").map(c => {
      const code = c.charCodeAt(0);
      if (code === 10) return "\\n";
      if (code === 13) return "\\r";
      if (code === 9)  return "\\t";
      if (code < 32)   return "";
      return c;
    }).join("");
    try { return JSON.parse(s); }
    catch (e1) {
      try {
        let fx = s;
        const op = (fx.match(/\{/g)||[]).length;
        const cl = (fx.match(/\}/g)||[]).length;
        for (let i = 0; i < op - cl; i++) fx += "}";
        return JSON.parse(fx);
      } catch { throw new Error("Parse failed: " + e1.message); }
    }
  }
  const mk = () => apiKey.replace(/[^\x20-\x7E]/g,"").trim();

  const callAI = async (messages, system, maxTok=1800) => {
    const key = mk();
    if (!key) throw new Error("No API key set. Click ⚙ to add your OpenRouter key.");
    const sysPrompt = system + " Respond with ONLY a JSON object. Start with { end with }. No markdown.";
    const MODELS = [
      "google/gemma-3-12b-it:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen-2.5-7b-instruct:free",
      "deepseek/deepseek-r1:free",
    ];
    let lastErr = "All models failed";
    for (const model of MODELS) {
      let resp, txt;
      try {
        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + key,
            "HTTP-Referer": "https://raid6-khaki.vercel.app",
            "X-Title": "codeXcracked",
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTok,
            messages: [{ role: "system", content: sysPrompt }, ...messages],
          }),
        });
        if (!r.ok) { lastErr = "HTTP " + r.status + " from " + model; continue; }
        resp = await r.json();
      } catch (e) { lastErr = "Fetch error: " + e.message; continue; }
      if (resp.error) { lastErr = resp.error.message || JSON.stringify(resp.error); continue; }
      txt = resp.choices?.[0]?.message?.content || "";
      if (txt.includes("{")) return txt;
      lastErr = "No JSON from " + model + ": " + txt.slice(0, 60);
    }
    throw new Error(lastErr);
  };

  const doAnalyze = async () => {
    setLoading(true); setError(""); startLoad("analyze","Analyzing Binary");
    try {
      const raw = await readAsText(file);
      const prompt = [
        "Analyze this CTF challenge file. Platform: "+platform+". Filename: "+file.name+". Size: "+file.size+" bytes.",
        "File sample (first 2000 chars, printable only):\n"+raw.slice(0,2000).replace(/[^\x20-\x7E\n]/g," "),
        "CRITICAL: Extract EXACT literal strings the binary prints before waiting for input. NEVER invent placeholders.",
        "Return ONLY valid JSON:\n"+JSON.stringify({
          fileType:"string",description:"2 sentences",inputMethod:"e.g. scanf %c",
          vulnerability:"string",flag_hint:"string",strings_found:["exact strings"],
          difficulty:"easy|medium|hard",attack_surface:"string",
          input_prompts:["EXACT prompts binary prints"],loop_structure:"string or null",
          integer_type:"string or null",overflow_target:"string or null"
        })
      ].join("\n");
      setAnalysis(parseJSON(await callAI([{role:"user",content:prompt}],"You are a CTF binary analysis expert. Return ONLY valid JSON.")));
      setStep("analyze");
    } catch(e){ setError("Analysis failed: "+e.message); } finally{ stopLoad(); setLoading(false); }
  };

  const doClues = async () => {
    setLoading(true); setError(""); startLoad("clues","Generating Clues");
    try {
      const prompt = [
        "CTF analysis: "+JSON.stringify(analysis),
        "File: "+file.name+", Platform: "+platform,
        "Use input_prompts VERBATIM. Calculate overflow if integer_type is unsigned. Match loop_structure exactly.",
        "Return ONLY valid JSON:\n"+JSON.stringify({
          clue_summary:"string",input_space:"string",attack_type:"string",
          steps:["use EXACT prompt strings"],key_insight:"string",
          charset:"string",expected_flag_format:"string",
          overflow_value:"string or null",overflow_math:"string or null"
        })
      ].join("\n");
      setClues(parseJSON(await callAI([{role:"user",content:prompt}],"You are a CTF mentor. Return ONLY valid JSON. Keep values concise.")));
      setStep("clues");
    } catch(e){ setError("Clue generation failed: "+e.message); } finally{ stopLoad(); setLoading(false); }
  };

  const doExploit = async () => {
    setLoading(true); setError(""); startLoad("exploit","Generating Exploit");
    try {
      const k=mk(), fname=file.name;
      const arch = analysis?.fileType?.includes("64")?"amd64":"i386";
      const bits = arch==="amd64"?64:32;
      const packFn = bits===64?"p64":"p32";
      const gccFlag = bits===64?"":" -m32";
      const promptLines = [
        "Generate a production-grade pwntools exploit for this CTF challenge.",
        "Filename: "+fname+", Platform: "+platform+", Arch: "+arch+" ("+bits+"-bit), Packing: "+packFn+"()",
        "Analysis: "+JSON.stringify(analysis),
        "Clues: "+JSON.stringify(clues),
        "Mode: "+exploitMode,
        analysis?.input_prompts?.length ? "EXACT PROMPTS (verbatim):\n"+analysis.input_prompts.map((p,i)=>"  ["+i+"] b'"+p+"'").join("\n") : "Use p.recvuntil() to detect prompts.",
        clues?.overflow_value ? "OVERFLOW: send exactly "+clues.overflow_value+" ("+clues.overflow_math+"). Show math in comment." : "",
        analysis?.loop_structure ? "LOOP: "+analysis.loop_structure+" — replicate EXACTLY." : "",
        "STRICT ORDER: LINE1: from pwn import * | LINE2: context.update(arch='"+arch+"',os='linux',endian='little') | LINE3: p=remote/process toggle",
        "Use "+packFn+"() for packing. Hardcode offset. sendlineafter with EXACT prompts. End with p.interactive().",
        exploitMode==="lookup"?"Build complete 256-entry lookup_table dict.":"",
        "Append compile/run hints as comments at end.",
        "Return ONLY JSON: {\"script\":\"...\",\"lookup_table\":\"...\",\"usage\":\"...\",\"requirements\":[\"pwntools\"],\"notes\":\"...\",\"arch\":\""+arch+"\",\"bits\":"+bits+",\"gcc_cmd\":\"gcc -fno-stack-protector -no-pie"+gccFlag+" "+fname+".c -o "+fname+"\"}"
      ].filter(Boolean).join("\n");
      const sys = "You are an elite CTF exploit engineer. NEVER invent prompt strings. Use ONLY exact strings from analysis.input_prompts. Return ONLY valid JSON, no markdown.";
      const sysEx = sys + " You MUST respond with ONLY a valid JSON object. Start with { end with }. No markdown, no fences, no text outside JSON.";
      const reqEx = async model => {
        try {
          const r = await fetch("https://openrouter.ai/api/v1/chat/completions",{
            method:"POST",
            headers:{"Content-Type":"application/json","Authorization":"Bearer "+k,"HTTP-Referer":"https://raid6-khaki.vercel.app","X-Title":"codeXcracked"},
            body:JSON.stringify({model,max_tokens:3000,messages:[{role:"system",content:sysEx},{role:"user",content:promptLines}]}),
          });
          return r.json();
        } catch(e) { return {error:{message:e.message}}; }
      };
      const EX_MODELS = [
        "google/gemma-3-12b-it:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen-2.5-7b-instruct:free",
        "deepseek/deepseek-r1:free",
      ];
      let d = null, lastErrEx = "All exploit models failed";
      for (const model of EX_MODELS) {
        const r = await reqEx(model);
        if (r.error) { lastErrEx = r.error.message; continue; }
        const txt = r.choices?.[0]?.message?.content || "";
        if (txt && txt.includes("{")) { d = {choices:[{message:{content:txt}}]}; break; }
        lastErrEx = "No JSON from " + model;
      }
      if (!d) throw new Error(lastErrEx);
      setExploit(parseJSON(d.choices?.[0]?.message?.content||""));
      setStep("exploit");
    } catch(e){ setError("Exploit generation failed: "+e.message); } finally{ stopLoad(); setLoading(false); }
  };

  const copy = (text,key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(""),2000); };
  const reset = () => { setFile(null); setAnalysis(null); setClues(null); setExploit(null); setError(""); setStep("upload"); };
  const download = () => {
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([exploit.script],{type:"text/plain"})); a.download="exploit.py"; a.click();
  };
  const lockClick = item => { setLockedItem(item); setShowUpgrade(true); };

  return (
    <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      html{scroll-behavior:smooth;}
      body{background:#0a0a0a;color:#e8e8e8;font-family:'Inter',sans-serif;overflow-x:hidden;}

      /* ── SCROLLBAR ── */
      ::-webkit-scrollbar{width:4px;height:4px;}
      ::-webkit-scrollbar-track{background:transparent;}
      ::-webkit-scrollbar-thumb{background:#ff333344;border-radius:2px;}

      /* ── GLOBAL BG ── */
      .app{min-height:100vh;background:#0a0a0a;position:relative;}
      .app::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 50% -10%,rgba(255,30,30,0.12),transparent),radial-gradient(ellipse 40% 40% at 80% 80%,rgba(180,0,0,0.06),transparent);pointer-events:none;z-index:0;}

      /* ── NAV ── */
      .nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;padding:0 32px;height:58px;background:rgba(8,8,8,0.9);backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,0.05);}
      .nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer;text-decoration:none;}
      .nav-logo-mark{width:32px;height:32px;background:linear-gradient(135deg,#ff1a1a,#8b0000);display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:14px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);}
      .nav-logo-text{font-size:16px;font-weight:800;letter-spacing:-0.5px;}
      .nav-logo-text span{color:#ff3333;}
      .nav-logo-sub{font-size:10px;color:#555;margin-top:1px;letter-spacing:1px;}
      .nav-links{display:flex;gap:4px;margin-left:32px;}
      .nav-link{padding:6px 14px;font-size:13px;font-weight:500;color:#888;cursor:pointer;border-radius:4px;transition:all 0.2s;background:transparent;border:none;font-family:'Inter',sans-serif;}
      .nav-link:hover{color:#e8e8e8;background:rgba(255,255,255,0.06);}
      .nav-link.active{color:#ff3333;}
      .nav-right{margin-left:auto;display:flex;align-items:center;gap:10px;}
      .nav-free{font-size:10px;font-weight:700;color:#ff3333;border:1px solid rgba(255,51,51,0.3);padding:2px 8px;border-radius:3px;letter-spacing:1px;}
      .nav-key-dot{width:6px;height:6px;border-radius:50%;background:#ff3333;animation:pulse 2s infinite;}
      .nav-key-label{font-size:11px;color:#888;display:flex;align-items:center;gap:5px;}
      .nav-btn{height:30px;padding:0 14px;border-radius:4px;font-family:'Inter',sans-serif;font-size:11px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#aaa;transition:all 0.2s;letter-spacing:0.3px;}
      .nav-btn:hover{background:rgba(255,255,255,0.1);color:#e8e8e8;border-color:rgba(255,255,255,0.2);}

      /* ── HERO ── */
      .hero{position:relative;padding:80px 24px 72px;text-align:center;overflow:hidden;}
      .hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,51,51,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,51,51,0.04) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%);}
      .hero-title{font-size:clamp(36px,7vw,72px);font-weight:800;line-height:1.05;letter-spacing:-2px;margin-bottom:20px;animation:fadeUp 0.6s 0.1s ease both;}
      .hero-title .red{color:#ff3333;}
      .hero-title .dim{color:#444;}
      .hero-sub{font-size:clamp(14px,2vw,17px);color:#666;max-width:520px;margin:0 auto 40px;line-height:1.7;font-weight:400;animation:fadeUp 0.6s 0.2s ease both;}
      .hero-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;animation:fadeUp 0.6s 0.3s ease both;}
      .hero-btn-primary{height:46px;padding:0 28px;border-radius:5px;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;cursor:pointer;border:none;background:linear-gradient(135deg,#ff1a1a,#cc0000);color:#fff;transition:all 0.2s;letter-spacing:0.3px;}
      .hero-btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(255,30,30,0.35);}
      .hero-btn-secondary{height:46px;padding:0 28px;border-radius:5px;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#aaa;transition:all 0.2s;}
      .hero-btn-secondary:hover{background:rgba(255,255,255,0.08);color:#e8e8e8;border-color:rgba(255,255,255,0.2);}
      .hero-stats{display:flex;gap:40px;justify-content:center;margin-top:60px;animation:fadeUp 0.6s 0.4s ease both;}
      .hero-stat{text-align:center;}
      .hero-stat-n{font-size:28px;font-weight:800;color:#ff3333;letter-spacing:-1px;}
      .hero-stat-l{font-size:11px;color:#555;letter-spacing:1px;margin-top:2px;}

      /* ── FEATURES ── */
      .features{padding:80px 24px;max-width:1100px;margin:0 auto;}
      .section-header{text-align:center;margin-bottom:48px;}
      .section-eyebrow{font-size:11px;font-weight:700;color:#ff3333;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;}
      .section-title{font-size:clamp(24px,4vw,36px);font-weight:800;letter-spacing:-1px;color:#e8e8e8;}
      .section-title .dim{color:#444;}
      .features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.05);border-radius:8px;overflow:hidden;}
      .feat-card{padding:28px;background:#0d0d0d;transition:background 0.3s;}
      .feat-card:hover{background:#111;}
      .feat-icon{width:40px;height:40px;background:rgba(255,51,51,0.08);border:1px solid rgba(255,51,51,0.15);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:16px;}
      .feat-title{font-size:15px;font-weight:700;color:#e8e8e8;margin-bottom:8px;}
      .feat-desc{font-size:13px;color:#555;line-height:1.7;}

      /* ── ABOUT ── */
      .about{padding:80px 24px;max-width:800px;margin:0 auto;}
      .about-body{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:40px;backdrop-filter:blur(10px);}
      .about-title{font-size:clamp(22px,4vw,32px);font-weight:800;letter-spacing:-1px;color:#e8e8e8;margin-bottom:20px;}
      .about-title span{color:#ff3333;}
      .about-text{font-size:14px;color:#666;line-height:1.9;margin-bottom:16px;}
      .about-text strong{color:#aaa;font-weight:600;}
      .about-divider{border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0;}
      .about-author{display:flex;align-items:center;gap:14px;margin-top:24px;}
      .about-avatar{width:44px;height:44px;background:linear-gradient(135deg,#ff1a1a,#8b0000);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff;flex-shrink:0;}
      .about-author-name{font-size:15px;font-weight:700;color:#e8e8e8;}
      .about-author-role{font-size:12px;color:#555;margin-top:2px;}
      .disclaimer{margin-top:24px;padding:14px 16px;background:rgba(255,51,51,0.04);border:1px solid rgba(255,51,51,0.12);border-radius:5px;font-size:12px;color:#666;line-height:1.7;}
      .disclaimer strong{color:#ff6666;}

      /* ── TOOL PAGE ── */
      .tool-page{max-width:900px;margin:0 auto;padding:32px 16px 80px;position:relative;z-index:1;}

      /* ── CAT BAR ── */
      .cat-bar{display:flex;gap:4px;margin-bottom:10px;overflow-x:auto;padding-bottom:2px;}
      .cat-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:5px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.03);font-family:'Inter',sans-serif;font-size:12px;font-weight:500;color:#555;cursor:pointer;white-space:nowrap;transition:all 0.18s;flex-shrink:0;}
      .cat-btn:hover:not(.locked){border-color:rgba(255,51,51,0.3);color:#ff6666;}
      .cat-btn.active{background:rgba(255,51,51,0.1);border-color:rgba(255,51,51,0.3);color:#ff4444;}
      .cat-btn.locked{cursor:pointer;opacity:0.5;}
      .cat-lock{font-size:10px;}

      /* ── ENGINE BAR ── */
      .engine-bar{display:flex;align-items:center;gap:10px;margin-bottom:24px;padding:10px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;overflow-x:auto;}
      .engine-label{font-size:10px;font-weight:700;color:#444;letter-spacing:1.5px;text-transform:uppercase;flex-shrink:0;}
      .engine-tabs{display:flex;gap:4px;}
      .engine-tab{display:flex;align-items:center;gap:7px;padding:5px 12px;border-radius:4px;border:1px solid rgba(255,255,255,0.06);background:transparent;font-family:'Inter',sans-serif;font-size:12px;font-weight:500;color:#555;cursor:pointer;transition:all 0.18s;white-space:nowrap;}
      .engine-tab:hover:not(.locked){color:#e8e8e8;border-color:rgba(255,255,255,0.15);}
      .engine-tab.active{background:rgba(255,51,51,0.08);border-color:rgba(255,51,51,0.25);color:#ff4444;}
      .engine-tab.locked{opacity:0.5;cursor:pointer;}
      .engine-badge{font-size:8px;font-weight:800;padding:1px 5px;border-radius:2px;letter-spacing:0.5px;}

      /* ── STEP BAR ── */
      .stepbar{display:flex;align-items:center;margin-bottom:20px;padding:12px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;overflow-x:auto;gap:0;}
      .s-step{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:#444;flex-shrink:0;}
      .s-step.active{color:#ff4444;}
      .s-step.done{color:#888;}
      .s-num{width:22px;height:22px;border-radius:50%;border:1.5px solid #333;display:flex;align-items:center;justify-content:center;font-size:10px;color:#444;flex-shrink:0;}
      .s-step.active .s-num{border-color:#ff3333;color:#ff3333;background:rgba(255,51,51,0.1);}
      .s-step.done .s-num{border-color:#555;background:#222;color:#aaa;}
      .s-line{width:40px;height:1px;background:rgba(255,255,255,0.06);margin:0 10px;}

      /* ── GLASS PANEL ── */
      .g-panel{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:8px;margin-bottom:14px;overflow:hidden;backdrop-filter:blur(10px);animation:fadeUp 0.35s cubic-bezier(.22,.68,0,1.2) both;}
      .g-panel:nth-child(2){animation-delay:0.05s;}
      .g-panel:nth-child(3){animation-delay:0.1s;}
      .g-panel:nth-child(4){animation-delay:0.15s;}
      .g-panel-head{padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;}
      .g-panel-title{font-size:13px;font-weight:600;color:#e8e8e8;}
      .g-panel-sub{font-size:11px;color:#444;margin-top:2px;}
      .g-panel-body{padding:20px;}

      /* ── DROP ZONE ── */
      .dropzone{border:1px dashed rgba(255,255,255,0.1);border-radius:6px;padding:48px 20px;text-align:center;cursor:pointer;transition:all 0.25s;}
      .dropzone:hover,.dropzone.over{border-color:rgba(255,51,51,0.4);background:rgba(255,51,51,0.03);}
      .drop-icon{width:48px;height:48px;background:rgba(255,51,51,0.06);border:1px solid rgba(255,51,51,0.12);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:20px;}
      .drop-title{font-size:14px;font-weight:600;color:#e8e8e8;margin-bottom:5px;}
      .drop-sub{font-size:12px;color:#555;}
      .drop-sub span{color:#ff4444;}
      .drop-input{display:none;}
      .file-pill{display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:5px;margin-top:12px;}
      .file-pill-name{font-size:13px;font-weight:500;flex:1;color:#e8e8e8;}
      .file-pill-size{font-size:11px;color:#555;}
      .icon-btn{background:none;border:none;cursor:pointer;color:#444;font-size:14px;padding:2px 6px;border-radius:3px;transition:color 0.15s;}
      .icon-btn:hover{color:#ff3333;}

      /* ── FORM ── */
      .form-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;align-items:flex-end;}
      .form-field{display:flex;flex-direction:column;gap:5px;}
      .form-label{font-size:10px;font-weight:600;color:#555;letter-spacing:0.5px;text-transform:uppercase;}
      .form-select,.form-input{height:36px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#e8e8e8;font-family:'Inter',sans-serif;font-size:13px;padding:0 10px;outline:none;transition:border-color 0.15s;}
      .form-select:focus,.form-input:focus{border-color:rgba(255,51,51,0.4);}
      .form-input{width:210px;}
      .form-input::placeholder{color:#333;}
      .form-select option{background:#1a1a1a;color:#e8e8e8;}

      /* ── BUTTONS ── */
      .btn{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 18px;border-radius:4px;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.18s;border:1px solid transparent;white-space:nowrap;}
      .btn-red{background:linear-gradient(135deg,#ff1a1a,#cc0000);color:#fff;border:none;}
      .btn-red:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(255,30,30,0.3);}
      .btn-red:active{transform:none;}
      .btn-red:disabled{background:#3a1a1a;color:#553333;cursor:not-allowed;transform:none;box-shadow:none;}
      .btn-ghost{background:rgba(255,255,255,0.04);color:#888;border-color:rgba(255,255,255,0.08);}
      .btn-ghost:hover{background:rgba(255,255,255,0.08);color:#e8e8e8;border-color:rgba(255,255,255,0.15);}

      /* ── INFO CARDS ── */
      .g-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;}
      @media(max-width:560px){.g-grid{grid-template-columns:1fr;}}
      .g-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:5px;padding:12px 14px;transition:border-color 0.2s;}
      .g-card:hover{border-color:rgba(255,255,255,0.1);}
      .g-card-label{font-size:10px;font-weight:600;color:#444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;}
      .g-card-value{font-size:13px;color:#aaa;line-height:1.5;font-weight:500;}
      .g-card-value.crit{color:#ff4444;font-weight:600;}
      .g-card-value.slate{color:#888;}
      .g-card-value.acc{color:#ff6666;}

      /* ── BADGE ── */
      .badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;}
      .badge-easy{background:rgba(34,170,34,0.1);color:#22aa22;border:1px solid rgba(34,170,34,0.2);}
      .badge-medium{background:rgba(255,153,0,0.1);color:#ff9900;border:1px solid rgba(255,153,0,0.2);}
      .badge-hard{background:rgba(255,51,51,0.1);color:#ff3333;border:1px solid rgba(255,51,51,0.2);}

      /* ── TAGS ── */
      .tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
      .tag{padding:3px 10px;background:rgba(255,51,51,0.05);border:1px solid rgba(255,51,51,0.15);border-radius:3px;font-size:11px;color:#ff6666;font-family:'JetBrains Mono',monospace;}
      .tag-green{background:rgba(34,170,34,0.05);border-color:rgba(34,170,34,0.15);color:#44cc44;}

      /* ── INSIGHT ── */
      .insight{background:rgba(255,51,51,0.04);border-left:2px solid #ff3333;padding:12px 16px;font-size:13px;color:#888;line-height:1.7;margin-bottom:14px;border-radius:0 4px 4px 0;}
      .insight strong{color:#ff4444;}

      /* ── STEPS LIST ── */
      .steps-list{list-style:none;display:flex;flex-direction:column;gap:8px;}
      .step-item{display:flex;gap:12px;align-items:flex-start;font-size:13px;color:#666;line-height:1.6;}
      .step-badge{width:22px;height:22px;flex-shrink:0;background:rgba(255,51,51,0.1);border:1px solid rgba(255,51,51,0.2);color:#ff4444;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;margin-top:1px;}

      /* ── MODE TABS ── */
      .mode-tabs{display:flex;border:1px solid rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;width:fit-content;margin-bottom:14px;}
      .mode-tab{padding:6px 16px;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;cursor:pointer;background:rgba(255,255,255,0.02);border:none;border-right:1px solid rgba(255,255,255,0.08);color:#555;transition:all 0.15s;}
      .mode-tab:last-child{border-right:none;}
      .mode-tab.active{background:rgba(255,51,51,0.1);color:#ff4444;}

      /* ── CODE ── */
      .code-wrap{border:1px solid rgba(255,255,255,0.07);border-radius:5px;overflow:hidden;margin-top:4px;}
      .code-bar{background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.07);padding:7px 14px;display:flex;align-items:center;justify-content:space-between;}
      .code-lang{font-size:11px;color:#444;font-family:'JetBrains Mono',monospace;}
      .code-copy-btn{font-family:'Inter',sans-serif;font-size:11px;font-weight:600;color:#555;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:3px;padding:2px 10px;cursor:pointer;transition:all 0.15s;}
      .code-copy-btn:hover{background:rgba(255,51,51,0.1);color:#ff4444;border-color:rgba(255,51,51,0.2);}
      .code-pre{font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.75;color:#7a8a7a;background:#080808;padding:16px;overflow-x:auto;white-space:pre;max-height:440px;overflow-y:auto;}

      /* ── TERMINAL ── */
      .terminal{background:#060606;border:1px solid rgba(255,255,255,0.06);border-radius:5px;overflow:hidden;margin-top:14px;}
      .t-bar{background:rgba(255,255,255,0.03);padding:7px 14px;display:flex;align-items:center;gap:6px;}
      .t-dot{width:10px;height:10px;border-radius:50%;}
      .t-r{background:#ff5f57;}.t-y{background:#febc2e;}.t-g{background:#28c840;}
      .t-tag{margin-left:8px;font-size:10px;color:#333;}
      .t-body{padding:12px 16px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:2;}
      .t-line{display:flex;gap:6px;}
      .t-prompt{color:#ff4444;}
      .t-cmd{color:#888;}
      .t-out{color:#4a7a4a;padding-left:16px;}
      .t-cmt{color:#333;}

      /* ── DEMO WARNING ── */
      .demo-warn{display:flex;gap:12px;padding:14px 16px;background:rgba(255,153,0,0.04);border:1px solid rgba(255,153,0,0.15);border-left:2px solid #ff9900;border-radius:4px;margin-bottom:12px;font-size:12px;color:#666;line-height:1.6;}
      .demo-warn-icon{font-size:16px;flex-shrink:0;margin-top:1px;}
      .demo-warn strong{display:block;color:#cc7700;font-size:12px;margin-bottom:3px;}

      /* ── REPLIT BANNER ── */
      .replit-banner{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px;background:linear-gradient(135deg,rgba(15,15,15,0.9),rgba(25,15,5,0.9));border:1px solid rgba(242,98,7,0.2);border-radius:6px;margin-top:16px;flex-wrap:wrap;backdrop-filter:blur(10px);}
      .replit-left{display:flex;align-items:center;gap:12px;}
      .replit-icon{width:34px;height:34px;background:#f26207;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;flex-shrink:0;}
      .replit-title{font-size:13px;font-weight:700;color:#e8e8e8;}
      .replit-sub{font-size:11px;color:#555;margin-top:2px;}
      .btn-replit{background:#f26207;color:#fff;border:none;height:34px;padding:0 16px;font-size:12px;font-weight:700;border-radius:4px;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.18s;white-space:nowrap;}
      .btn-replit:hover{background:#d4550a;transform:translateY(-1px);box-shadow:0 4px 12px rgba(242,98,7,0.3);}

      /* ── WORKFLOW ── */
      .workflow-section{margin-top:14px;border:1px solid rgba(255,255,255,0.07);border-radius:6px;overflow:hidden;}
      .wf-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:rgba(255,255,255,0.02);border:none;cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:#888;transition:background 0.15s;}
      .wf-toggle:hover{background:rgba(255,255,255,0.04);}
      .wf-body{padding:16px;border-top:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:10px;}
      .wf-card{display:flex;gap:14px;padding:14px;border:1px solid rgba(255,255,255,0.06);border-radius:5px;animation:fadeUp 0.25s ease both;}
      .wf-flag{border-color:rgba(34,170,34,0.15);background:rgba(34,170,34,0.03);}
      .wf-num{width:26px;height:26px;flex-shrink:0;background:rgba(255,51,51,0.1);border:1px solid rgba(255,51,51,0.2);color:#ff4444;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin-top:1px;}
      .wf-content{flex:1;min-width:0;}
      .wf-title{font-size:13px;font-weight:600;color:#e8e8e8;margin-bottom:4px;}
      .wf-desc{font-size:12px;color:#555;line-height:1.6;}
      .wf-cmd-row{display:flex;align-items:center;gap:8px;margin-top:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:4px;padding:8px 10px;overflow-x:auto;}
      .wf-cmd{font-family:'JetBrains Mono',monospace;font-size:11px;color:#7a8a7a;flex:1;white-space:nowrap;background:none;border:none;}
      .wf-copy{flex-shrink:0;font-family:'Inter',sans-serif;font-size:10px;font-weight:600;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:3px;padding:2px 8px;cursor:pointer;color:#555;transition:all 0.15s;}
      .wf-copy:hover{background:rgba(255,51,51,0.1);color:#ff4444;border-color:rgba(255,51,51,0.2);}
      .wf-check{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
      .wf-check-item{font-size:12px;color:#555;background:rgba(255,255,255,0.03);padding:4px 10px;border-radius:4px;border:1px solid rgba(255,255,255,0.07);}

      /* ── REQ TAGS ── */
      .req-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
      .req-tag{font-family:'JetBrains Mono',monospace;font-size:11px;padding:3px 10px;background:rgba(100,130,255,0.05);border:1px solid rgba(100,130,255,0.15);border-radius:3px;color:#6688cc;}

      /* ── ACTION ROW ── */
      .action-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;align-items:center;}
      .divider{border:none;border-top:1px solid rgba(255,255,255,0.06);margin:14px 0;}
      .mt-16{margin-top:16px;} .mb-4{margin-bottom:4px;}
      .error-box{background:rgba(255,51,51,0.04);border:1px solid rgba(255,51,51,0.15);border-left:2px solid #ff3333;border-radius:4px;padding:12px 16px;font-size:13px;color:#ff6666;margin-bottom:14px;}

      /* ── LOADING OVERLAY ── */
      .overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);animation:fadeIn 0.2s ease;}
      .overlay-card{background:#0d0d0d;border:1px solid rgba(255,255,255,0.08);border-top:2px solid #ff3333;border-radius:8px;padding:24px 28px;width:320px;box-shadow:0 24px 64px rgba(0,0,0,0.6);animation:fadeUp 0.25s cubic-bezier(.22,.68,0,1.2);}
      .overlay-head{display:flex;align-items:center;gap:12px;margin-bottom:18px;}
      .spinner{width:18px;height:18px;flex-shrink:0;border:2px solid rgba(255,51,51,0.2);border-top-color:#ff3333;border-radius:50%;animation:spin 0.7s linear infinite;}
      .overlay-title{font-size:14px;font-weight:700;color:#e8e8e8;}
      .overlay-steps{display:flex;flex-direction:column;gap:7px;}
      .o-step{display:flex;align-items:center;gap:10px;font-size:12px;color:#333;transition:color 0.3s;}
      .o-step.active{color:#e8e8e8;font-weight:500;}
      .o-step.done{color:#555;}
      .o-icon{width:14px;height:14px;flex-shrink:0;border-radius:50%;border:1.5px solid #2a2a2a;position:relative;overflow:hidden;}
      .o-step.active .o-icon{border-color:#ff3333;background:rgba(255,51,51,0.1);}
      .o-step.active .o-icon::after{content:'';position:absolute;inset:1px;border-radius:50%;border:1.5px solid transparent;border-top-color:#ff3333;animation:spin 0.7s linear infinite;}
      .o-step.done .o-icon{background:#ff3333;border-color:#ff3333;}
      .o-step.done .o-icon::before{content:"✓";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;}
      .overlay-footer{margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05);font-size:10px;color:#333;letter-spacing:0.5px;}

      /* ── MODAL ── */
      .modal-bg{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;padding:16px;backdrop-filter:blur(8px);}
      .modal-box{background:#0d0d0d;border:1px solid rgba(255,255,255,0.08);border-top:2px solid #ff3333;border-radius:8px;width:100%;max-width:460px;box-shadow:0 24px 64px rgba(0,0,0,0.6);animation:fadeUp 0.25s cubic-bezier(.22,.68,0,1.2);overflow:hidden;}
      .modal-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);}
      .modal-title{font-size:15px;font-weight:700;color:#e8e8e8;}
      .modal-body{padding:18px;}
      .modal-label{font-size:10px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;}
      .active-key-box{display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:5px;}
      .active-key-val{font-family:'JetBrains Mono',monospace;font-size:12px;color:#666;flex:1;}
      .saved-list{display:flex;flex-direction:column;gap:5px;}
      .saved-row{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border:1px solid rgba(255,255,255,0.06);border-radius:5px;transition:background 0.15s;}
      .saved-row:hover{background:rgba(255,255,255,0.03);}
      .saved-label{font-size:13px;font-weight:600;color:#e8e8e8;}
      .saved-preview{font-family:'JetBrains Mono',monospace;font-size:10px;color:#444;margin-top:2px;}
      .add-form{display:flex;gap:8px;flex-wrap:wrap;}
      .modal-note{font-size:11px;color:#333;margin-top:12px;line-height:1.5;}
      .upgrade-hero{text-align:center;padding:16px 0;}
      .upgrade-icon-big{font-size:36px;margin-bottom:8px;}
      .upgrade-name{font-size:18px;font-weight:800;color:#e8e8e8;margin-bottom:6px;}
      .upgrade-desc{font-size:13px;color:#555;margin-bottom:12px;line-height:1.5;}
      .upgrade-feats{display:flex;flex-direction:column;gap:6px;margin-top:14px;}
      .upgrade-feat{display:flex;align-items:center;gap:8px;font-size:13px;color:#666;padding:7px 12px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid rgba(255,255,255,0.05);}

      /* ── ANIMATIONS ── */
      @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
      @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
      @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}
      @keyframes spin{to{transform:rotate(360deg);}}
      @keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}

      /* ── CxC LOGO ── */
      .cxc-logo{display:flex;align-items:center;gap:0;font-size:20px;font-weight:900;line-height:1;letter-spacing:-1px;font-family:'Inter',sans-serif;}
      .cxc-c1{color:#ff3333;text-shadow:0 0 12px rgba(255,51,51,0.5);}
      .cxc-x{color:#fff;font-size:16px;margin:0 1px;opacity:0.4;}
      .cxc-c2{color:#ff3333;text-shadow:0 0 12px rgba(255,51,51,0.5);}
      .nav-brand{margin-left:8px;}
      .nav-btn-cta{height:30px;padding:0 14px;border-radius:4px;font-family:'Inter',sans-serif;font-size:12px;font-weight:700;cursor:pointer;border:none;background:linear-gradient(135deg,#ff1a1a,#cc0000);color:#fff;transition:all 0.2s;letter-spacing:0.3px;}
      .nav-btn-cta:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(255,30,30,0.3);}

      /* ── HOME SHELL (full viewport, two-col) ── */
      .home-shell{display:grid;grid-template-columns:1fr 1fr;gap:0;min-height:calc(100vh - 58px);max-width:1200px;margin:0 auto;padding:0 32px;align-items:center;}
      @media(max-width:768px){.home-shell{grid-template-columns:1fr;padding:32px 16px;min-height:auto;gap:32px;}}
      .home-left{padding-right:40px;}
      @media(max-width:768px){.home-left{padding-right:0;}}
      .home-eyebrow{font-size:11px;font-weight:700;color:#ff3333;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;}
      .home-title{font-size:clamp(32px,5vw,56px);font-weight:800;line-height:1.08;letter-spacing:-2px;margin-bottom:16px;animation:fadeUp 0.5s ease both;}
      .home-sub{font-size:15px;color:#555;line-height:1.75;margin-bottom:24px;font-weight:400;}
      .home-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:32px;}
      .home-stats{display:flex;gap:24px;flex-wrap:wrap;}
      .home-stat{text-align:left;}
      .home-stat-n{font-size:22px;font-weight:800;color:#ff3333;letter-spacing:-0.5px;}
      .home-stat-l{font-size:10px;color:#444;letter-spacing:0.5px;margin-top:1px;}
      .home-right{padding-left:40px;border-left:1px solid rgba(255,255,255,0.05);}
      @media(max-width:768px){.home-right{padding-left:0;border-left:none;}}
      .home-feat-list{display:flex;flex-direction:column;gap:2px;}
      .home-feat-row{display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:5px;transition:background 0.2s;cursor:default;}
      .home-feat-row:hover{background:rgba(255,255,255,0.02);}
      .home-feat-icon{font-size:16px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:rgba(255,51,51,0.06);border:1px solid rgba(255,51,51,0.1);border-radius:5px;flex-shrink:0;margin-top:1px;}
      .home-feat-title{font-size:13px;font-weight:600;color:#e8e8e8;margin-bottom:2px;}
      .home-feat-desc{font-size:12px;color:#444;line-height:1.5;}

      /* ── COLLAB ── */
      .collab-row{margin:4px 0;}
      .collab-label{font-size:11px;font-weight:700;color:#444;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:8px;}
      .collab-tags{display:flex;gap:8px;flex-wrap:wrap;}
      .collab-tag{padding:5px 14px;border:1px solid rgba(255,51,51,0.2);border-radius:4px;font-size:13px;font-weight:600;color:#ff6666;background:rgba(255,51,51,0.05);}

      /* ── PRICING ── */
      .pricing-modal{background:#0d0d0d;border:1px solid rgba(255,255,255,0.08);border-top:2px solid #ff3333;border-radius:8px;width:100%;max-width:820px;box-shadow:0 24px 64px rgba(0,0,0,0.7);animation:fadeUp 0.25s cubic-bezier(.22,.68,0,1.2);overflow:hidden;max-height:90vh;overflow-y:auto;}
      .pricing-body{padding:20px;}
      .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
      @media(max-width:640px){.pricing-grid{grid-template-columns:1fr;}}
      .price-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:20px;display:flex;flex-direction:column;gap:0;position:relative;}
      .price-card-pro{border-color:rgba(255,51,51,0.3);background:rgba(255,51,51,0.04);}
      .price-popular{position:absolute;top:-1px;right:12px;background:#ff3333;color:#fff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:0 0 4px 4px;letter-spacing:0.5px;}
      .price-tier{font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;}
      .price-amount{font-size:32px;font-weight:800;color:#e8e8e8;letter-spacing:-1px;margin-bottom:4px;}
      .price-amount span{font-size:14px;color:#444;font-weight:400;}
      .price-desc{font-size:12px;color:#444;margin-bottom:14px;line-height:1.5;}
      .price-feats{list-style:none;display:flex;flex-direction:column;gap:7px;margin-bottom:18px;flex:1;}
      .price-feats li{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#666;line-height:1.4;}
      .pf-check{color:#ff3333;font-size:11px;flex-shrink:0;margin-top:1px;}
      .price-btn{width:100%;height:36px;border-radius:4px;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all 0.18s;}
      .price-btn-red{background:linear-gradient(135deg,#ff1a1a,#cc0000);color:#fff;}
      .price-btn-red:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(255,30,30,0.3);}
      .price-btn-ghost{background:rgba(255,255,255,0.04);color:#555;border:1px solid rgba(255,255,255,0.08);}
      .pricing-note{font-size:12px;color:#333;text-align:center;margin-top:14px;line-height:1.6;}
      .pricing-note strong{color:#666;}
      .order-plan-badge{display:inline-block;padding:4px 12px;background:rgba(255,51,51,0.1);border:1px solid rgba(255,51,51,0.2);border-radius:4px;font-size:13px;font-weight:700;color:#ff4444;margin-bottom:14px;}
      .redotpay-box{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:5px;padding:14px 16px;text-align:center;}
      .rdp-label{font-size:10px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
      .rdp-id{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;color:#e8e8e8;letter-spacing:2px;}

      /* ── FOOTER ── */
      .footer{border-top:1px solid rgba(255,255,255,0.05);padding:28px 32px;}
      .footer-inner{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;flex-wrap:wrap;max-width:1100px;margin:0 auto;}
      .footer-logo{font-size:16px;font-weight:800;letter-spacing:-0.5px;margin-bottom:5px;}
      .footer-logo span{color:#ff3333;}
      .footer-sub{font-size:12px;color:#333;}
      .footer-legal{font-size:11px;color:#222;margin-top:3px;}
      .footer-links{display:flex;gap:4px;align-items:center;}
      .footer-link{background:none;border:none;cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;color:#444;padding:4px 10px;border-radius:4px;transition:color 0.15s;}
      .footer-link:hover{color:#e8e8e8;}
      .footer-right{text-align:right;}
    `}</style>

    {loading && (
      <div className="overlay">
        <div className="overlay-card">
          <div className="overlay-head"><div className="spinner"/><div className="overlay-title">{lTitle}</div></div>
          <div className="overlay-steps">
            {lSteps.map((s,i)=>(
              <div key={i} className={"o-step "+(s.done?"done":s.active?"active":"")}>
                <div className="o-icon"/>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="overlay-footer">codeXcracked · AI Processing</div>
        </div>
      </div>
    )}

    {showDash && (
      <div className="modal-bg" onClick={()=>setShowDash(false)}>
        <div className="modal-box" onClick={e=>e.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-title">API Key Dashboard</div>
            <button className="icon-btn" onClick={()=>setShowDash(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="modal-label">Active Key</div>
            <div className="active-key-box">
              <span className="nav-key-dot"/>
              <span className="active-key-val">{apiKey?apiKey.slice(0,8)+"•".repeat(16):"No key selected"}</span>
              {apiKey&&<button className="icon-btn" style={{marginLeft:"auto",color:"#ff3333"}} onClick={()=>setApiKey("")}>Clear</button>}
            </div>
            {savedKeys.length>0&&(
              <>
                <div className="modal-label" style={{marginTop:16}}>Saved Keys</div>
                <div className="saved-list">
                  {savedKeys.map(k=>(
                    <div key={k.id} className="saved-row">
                      <div><div className="saved-label">{k.label}</div><div className="saved-preview">{k.key.slice(0,8)}{"•".repeat(12)}</div></div>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn btn-ghost" style={{height:28,padding:"0 12px",fontSize:11}} onClick={()=>useKey(k)}>Use</button>
                        <button className="icon-btn" style={{color:"#ff3333"}} onClick={()=>deleteKey(k.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="modal-label" style={{marginTop:16}}>Add New Key</div>
            <div className="add-form">
              <input className="form-input" style={{flex:1,minWidth:0}} placeholder="Label" value={newLabel} onChange={e=>setNewLabel(e.target.value)}/>
              <input className="form-input" style={{flex:2,minWidth:0}} type="password" placeholder="sk-or-..." value={newVal} onChange={e=>setNewVal(e.target.value)}/>
              <button className="btn btn-red" style={{flexShrink:0}} onClick={saveKey}>Save</button>
            </div>
            <div className="modal-label" style={{marginTop:16}}>Use Directly</div>
            <input className="form-input" style={{width:"100%"}} type="password" placeholder="Paste key..." value={apiKey} onChange={e=>setApiKey(e.target.value)}/>
            <div className="modal-note">Stored in your browser only. Never sent anywhere except OpenRouter.</div>
          </div>
        </div>
      </div>
    )}

    {showUpgrade && (
      <div className="modal-bg" onClick={()=>setShowUpgrade(false)}>
        <div className="modal-box" onClick={e=>e.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-title">🔒 {lockedItem?.label}</div>
            <button className="icon-btn" onClick={()=>setShowUpgrade(false)}>✕</button>
          </div>
          <div className="modal-body">
            <p style={{fontSize:13,color:"#666",marginBottom:16,lineHeight:1.6}}>{lockedItem?.desc}</p>
            <button className="btn btn-red" style={{width:"100%",height:40,fontSize:13}} onClick={()=>{setShowUpgrade(false);setShowPricing(true);}}>
              View Pricing Plans →
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ════ PRICING MODAL ════ */}
    {showPricing && (
      <div className="modal-bg" onClick={()=>{setShowPricing(false);setOrderPlan(null);setOrderSent(false);setTxId("");}}>
        <div className="pricing-modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-title">Pricing Plans</div>
            <button className="icon-btn" onClick={()=>{setShowPricing(false);setOrderPlan(null);setOrderSent(false);setTxId("");}}>✕</button>
          </div>
          {!orderPlan ? (
            <div className="pricing-body">
              <div className="pricing-grid">
                {/* Free */}
                <div className="price-card">
                  <div className="price-tier">Free</div>
                  <div className="price-amount">$0<span>/mo</span></div>
                  <div className="price-desc">For learners and casual CTF players</div>
                  <ul className="price-feats">
                    {["CTF binary analysis","Free Engine only","Bruteforce & lookup scripts","Execution workflow","OpenRouter key required","Community support"].map((f,i)=><li key={i}><span className="pf-check">✓</span>{f}</li>)}
                  </ul>
                  <button className="price-btn price-btn-ghost" onClick={()=>setShowPricing(false)}>Current Plan</button>
                </div>
                {/* Pro */}
                <div className="price-card price-card-pro">
                  <div className="price-popular">Most Popular</div>
                  <div className="price-tier">Pro</div>
                  <div className="price-amount">$9<span>/mo</span></div>
                  <div className="price-desc">For serious CTF competitors and researchers</div>
                  <ul className="price-feats">
                    {["Everything in Free","Bonehead + Ted Bundy engines","Malware & pentest categories","Unlimited analyses","Validated exploit scripts","Priority processing","Email support"].map((f,i)=><li key={i}><span className="pf-check">✓</span>{f}</li>)}
                  </ul>
                  <button className="price-btn price-btn-red" onClick={()=>setOrderPlan("Pro — $9/mo")}>Subscribe →</button>
                </div>
                {/* Elite */}
                <div className="price-card">
                  <div className="price-tier">Elite</div>
                  <div className="price-amount">$24<span>/mo</span></div>
                  <div className="price-desc">For red teamers and security professionals</div>
                  <ul className="price-feats">
                    {["Everything in Pro","Codex Giga engine","All 6 categories","Red team & OSINT modules","PDF report export","Team workspace (3 seats)","Priority support"].map((f,i)=><li key={i}><span className="pf-check">✓</span>{f}</li>)}
                  </ul>
                  <button className="price-btn price-btn-red" onClick={()=>setOrderPlan("Elite — $24/mo")}>Subscribe →</button>
                </div>
              </div>
              <div className="pricing-note">Payments accepted via <strong>Redotpay</strong>. After payment, submit your transaction ID to activate your plan.</div>
            </div>
          ) : orderSent ? (
            <div className="modal-body" style={{textAlign:"center",padding:"32px 24px"}}>
              <div style={{fontSize:40,marginBottom:12}}>✓</div>
              <div style={{fontSize:16,fontWeight:700,color:"#e8e8e8",marginBottom:8}}>Order Received</div>
              <div style={{fontSize:13,color:"#555",lineHeight:1.7}}>Your transaction ID has been submitted. We will verify and activate your <strong style={{color:"#ff4444"}}>{orderPlan}</strong> plan within 24 hours.</div>
              <button className="btn btn-ghost" style={{marginTop:20}} onClick={()=>{setShowPricing(false);setOrderPlan(null);setOrderSent(false);setTxId("");}}>Close</button>
            </div>
          ) : (
            <div className="modal-body">
              <div className="order-plan-badge">{orderPlan}</div>
              <div style={{fontSize:13,color:"#888",marginBottom:16,lineHeight:1.7}}>
                Send payment to the Redotpay ID below, then paste your transaction ID to confirm your order.
              </div>
              <div className="redotpay-box">
                <div className="rdp-label">Redotpay ID</div>
                <div className="rdp-id">1899721816</div>
                <button className="wf-copy" style={{marginTop:6}} onClick={()=>{navigator.clipboard.writeText("1899721816");}}>Copy ID</button>
              </div>
              <div style={{marginTop:16}}>
                <div className="form-label" style={{marginBottom:6}}>Transaction ID</div>
                <input className="form-input" style={{width:"100%"}} placeholder="Paste your Redotpay transaction ID" value={txId} onChange={e=>setTxId(e.target.value)}/>
              </div>
              <div style={{marginTop:8,fontSize:11,color:"#333"}}>Your email or contact info (optional but helps faster activation)</div>
              <button className="btn btn-red" style={{width:"100%",marginTop:14,height:40}} disabled={!txId.trim()} onClick={()=>setOrderSent(true)}>
                Confirm Order
              </button>
              <button className="btn btn-ghost" style={{width:"100%",marginTop:8,height:36,fontSize:12}} onClick={()=>setOrderPlan(null)}>← Back to Plans</button>
            </div>
          )}
        </div>
      </div>
    )}

    <div className="app">
      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo" onClick={()=>setPage("home")}>
          <div className="cxc-logo">
            <span className="cxc-c1">C</span><span className="cxc-x">×</span><span className="cxc-c2">C</span>
          </div>
          <div className="nav-brand">
            <div className="nav-logo-text"><span>codeX</span>cracked</div>
            <div className="nav-logo-sub">BY PROJECT ADNAN</div>
          </div>
        </div>
        <div className="nav-links">
          <button className={"nav-link"+(page==="home"?" active":"")} onClick={()=>setPage("home")}>Home</button>
          <button className={"nav-link"+(page==="tool"?" active":"")} onClick={()=>setPage("tool")}>Analyzer</button>
          <button className={"nav-link"+(page==="about"?" active":"")} onClick={()=>setPage("about")}>About</button>
          <button className={"nav-link"+(showPricing?" active":"")} onClick={()=>setShowPricing(true)}>Pricing</button>
        </div>
        <div className="nav-right">
          <span className="nav-free">FREE</span>
          {apiKey&&<div className="nav-key-label"><span className="nav-key-dot"/>API</div>}
          <button className="nav-btn-cta" onClick={()=>setPage("tool")}>Open Analyzer</button>
          <button className="nav-btn" onClick={()=>setShowDash(true)}>⚙</button>
        </div>
      </nav>

      {/* ════ HOME PAGE ════ */}
      {page==="home"&&(
        <div className="home-shell">
          {/* Left panel */}
          <div className="home-left">
            <div className="home-eyebrow">CTF Analysis Platform</div>
            <h1 className="home-title">
              Break binaries.<br/>
              <span className="red">Crack</span> the <span className="dim">code.</span>
            </h1>
            <p className="home-sub">Upload any CTF challenge binary. Get a structured vulnerability report, step-by-step exploit methodology, and a production-ready pwntools script — in seconds.</p>
            <div className="home-actions">
              <button className="hero-btn-primary" onClick={()=>setPage("tool")}>Open Analyzer →</button>
              <button className="hero-btn-secondary" onClick={()=>setShowPricing(true)}>View Pricing</button>
            </div>
            <div className="home-stats">
              {[["6+","Categories"],["4","AI Engines"],["256","Char Lookup"],["Free","To Start"]].map(([n,l])=>(
                <div key={l} className="home-stat">
                  <div className="home-stat-n">{n}</div>
                  <div className="home-stat-l">{l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Right panel — feature list */}
          <div className="home-right">
            <div className="home-feat-list">
              {[
                {icon:"⚔", title:"Binary Analysis",    desc:"Architecture detection, string extraction, vulnerability classification"},
                {icon:"⬡", title:"Exploit Clues",      desc:"Overflow math, loop detection, exact prompt extraction"},
                {icon:"⬢", title:"Pwntools Scripts",   desc:"Arch-aware, exact prompts, ROP hints, remote/local toggle"},
                {icon:"◎", title:"Lookup Tables",      desc:"Full 256-entry input→response maps for brute-force challenges"},
                {icon:"✕", title:"Run Workflow",       desc:"Copy-ready commands for compile, inspect, run local and remote"},
                {icon:"☣", title:"Pro Categories",     desc:"Malware, pentest, OSINT, forensics, red team — coming in Pro"},
              ].map(f=>(
                <div key={f.title} className="home-feat-row">
                  <div className="home-feat-icon">{f.icon}</div>
                  <div>
                    <div className="home-feat-title">{f.title}</div>
                    <div className="home-feat-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ ABOUT PAGE ════ */}
      {page==="about"&&(
        <div className="about">
          <div className="about-body">
            <h2 className="about-title"><span>codeX</span>cracked</h2>
            <p className="about-text">
              codeXcracked is a standalone binary analysis and CTF exploit-assistance platform. It is an independent initiative from <strong>project Adnan</strong> and has no affiliation with 8BiT Softworks or any of its products.
            </p>
            <p className="about-text">
              The platform analyzes CTF challenge files — ELF binaries, C source, scripts, archives — and produces structured vulnerability reports, step-by-step attack plans, and pwntools-based Python exploit scaffolding. It extracts exact prompt strings from binaries, computes integer overflow targets, identifies loop structures, and builds payload templates tailored to the specific target.
            </p>
            <p className="about-text">
              All AI inference runs through <strong>OpenRouter</strong> directly from your browser. Your files are never uploaded to any server.
            </p>
            <div className="about-divider"/>
            <div className="collab-row">
              <div className="collab-label">Made in collaboration with</div>
              <div className="collab-tags">
                <span className="collab-tag">MiM Makes Monsters</span>
                <span className="collab-tag">ModzMafia</span>
              </div>
            </div>
            <div className="about-divider"/>
            <div className="about-author">
              <div className="about-avatar">A</div>
              <div>
                <div className="about-author-name">project Adnan</div>
                <div className="about-author-role">Independent Security Researcher · CTF Player · Tool Developer</div>
              </div>
            </div>
            <div className="disclaimer">
              <strong>Disclaimer:</strong> codeXcracked is intended exclusively for legal, authorized security research and educational CTF competitions. All generated scripts are demonstration-grade guides. The platform does not condone unauthorized access to any system. Use only against systems you own or have explicit written permission to test.
            </div>
          </div>
        </div>
      )}

      {/* ════ TOOL PAGE ════ */}
      {page==="tool"&&(
        <div className="tool-page">
          {/* Category bar */}
          <div className="cat-bar">
            {CATEGORIES.map(c=>(
              <button key={c.id} className={"cat-btn "+(category===c.id?"active":"")+(c.free?"":" locked")} onClick={()=>{ if(!c.free){lockClick({...c,badge:"PRO",color:"#ff3333"});return;} setCategory(c.id); }} title={c.desc}>
                <span>{c.icon}</span><span>{c.label}</span>{!c.free&&<span className="cat-lock">🔒</span>}
              </button>
            ))}
          </div>

          {/* Engine bar */}
          <div className="engine-bar">
            <span className="engine-label">Engine</span>
            <div className="engine-tabs">
              {ENGINES.map(e=>(
                <button key={e.id} className={"engine-tab "+(engine===e.id?"active":"")+(e.locked?" locked":"")} onClick={()=>{ if(e.locked){lockClick(e);return;} setEngine(e.id); }}>
                  <span style={{fontWeight:600}}>{e.label}</span>
                  <span className="engine-badge" style={{background:e.color+"22",color:e.color,border:"1px solid "+e.color+"33"}}>{e.badge}</span>
                  {e.locked&&<span style={{fontSize:10}}>🔒</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Step bar */}
          <div className="stepbar">
            {["upload","analyze","clues","exploit"].map((s,i)=>{
              const ci=["upload","analyze","clues","exploit"].indexOf(step);
              return (
                <div key={s} className={"s-step "+(i<ci?"done":i===ci?"active":"")}>
                  <div className="s-num">{i<ci?"✓":i+1}</div>
                  <span>{["Upload","Analyze","Clues","Exploit"][i]}</span>
                  {i<3&&<div className="s-line"/>}
                </div>
              );
            })}
          </div>

          {error&&<div className="error-box">⚠ {error}</div>}

          {/* Upload */}
          <div className="g-panel">
            <div className="g-panel-head">
              <div><div className="g-panel-title">Upload Challenge File</div><div className="g-panel-sub">ELF binary, Python script, ZIP archive — any CTF file</div></div>
            </div>
            <div className="g-panel-body">
              <div className={"dropzone "+(dragOver?"over":"")} onClick={()=>fileRef.current?.click()} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}>
                <div className="drop-icon">📂</div>
                <div className="drop-title">Drop your challenge file here</div>
                <div className="drop-sub">or <span>click to browse</span> — binaries, scripts, ZIPs</div>
                <input ref={fileRef} className="drop-input" type="file" onChange={e=>handleFile(e.target.files[0])}/>
              </div>
              {file&&(
                <div className="file-pill">
                  <span style={{color:"#ff4444"}}>⬡</span>
                  <span className="file-pill-name">{file.name}</span>
                  <span className="file-pill-size">{(file.size/1024).toFixed(1)} KB</span>
                  <button className="icon-btn" onClick={reset}>✕</button>
                </div>
              )}
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Platform</label>
                  <select className="form-select" value={platform} onChange={e=>setPlatform(e.target.value)}>
                    {PLATFORMS.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">OpenRouter API Key</label>
                  <div style={{display:"flex",gap:6}}>
                    <input className="form-input" type="password" placeholder={apiKey?"Key active ✓":"sk-or-... or manage in ⚙"} value={apiKey} onChange={e=>setApiKey(e.target.value)}/>
                    <button className="btn btn-ghost" style={{height:36,padding:"0 10px",fontSize:11}} onClick={()=>setShowDash(true)}>⚙</button>
                  </div>
                </div>
                <button className="btn btn-red" style={{marginTop:"auto"}} disabled={!file} onClick={doAnalyze}>Analyze →</button>
              </div>
            </div>
          </div>

          {/* Analysis */}
          {analysis&&(
            <div className="g-panel">
              <div className="g-panel-head">
                <div><div className="g-panel-title">Analysis Report</div><div className="g-panel-sub">{file.name}</div></div>
                <span className={"badge badge-"+(analysis.difficulty||"medium")}>{analysis.difficulty}</span>
              </div>
              <div className="g-panel-body">
                <div className="g-grid">
                  <Card label="File Type" value={analysis.fileType}/>
                  <Card label="Input Method" value={analysis.inputMethod}/>
                  <Card label="Vulnerability" value={analysis.vulnerability} accent/>
                  <Card label="Attack Surface" value={analysis.attack_surface} accent/>
                  {analysis.flag_hint&&<Card label="Flag Hint" value={analysis.flag_hint} accent/>}
                  {analysis.integer_type&&<Card label="Integer Type" value={analysis.integer_type}/>}
                  {analysis.loop_structure&&<Card label="Loop Structure" value={analysis.loop_structure}/>}
                  {analysis.overflow_target&&<Card label="Overflow Target" value={analysis.overflow_target} accent/>}
                  <div className="g-card" style={{gridColumn:"1/-1"}}>
                    <div className="g-card-label">Description</div>
                    <div className="g-card-value">{analysis.description}</div>
                  </div>
                </div>
                {analysis.strings_found?.length>0&&(
                  <><div className="form-label mb-4">Strings Found</div><div className="tags">{analysis.strings_found.map((s,i)=><span key={i} className="tag">{s}</span>)}</div></>
                )}
                {analysis.input_prompts?.length>0&&(
                  <><div className="form-label mb-4" style={{marginTop:12}}>Exact Input Prompts</div><div className="tags">{analysis.input_prompts.map((s,i)=><span key={i} className="tag tag-green">{s}</span>)}</div></>
                )}
                <div className="action-row"><button className="btn btn-red" onClick={doClues}>Generate Clues →</button></div>
              </div>
            </div>
          )}

          {/* Clues */}
          {clues&&(
            <div className="g-panel">
              <div className="g-panel-head"><div className="g-panel-title">Exploit Clues</div></div>
              <div className="g-panel-body">
                <div className="insight"><strong>Key Insight — </strong>{clues.key_insight}</div>
                <div className="g-grid">
                  <Card label="Attack Type" value={clues.attack_type?.toUpperCase()} accent/>
                  <Card label="Input Space" value={clues.input_space}/>
                  <Card label="Charset" value={clues.charset}/>
                  <Card label="Expected Flag" value={clues.expected_flag_format} accent/>
                  {clues.overflow_value&&<Card label="Overflow Value" value={clues.overflow_value} accent/>}
                  {clues.overflow_math&&<Card label="Overflow Math" value={clues.overflow_math}/>}
                </div>
                <div className="form-label mb-4">Attack Plan</div>
                <ul className="steps-list mt-16">
                  {clues.steps?.map((s,i)=>(
                    <li key={i} className="step-item">
                      <div className="step-badge">{String(i+1).padStart(2,"0")}</div><span>{s}</span>
                    </li>
                  ))}
                </ul>
                <div className="terminal">
                  <div className="t-bar"><div className="t-dot t-r"/><div className="t-dot t-y"/><div className="t-dot t-g"/><span className="t-tag">quick recon</span></div>
                  <div className="t-body">
                    <div className="t-line t-cmt"># reconnaissance</div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> file ./{file?.name}</span></div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> strings ./{file?.name} | grep -i flag</span></div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> checksec --file=./{file?.name}</span></div>
                    <div className="t-line"><span className="t-prompt">$</span><span className="t-cmd"> chmod +x exploit.py && python3 exploit.py</span></div>
                  </div>
                </div>
                <div className="divider"/>
                <div className="form-label mb-4">Generation Mode</div>
                <div className="mode-tabs">
                  <button className={"mode-tab "+(exploitMode==="bruteforce"?"active":"")} onClick={()=>setExploitMode("bruteforce")}>Bruteforce Script</button>
                  <button className={"mode-tab "+(exploitMode==="lookup"?"active":"")} onClick={()=>setExploitMode("lookup")}>Lookup Table</button>
                </div>
                <div className="action-row"><button className="btn btn-red" onClick={doExploit}>Generate Exploit →</button></div>
              </div>
            </div>
          )}

          {/* Exploit */}
          {exploit&&(
            <div className="g-panel">
              <div className="g-panel-head">
                <div className="g-panel-title">Exploit Script — exploit.py</div>
                <div style={{display:"flex",gap:6}}>
                  {exploit.arch&&<span className="badge badge-medium">{exploit.arch?.toUpperCase()}</span>}
                  {exploit.bits&&<span className="badge badge-easy">{exploit.bits}-BIT</span>}
                </div>
              </div>
              <div className="g-panel-body">
                <div className="g-grid">
                  {exploit.notes&&<Card label="Notes" value={exploit.notes}/>}
                  {exploit.usage&&<Card label="Usage" value={exploit.usage} accent/>}
                </div>
                {exploit.requirements?.length>0&&(
                  <><div className="form-label mb-4 mt-16">Requirements</div><div className="req-row">{exploit.requirements.map((r,i)=><span key={i} className="req-tag">pip install {r}</span>)}</div></>
                )}
                <div className="demo-warn">
                  <span className="demo-warn-icon">⚠</span>
                  <div><strong>Free Tier — Demonstration Code Only</strong>This script illustrates the exploit methodology and approach. Addresses, offsets, and prompts may need manual verification. Upgrade to a Pro engine for validated, production-ready scripts.</div>
                </div>
                <div className="form-label mt-16 mb-4">exploit.py</div>
                <CodeBlock code={exploit.script} copyKey="script" copied={copied} onCopy={copy}/>
                {exploitMode==="lookup"&&exploit.lookup_table&&(
                  <><div className="form-label mt-16 mb-4">Lookup Table (256-char map)</div><CodeBlock code={exploit.lookup_table} copyKey="lookup" copied={copied} onCopy={copy}/></>
                )}

                {/* Run on Replit */}
                <div className="replit-banner">
                  <div className="replit-left">
                    <div className="replit-icon">▶</div>
                    <div><div className="replit-title">Run on Replit</div><div className="replit-sub">Free cloud IDE — no install needed</div></div>
                  </div>
                  <button className="btn-replit" onClick={()=>window.open("https://replit.com/new/python3?code="+encodeURIComponent(exploit.script||""),"_blank")}>Open in Replit →</button>
                </div>

                {/* Workflow */}
                <div className="workflow-section">
                  <button className="wf-toggle" onClick={()=>setShowWorkflow(v=>!v)}>
                    <span>📋 Step-by-Step Local Execution Workflow</span><span>{showWorkflow?"▲":"▼"}</span>
                  </button>
                  {showWorkflow&&(
                    <div className="wf-body">
                      <div style={{fontSize:12,color:"#444",padding:"8px 12px",background:"rgba(255,255,255,0.02)",borderRadius:4}}>Follow this workflow on your local machine to capture the flag.</div>
                      <div className="wf-card">
                        <div className="wf-num">0</div>
                        <div className="wf-content">
                          <div className="wf-title">Optional: Set Remote Target</div>
                          <div className="wf-desc">If this is a remote challenge (HTB/THM), enter IP and port. Leave blank for local.</div>
                          <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                            <input className="form-input" style={{width:160}} placeholder="Target IP" value={remoteHost} onChange={e=>setRemoteHost(e.target.value)}/>
                            <input className="form-input" style={{width:90}} placeholder="Port" value={remotePort} onChange={e=>setRemotePort(e.target.value)}/>
                          </div>
                        </div>
                      </div>
                      {[
                        {n:1,title:"Create Working Folder",desc:"",cmd:"mkdir ctf-"+(file?.name||"").replace(/\./g,"-")+" && cd ctf-"+(file?.name||"").replace(/\./g,"-"),ck:"wf1"},
                        {n:2,title:"Place Your Files",desc:"Copy "+file?.name+" and exploit.py into the folder.",cmd:null,ck:null},
                        {n:3,title:"Install Dependencies",desc:"",cmd:"pip install pwntools",ck:"wf3"},
                      ].map(s=>(
                        <div key={s.n} className="wf-card">
                          <div className="wf-num">{s.n}</div>
                          <div className="wf-content">
                            <div className="wf-title">{s.title}</div>
                            {s.desc&&<div className="wf-desc">{s.desc}</div>}
                            {s.n===2&&<div className="wf-check"><span className="wf-check-item">📁 {file?.name}</span><span className="wf-check-item">🐍 exploit.py</span></div>}
                            {s.cmd&&<div className="wf-cmd-row"><code className="wf-cmd">{s.cmd}</code><button className="wf-copy" onClick={()=>copy(s.cmd,s.ck)}>{copied===s.ck?"✓":"Copy"}</button></div>}
                          </div>
                        </div>
                      ))}
                      {exploit.gcc_cmd&&(
                        <div className="wf-card">
                          <div className="wf-num">4</div>
                          <div className="wf-content">
                            <div className="wf-title">Compile Binary (if source provided)</div>
                            <div className="wf-cmd-row"><code className="wf-cmd">{exploit.gcc_cmd}</code><button className="wf-copy" onClick={()=>copy(exploit.gcc_cmd,"wf4")}>{copied==="wf4"?"✓":"Copy"}</button></div>
                          </div>
                        </div>
                      )}
                      <div className="wf-card">
                        <div className="wf-num">{exploit.gcc_cmd?5:4}</div>
                        <div className="wf-content">
                          <div className="wf-title">Inspect Binary</div>
                          {[["file ./"+file?.name,"wf5a"],["checksec --file=./"+file?.name,"wf5b"],["strings ./"+file?.name+" | grep -i flag","wf5c"]].map(([cmd,ck])=>(
                            <div key={ck} className="wf-cmd-row" style={{marginTop:6}}><code className="wf-cmd">{cmd}</code><button className="wf-copy" onClick={()=>copy(cmd,ck)}>{copied===ck?"✓":"Copy"}</button></div>
                          ))}
                        </div>
                      </div>
                      <div className="wf-card">
                        <div className="wf-num">{exploit.gcc_cmd?6:5}</div>
                        <div className="wf-content">
                          <div className="wf-title">{remoteHost?"Run Against Remote Target":"Run Exploit Locally"}</div>
                          {remoteHost&&<div className="wf-desc">Targeting {remoteHost}:{remotePort||"?????"}</div>}
                          <div className="wf-cmd-row"><code className="wf-cmd">{remoteHost?"python3 exploit.py REMOTE HOST="+remoteHost+" PORT="+(remotePort||"PORT"):"python3 exploit.py"}</code><button className="wf-copy" onClick={()=>copy(remoteHost?"python3 exploit.py REMOTE HOST="+remoteHost+" PORT="+(remotePort||"PORT"):"python3 exploit.py","wf6")}>{copied==="wf6"?"✓":"Copy"}</button></div>
                        </div>
                      </div>
                      <div className="wf-card wf-flag">
                        <div className="wf-num" style={{background:"rgba(34,170,34,0.1)",borderColor:"rgba(34,170,34,0.2)",color:"#22aa22"}}>🚩</div>
                        <div className="wf-content">
                          <div className="wf-title">Expected Flag</div>
                          <div className="wf-desc">Look for: <strong style={{color:"#44cc44"}}>{clues?.expected_flag_format||"CTF{...}"}</strong></div>
                          <div className="wf-desc" style={{marginTop:4}}>Vuln: <span style={{color:"#ff4444",fontWeight:600}}>{analysis?.vulnerability}</span></div>
                          {clues?.overflow_value&&<div className="wf-desc" style={{marginTop:4}}>Overflow value: <code style={{background:"rgba(34,170,34,0.08)",padding:"1px 6px",borderRadius:3,color:"#44cc44"}}>{clues.overflow_value}</code></div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="action-row">
                  <button className="btn btn-ghost" onClick={reset}>← New Challenge</button>
                  <button className="btn btn-red" onClick={download}>⬇ Download exploit.py</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {page!=="tool"&&(
        <footer className="footer">
          <div className="footer-inner">
            <div>
              <div className="footer-logo"><span>codeX</span>cracked</div>
              <div className="footer-sub">Binary analysis &amp; exploit generation for CTF competitors</div>
            </div>
            <div className="footer-links">
              <button className="footer-link" onClick={()=>setPage("home")}>Home</button>
              <button className="footer-link" onClick={()=>setPage("tool")}>Analyzer</button>
              <button className="footer-link" onClick={()=>setPage("about")}>About</button>
            </div>
            <div className="footer-right">
              <div className="footer-sub">by project Adnan</div>
              <div className="footer-legal">For authorized security research only</div>
            </div>
          </div>
        </footer>
      )}
    </div>
    </>
  );
}
