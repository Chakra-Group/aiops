#!/usr/bin/env node
/**
 * Chakra Groups — Real Browser Automation Persona UI Reviewer (Microsoft Edge CDP)
 * Launches headless Microsoft Edge, opens UAT (:30082) or DEV (:30081) UI routes
 * (strictly blocks PROD :30083), inspects rendered DOM, console errors, interactive controls,
 * and dummy/error text, then writes honest persona findings to tools/reports/persona-ui-review.json.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE = process.env.CHAKRA_PORTAL_URL || 'http://localhost:30082'
if (/30083|\bprod\b/i.test(BASE)) {
  console.error(`BLOCKED ❌ Browser persona review must target UAT (:30082) or DEV (:30081), never PROD (${BASE}).`)
  process.exit(1)
}

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
function loadCustomerPersonas(repoSlug) {
  const repoDir = repoSlug === 'suite-hub' ? 'chakra-agents' : repoSlug
  const fbPath = path.join(process.cwd(), repoDir, 'uat', 'feedback.json')
  if (!fs.existsSync(fbPath)) return 'End-Customer Persona'
  try {
    const fb = JSON.parse(fs.readFileSync(fbPath, 'utf8').replace(/^\uFEFF/, ''))
    const names = (fb.personas || []).map(p => p.name).filter(Boolean)
    return names.length ? names.join(', ') : 'End-Customer Persona'
  } catch {
    return 'End-Customer Persona'
  }
}

const ROUTES = [
  { slug: 'suite-hub', path: '/' },
  { slug: 'chakra-core', path: '/apps/chakra-core' },
  { slug: 'iniolu', path: '/apps/iniolu' },
  { slug: 'kaala', path: '/apps/kaala' },
  { slug: 'chitra', path: '/apps/chitra' },
  { slug: 'sthala', path: '/apps/sthala' },
  { slug: 'planmytravel', path: '/apps/planmytravel' },
  { slug: 'chakra-ai', path: '/apps/chakra-ai' },
  { slug: 'artha', path: '/apps/artha' },
  { slug: 'dharma', path: '/apps/dharma' },
  { slug: 'grihakart', path: '/apps/grihakart' },
  { slug: 'prachara', path: '/apps/prachara' },
  { slug: 'chakra-agents', path: '/apps/chakra-agents' }
].map(r => ({ ...r, persona: loadCustomerPersonas(r.slug) }))

async function waitForCdp(port) {
  for (let i = 0; i < 30; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json())
      const page = list.find(t => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {}
    await new Promise(r => setTimeout(r, 250))
  }
  throw new Error('Timed out waiting for Edge CDP')
}

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chakra-edge-'))
  const debugPort = 9229
  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { stdio: 'ignore' })

  try {
    const wsUrl = await waitForCdp(debugPort)
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

    let msgId = 1
    const pending = new Map()
    const exceptions = []
    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data)
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params?.exceptionDetails?.text || 'Runtime exception')
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id)
        pending.delete(msg.id)
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
      }
    }
    const cdp = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })

    await cdp('Page.enable')
    await cdp('Runtime.enable')

    const findings = []
    for (const r of ROUTES) {
      exceptions.length = 0
      await cdp('Page.navigate', { url: `${BASE}${r.path}` })
      await new Promise(res => setTimeout(res, 700))
      const evalRes = await cdp('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const text = (document.body?.innerText || '').trim();
          const title = document.title || '';
          const h1Count = document.querySelectorAll('h1').length;
          const hasNavOrHeader = document.querySelectorAll('header, nav').length > 0;
          const allBtns = Array.from(document.querySelectorAll('button, a.btn, input[type=submit]'));
          const buttons = allBtns.length;
          const unlabeledBtns = allBtns.filter(b => !(b.innerText || b.value || b.getAttribute('aria-label') || b.getAttribute('title') || '').trim()).length;
          const brokenImgs = Array.from(document.querySelectorAll('img')).filter(i => i.complete && i.naturalWidth === 0).length;
          const distortedImgs = Array.from(document.querySelectorAll('img')).filter(i => {
            if (!i.complete || !i.naturalWidth || !i.naturalHeight || !i.clientWidth || !i.clientHeight) return false;
            const natRatio = i.naturalWidth / i.naturalHeight;
            const renRatio = i.clientWidth / i.clientHeight;
            return Math.max(natRatio / renRatio, renRatio / natRatio) > 1.85;
          }).length;
          const hasSemanticDefect = /Kaala Astronomical Engine|Sacred Venue/i.test(text);
          const hasUndef = /\\bundefined\\b|\\bNaN\\b|\\[object Object\\]/i.test(text);
          const horizontalOverflowPx = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
          const bodyFontPx = parseFloat(getComputedStyle(document.body).fontSize || '14');
          const hasBilingualUi = /ಕನ್ನಡ|data-kn|lang-btn/i.test(document.documentElement.outerHTML);

          // Fire real interactive browser events (language toggle + tab clicks)
          let eventsFired = 0;
          const knBtn = document.querySelector('.lang-btn-kn, button[data-lang="kn"]');
          const enBtn = document.querySelector('.lang-btn-en, button[data-lang="en"]');
          if (knBtn && enBtn) {
            knBtn.click();
            eventsFired++;
            enBtn.click();
            eventsFired++;
          }
          const tabs = Array.from(document.querySelectorAll('.tab-btn, [role="tab"]')).slice(0, 4);
          for (const t of tabs) { t.click(); eventsFired++; }
          if (tabs[0]) tabs[0].click();

          const postEventUndef = /\\bundefined\\b|\\bNaN\\b|\\[object Object\\]/i.test((document.body?.innerText || '').trim());
          return { title, textLen: text.length, h1Count, hasNavOrHeader, buttons, unlabeledBtns, brokenImgs, distortedImgs, hasSemanticDefect, hasUndef: hasUndef || postEventUndef, horizontalOverflowPx, bodyFontPx, hasBilingualUi, eventsFired };
        })()`
      })
      const v = evalRes.result?.value || {}
      const customerIssues = []
      if (exceptions.length > 0) customerIssues.push(`JS runtime exceptions: ${exceptions.join('; ')}`)
      if (v.textLen < 100) customerIssues.push(`Sparse/empty rendered content (${v.textLen} chars)`)
      if (v.brokenImgs > 0) customerIssues.push(`${v.brokenImgs} broken image(s)`)
      if (v.hasUndef) customerIssues.push('Rendered UI contains undefined/NaN/[object Object]')
      if (v.buttons === 0) customerIssues.push('No interactive buttons found in rendered DOM')

      const uxIssues = []
      if (v.h1Count === 0) uxIssues.push('UX: Missing <h1> landmark heading')
      if (!v.hasNavOrHeader) uxIssues.push('UX: Missing <header>/<nav> navigation landmark')
      if (v.unlabeledBtns > 0) uxIssues.push(`UX: ${v.unlabeledBtns} unlabeled button(s) without text/aria-label`)
      if (v.horizontalOverflowPx > 20) uxIssues.push(`UX: Horizontal overflow (${v.horizontalOverflowPx}px)`)
      if (v.bodyFontPx < 12) uxIssues.push(`UX: Body font too small (${v.bodyFontPx}px < 12px)`)

      const issues = [...customerIssues, ...uxIssues]
      const ok = issues.length === 0
      findings.push({
        ...r,
        ...v,
        ok,
        issues,
        customer_perspective: { personas: r.persona, passed: customerIssues.length === 0, issues: customerIssues },
        ui_ux_specialist_perspective: { reviewer: 'Shilpi (EMP-DES-102, Head of UI/UX)', passed: uxIssues.length === 0, issues: uxIssues }
      })
      console.log(`${ok ? 'PASS ✅' : 'FINDING ⚠️'} [${r.slug}] Customer(${customerIssues.length === 0 ? '✔' : '✘'}: ${r.persona}) | UI/UX(${uxIssues.length === 0 ? '✔' : '✘'}) | events=${v.eventsFired}${ok ? '' : ' -> ' + issues.join(' | ')}`)
    }

    ws.close()
    fs.mkdirSync(path.join(process.cwd(), 'tools', 'reports'), { recursive: true })
    fs.writeFileSync(
      path.join(process.cwd(), 'tools', 'reports', 'persona-ui-review.json'),
      JSON.stringify({ base_url: BASE, reviewed_at: new Date().toISOString(), routes_checked: findings.length, findings }, null, 2)
    )
    const cleanCount = findings.filter(f => f.ok).length
    console.log(`\nReal Browser Persona UI Review (${BASE}): ${cleanCount}/${findings.length} routes clean without UI findings.`)
  } finally {
    edge.kill()
    try { fs.rmSync(userDataDir, { recursive: true, force: true }) } catch {}
  }
}

run().catch(err => { console.error(err); process.exit(1) })
