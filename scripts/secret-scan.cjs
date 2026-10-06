const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root }).toString().split('\0').filter(Boolean);
const findings = [];
const signatures = [
 /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
 /\bAIza[0-9A-Za-z_-]{35}\b/,
 /\bgh[pousr]_[0-9A-Za-z]{30,}\b/,
 /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/,
 /^\s*(?:DB_PASSWORD|GEMINI_API_KEY|APP_KEY)[ \t]*=[ \t]*["']?[^\s"']+/m,
 /\bbase64:[A-Za-z0-9+/]{40,}={0,2}/,
];
for (const file of new Set(files)) {
 if (!fs.existsSync(path.join(root,file))) continue;
 const bytes = fs.readFileSync(path.join(root,file));
 if (bytes.includes(0)) continue;
 const text = bytes.toString('utf8');
 if (signatures.some(pattern => pattern.test(text))) findings.push(file);
}
if (findings.length) { console.error('Potential secrets found in: ' + findings.join(', ')); process.exit(1); }
console.log(`Secret scan passed: ${new Set(files).size} Git candidate files; no matched credential signatures. Manual review remains required.`);
