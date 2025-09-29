#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const i = process.argv.indexOf('--comment-path');
if (i === -1) { console.error('missing --comment-path'); process.exit(2); }
const commentPath = process.argv[i+1];
const raw = fs.readFileSync(commentPath, 'utf8');

const BLOCK_RE = /```LLM-(REPLACE|APPEND|DELETE)\s+path=([^\n\r\s]+)[\r\n]([\s\S]*?)```/g;
let m, ops = [];
while ((m = BLOCK_RE.exec(raw))) ops.push({ kind: m[1], filepath: m[2], body: m[3] ?? '' });
if (!ops.length) { console.log('No LLM blocks found.'); process.exit(0); }

function ensureDir(fp){ fs.mkdirSync(path.dirname(fp), { recursive: true }); }
function toLF(s){ return s.replace(/\r\n/g, '\n').replace(/\r/g,'\n'); }
function finalNL(s){ return s.endsWith('\n') ? s : s + '\n'; }

for (const op of ops) {
  const fp = path.resolve(op.filepath);
  if (op.kind === 'DELETE') {
    if (fs.existsSync(fp)) fs.rmSync(fp, { force: true });
    console.log('DELETE', op.filepath);
    continue;
  }
  const content = finalNL(toLF(op.body));
  ensureDir(fp);
  if (op.kind === 'REPLACE') {
    fs.writeFileSync(fp, content, 'utf8');
    console.log('REPLACE', op.filepath, content.length, 'bytes');
  } else if (op.kind === 'APPEND') {
    fs.appendFileSync(fp, content, 'utf8');
    console.log('APPEND', op.filepath, content.length, 'bytes');
  }
}
