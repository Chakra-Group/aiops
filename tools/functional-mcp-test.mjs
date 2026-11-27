#!/usr/bin/env node
/**
 * Functional MCP test — exercises a REAL MCP server over stdio JSON-RPC:
 *   initialize -> tools/list -> tools/call (live read + operator-gated read).
 * The existing simulate-functional-test.mjs only checks portal REST routes;
 * this closes that validation hole. Never targets PROD for mutations.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SERVER = path.join(ROOT, 'chakra-agents', 'bin', 'chakra-agents-mcp.mjs')
const BASE = process.env.CHAKRA_AGENTS_HTTP || 'http://127.0.0.1:8095'

const child = spawn(process.execPath, [SERVER], {
  cwd: ROOT,
  env: { ...process.env, CHAKRA_AGENTS_HTTP: BASE },
  stdio: ['pipe', 'pipe', 'pipe']
})

let buf = ''
const pending = new Map()
child.stdout.on('data', chunk => {
  buf += chunk.toString()
  let idx
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 1)
    if (!line) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
    } catch { /* ignore non-JSON noise */ }
  }
})
let stderr = ''
child.stderr.on('data', c => { stderr += c.toString() })

let id = 0
function rpc(method, params = {}) {
  const reqId = ++id
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(reqId); reject(new Error(`timeout: ${method}`)) }, 25000)
    pending.set(reqId, msg => { clearTimeout(timer); resolve(msg) })
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: reqId, method, params }) + '\n')
  })
}

const checks = []
function check(name, ok, detail) { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`) }

try {
  const init = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {} })
  check('MCP initialize', !!init.result?.serverInfo, init.result?.serverInfo?.name || JSON.stringify(init.error || ''))

  const listed = await rpc('tools/list', {})
  const tools = listed.result?.tools || []
  check('MCP tools/list real tools', tools.length > 0, `${tools.length} tools`)
  check('MCP live route tools present', tools.some(t => t.name === 'agents_agile_board') && tools.some(t => t.name === 'agents_backlog_status'), '')

  const call = await rpc('tools/call', { name: 'agents_backlog_status', arguments: {} })
  const text = call.result?.content?.[0]?.text || ''
  let parsed = null; try { parsed = JSON.parse(text) } catch {}
  check('MCP tools/call live data', !call.result?.isError && parsed && typeof parsed.open_backlog_count === 'number', `open_backlog_count=${parsed?.open_backlog_count}`)

  const denied = await rpc('tools/call', { name: 'agents_agile_board', arguments: { operator_id: 'NOT_AN_OPERATOR' } })
  check('MCP scope gate honest on read', denied.result?.content?.[0]?.text !== undefined, 'tool responded')

  const failed = checks.filter(c => !c.ok)
  console.log(`MCP Functional Summary: ${checks.length - failed.length}/${checks.length} passed.`)
  if (failed.length) process.exitCode = 1
} catch (err) {
  console.error(`FAIL MCP harness: ${err.message}\n${stderr.slice(-800)}`)
  process.exitCode = 1
} finally {
  child.kill()
}
