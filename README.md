```markdown
# TreK CTF Analyzer 🚀
### AI-Powered Automated Binary Reconnaissance & Exploit Script Generation Tool

TreK CTF Analyzer is an automated binary exploitation (Pwn) assistant designed to eliminate the tedious setup time of CTF challenges. By parsing source code, binaries, or decompiled execution paths, TreK systematically maps target attack surfaces, isolates software vulnerabilities (such as arithmetic overflows, unsafe string handlers, or heap mismanagement), and outputs clean, runtime-ready `pwntools` exploit templates.

---

## 🌟 Key Features

* **Multi-Format Input Parsing:** Drops seamlessly into your pipeline whether you provide raw C source code, compiled ELF binaries, or script archives.
* **Intelligent Vulnerability Profiling:** Automatically extracts critical identifiers like function signatures (`win()`, `flag()`), unsafe functions (`gets`, `scanf`), and embedded validation parameters.
* **Mathematical Boundary Solver:** Traces execution constraints (such as integer validation rules) to calculate wrap-arounds and allocation manipulation requirements.
* **Context-Aware Payload Architecture:** Generates modular, production-grade Python exploit structures containing unified local-to-remote toggles (`args.REMOTE`), precise byte-matched prompting, and system memory alignment handlers.
* **Deterministic Precision Engine:** Built specifically to bypass fragile guessing loops by relying on architectural logic, explicit structural calculations, and string layout matching.

---

## 🛠️ Application Architecture & Execution Flow

TreK operates via an optimized sequential engine to transform a raw target challenge into a functional weaponized deployment script:


```
[ Upload Target File ]
│
▼
[ Binary Reconnaissance Stage ] ──► (Scans byte signatures, format variables, static strings)
│
▼
[ AI Cognitive Synthesis ] ───────► (Validates boundaries, calculates heap/stack layouts)
│
▼
[ Exploit Engine Output ] ────────► (Yields structural code templates & copyable terminal hints)
```

---

## 📦 Local Prerequisites

The generated output exploit scripts utilize the standard Python security framework. Ensure your attack machine is equipped with the following dependencies before execution:

```bash
pip install pwntools

```
## 🚀 Usage Guide
### 1. Compile Your Vulnerable Target (Local Testing)
To verify your exploit vectors against your local test targets without standard modern environment interference, compile your binaries with relaxed system protections:
**For 64-bit Targets:**
```bash
gcc -fno-stack-protector -no-pie vuln.c -o vuln

```
**For 32-bit Targets:**
```bash
gcc -fno-stack-protector -no-pie -m32 vuln.c -o vuln

```
### 2. Run the Automated Exploit Script
TreK templates are natively ready to transition between staging tests and production flags using standard runtime arguments:
**Local Simulation:**
```bash
python3 exploit.py

```
**Remote Server Infrastructure Target:**
```bash
python3 exploit.py REMOTE HOST=target-ctf-server.com PORT=1337

```
## 🛡️ Target Vulnerability Classification Benchmarks
TreK is constructed to actively target, deduce, and generate exploitation maps for:
 * **Stack Buffer Overflows:** Identifying unbounded inputs tracking to direct instruction pointer (EIP/RIP) highjacking.
 * **Integer Multiplications & Underflows:** Evaluating allocation loops where sign-extension or integer truncation bypasses conditional array limit bounds checks.
 * **Heap Structure Corruption:** Mapping structural object arrays to identify adjacent function-pointer overwrite opportunities.
## 🤝 Authors & Contributors
Developed with precision and passion.
 * **Project Lead:** **projectAdnan**
 * **Core Systems Architecture:** In collaboration with **MmM**
```

```


Faq: Why can't I keep this repo Starred ⭐? 
Answer: We use a nullifying mechanism which is common to every prohect developed by projectAdnan or developed in collaboration with projectAdnan. 
