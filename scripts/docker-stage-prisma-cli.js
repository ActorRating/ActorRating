#!/usr/bin/env node
/**
 * Docker builder helper: copy prisma CLI + transitive deps into a staging dir.
 * Does NOT copy @prisma/client (standalone already traces that).
 *
 * Usage: node scripts/docker-stage-prisma-cli.js <destDir>
 * Example dest: /opt/prisma-cli/node_modules
 */
const fs = require("fs")
const path = require("path")

const destRoot = process.argv[2]
if (!destRoot) {
  console.error("Usage: node scripts/docker-stage-prisma-cli.js <destNodeModulesDir>")
  process.exit(1)
}

const nm = path.join(process.cwd(), "node_modules")

function pkgJsonPath(name) {
  return path.join(nm, ...name.split("/"), "package.json")
}

function readPkg(name) {
  const p = pkgJsonPath(name)
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, "utf8"))
}

function collect(root) {
  const seen = new Set()
  const queue = [root]
  while (queue.length) {
    const name = queue.shift()
    if (seen.has(name)) continue
    seen.add(name)
    const pkg = readPkg(name)
    if (!pkg) {
      throw new Error(`Missing package in node_modules: ${name}`)
    }
    for (const dep of Object.keys(pkg.dependencies || {})) {
      if (!seen.has(dep)) queue.push(dep)
    }
  }
  return [...seen].sort()
}

function copyDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.cpSync(src, dest, { recursive: true, dereference: false })
}

const packages = collect("prisma")
// Safety: never stage the app client into a CLI bundle that merges over standalone.
if (packages.includes("@prisma/client")) {
  throw new Error("Refusing to stage @prisma/client into Prisma CLI bundle")
}

fs.mkdirSync(destRoot, { recursive: true })

for (const name of packages) {
  const src = path.join(nm, ...name.split("/"))
  const dest = path.join(destRoot, ...name.split("/"))
  if (!fs.existsSync(src)) throw new Error(`Source missing: ${src}`)
  copyDir(src, dest)
  console.log(`staged ${name}@${readPkg(name).version}`)
}

const binDir = path.join(destRoot, ".bin")
fs.mkdirSync(binDir, { recursive: true })
const binPath = path.join(binDir, "prisma")
try {
  fs.unlinkSync(binPath)
} catch {
  /* ok */
}
fs.symlinkSync("../prisma/build/index.js", binPath)
console.log(`staged .bin/prisma -> ../prisma/build/index.js`)
console.log(`done: ${packages.length} packages -> ${destRoot}`)
