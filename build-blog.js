#!/usr/bin/env node
// Compatibility entry point. The shared builder now owns every page and sitemap.
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const result = spawnSync('python3', [path.join(__dirname,'scripts','build_site.py')], {stdio:'inherit', cwd:__dirname});
if (result.error) { console.error(result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
