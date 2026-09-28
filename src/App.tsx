import { useMemo, useState } from 'react'
import {
  Bug,
  CheckCircle2,
  Clipboard,
  Download,
  History,
  Play,
  ShieldAlert,
  Sparkles,
  Terminal,
  WandSparkles,
} from 'lucide-react'

type Severity = 'Critical' | 'High' | 'Medium' | 'Low'

type Finding = {
  line: number
  title: string
  explanation: string
  severity: Severity
  suggestion: string
}

const starterCode = `function calculateTotal(items) {
  let total = 0;

  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }

  console.log("Total:", total);
  return total;
}

calculateTotal([{ price: 40 }, { price: 60 }]);`

const fixedStarter = `function calculateTotal(items) {
  let total = 0;

  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }

  console.log("Total:", total);
  return total;
}

calculateTotal([{ price: 40 }, { price: 60 }]);`

const severityRank: Record<Severity, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
}

function analyzeCode(code: string): { findings: Finding[]; fixed: string } {
  const findings: Finding[] = []
  const lines = code.split('\n')
  let fixed = code

  lines.forEach((line, index) => {
    if (/i\s*<=\s*\w+\.length/.test(line)) {
      findings.push({
        line: index + 1,
        title: 'Possible out-of-bounds loop',
        explanation:
          'The loop allows i to equal array.length. The last valid array index is length - 1, so this can access undefined.',
        severity: 'High',
        suggestion: 'Use i < items.length instead of i <= items.length.',
      })
      fixed = fixed.replace(/i\s*<=\s*(\w+)\.length/, 'i < $1.length')
    }

    if (/console\.log\(/.test(line)) {
      findings.push({
        line: index + 1,
        title: 'Debug logging left in code',
        explanation:
          'Console logging is useful while debugging but can create noise in production applications.',
        severity: 'Low',
        suggestion: 'Remove it in production or route logs through a controlled logger.',
      })
    }

    if (/==(?!=)/.test(line)) {
      findings.push({
        line: index + 1,
        title: 'Loose equality detected',
        explanation:
          'Loose equality can trigger implicit type coercion and produce surprising comparisons.',
        severity: 'Medium',
        suggestion: 'Prefer strict equality (===) unless coercion is intentional.',
      })
      fixed = fixed.replace(/==(?!=)/g, '===')
    }

    if (/eval\s*\(/.test(line)) {
      findings.push({
        line: index + 1,
        title: 'Dynamic code execution',
        explanation:
          'eval() executes arbitrary strings as code and can create serious security risks when input is not fully trusted.',
        severity: 'Critical',
        suggestion: 'Replace eval() with explicit parsing or a safe mapping of allowed operations.',
      })
    }

    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
      findings.push({
        line: index + 1,
        title: 'Empty catch block',
        explanation:
          'Silently swallowing errors makes failures difficult to diagnose and may hide broken application state.',
        severity: 'Medium',
        suggestion: 'Handle, log, or rethrow the error with useful context.',
      })
    }
  })

  return { findings, fixed }
}

function App() {
  const [code, setCode] = useState(starterCode)
  const [language, setLanguage] = useState('JavaScript')
  const [findings, setFindings] = useState<Finding[]>([])
  const [fixedCode, setFixedCode] = useState(fixedStarter)
  const [hasRun, setHasRun] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const score = useMemo(() => {
    if (!hasRun) return 100
    const penalty = findings.reduce(
      (sum, finding) => sum + severityRank[finding.severity] * 7,
      0,
    )
    return Math.max(20, 100 - penalty)
  }, [findings, hasRun])

  const scan = () => {
    const result = analyzeCode(code)
    setFindings(result.findings)
    setFixedCode(result.fixed)
    setHasRun(true)
    setHistory((current) => [
      `${new Date().toLocaleTimeString()} · ${result.findings.length} issue${result.findings.length === 1 ? '' : 's'} found`,
      ...current,
    ].slice(0, 5))
  }

  const copyFixed = async () => {
    await navigator.clipboard.writeText(fixedCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1300)
  }

  const downloadFixed = () => {
    const extension = language === 'TypeScript' ? 'ts' : language === 'Python' ? 'py' : 'js'
    const blob = new Blob([fixedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `buglens-fixed.${extension}`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Bug size={21} /></div>
          <div>
            <strong>AFX BugLens</strong>
            <span>AI debugging workspace</span>
          </div>
        </div>
        <div className="status-pill"><span /> Engine online</div>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow"><Sparkles size={15} /> HACKATHON BUILD</div>
          <h1>See the bug.<br /><span>Understand the fix.</span></h1>
          <p>
            Analyze code, understand likely failures, and compare a cleaner version
            in one focused developer workspace.
          </p>
        </div>
        <div className="score-card">
          <span>Code quality</span>
          <strong>{score}</strong>
          <small>/100</small>
          <div className="score-bar"><i style={{ width: `${score}%` }} /></div>
        </div>
      </section>

      <section className="workspace">
        <div className="panel editor-panel">
          <div className="panel-head">
            <div><Terminal size={17} /> Code input</div>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option>JavaScript</option>
              <option>TypeScript</option>
              <option>Python</option>
            </select>
          </div>
          <textarea
            aria-label="Code editor"
            spellCheck={false}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <div className="editor-footer">
            <span>{code.split('\n').length} lines</span>
            <button className="primary-button" onClick={scan}>
              <Play size={16} fill="currentColor" /> Analyze code
            </button>
          </div>
        </div>

        <div className="panel analysis-panel">
          <div className="panel-head">
            <div><WandSparkles size={17} /> BugLens analysis</div>
            {hasRun && <span className="issue-count">{findings.length} issues</span>}
          </div>

          {!hasRun ? (
            <div className="empty-state">
              <div className="scan-orbit"><Bug size={27} /></div>
              <h3>Ready to scan</h3>
              <p>Run an analysis to inspect likely bugs, risky patterns, and code-quality issues.</p>
            </div>
          ) : findings.length === 0 ? (
            <div className="empty-state success">
              <CheckCircle2 size={38} />
              <h3>No demo rules triggered</h3>
              <p>The local scanner did not find any of its known patterns.</p>
            </div>
          ) : (
            <div className="findings">
              {findings.map((finding, index) => (
                <article className="finding" key={`${finding.line}-${finding.title}-${index}`}>
                  <div className="finding-top">
                    <span className={`severity severity-${finding.severity.toLowerCase()}`}>
                      {finding.severity}
                    </span>
                    <span>Line {finding.line}</span>
                  </div>
                  <h3>{finding.title}</h3>
                  <p>{finding.explanation}</p>
                  <div className="suggestion">
                    <ShieldAlert size={15} />
                    <span>{finding.suggestion}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="lower-grid">
        <div className="panel fix-panel">
          <div className="panel-head">
            <div><CheckCircle2 size={17} /> Suggested fix</div>
            <div className="actions">
              <button onClick={copyFixed}><Clipboard size={15} /> {copied ? 'Copied' : 'Copy'}</button>
              <button onClick={downloadFixed}><Download size={15} /> Download</button>
            </div>
          </div>
          <div className="compare-grid">
            <div>
              <span className="compare-label">Original</span>
              <pre>{code}</pre>
            </div>
            <div>
              <span className="compare-label fixed-label">Suggested</span>
              <pre>{hasRun ? fixedCode : fixedStarter}</pre>
            </div>
          </div>
        </div>

        <aside className="panel history-panel">
          <div className="panel-head"><div><History size={17} /> Session history</div></div>
          {history.length === 0 ? (
            <p className="muted">Your latest scans will appear here.</p>
          ) : (
            <ul>{history.map((item) => <li key={item}>{item}</li>)}</ul>
          )}
        </aside>
      </section>

      <footer>
        <span>AFX BugLens AI</span>
        <span>React + TypeScript hackathon build</span>
      </footer>
    </main>
  )
}

export default App
