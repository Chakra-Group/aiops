#!/usr/bin/env node
/** Per-product backlog report (MD-000 7221123071): every product has a named
 *  owner and >=1 strategic backlog item. Read-only, deterministic, truthful. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.resolve(HERE, '../../data/productBacklog.json')
const doc = JSON.parse(fs.readFileSync(DATA, 'utf8'))
const byProduct = {}
for (const item of doc.backlog) {
  byProduct[item.product] = byProduct[item.product] || { owner: item.owner, count: 0, items: [] }
  byProduct[item.product].count++
  byProduct[item.product].items.push(item.id)
}
const products = Object.keys(byProduct).sort()
let gaps = 0
for (const p of products) {
  const v = byProduct[p]
  const ok = Boolean(v.owner) && v.count > 0
  if (!ok) gaps++
  console.log(`${ok ? 'OK' : 'GAP'} ${p} owner=${v.owner} items=${v.count} [${v.items.join(',')}]`)
}
console.log(`BACKLOG_REPORT products=${products.length} total_items=${doc.backlog.length} gaps=${gaps}`)
if (gaps > 0) process.exit(1)
