'use strict';

// npm runs scripts with cmd.exe. cmd cannot use a UNC working directory, so on
// \\LIGHTX\web\luux it drops into C:\Windows before the script starts. Switch
// to a drive that already points at this repo, or pushd a temporary one.
const { execFileSync, spawn } = require('child_process');
const path = require('path');

const packageJson = process.env.npm_package_json;
if (!packageJson) {
  console.error('Run this with npm, for example: npm run dev');
  process.exit(1);
}

function quoteArg(arg) {
  if (!/[\s"&|]/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

const command = process.argv.slice(1).map(quoteArg).join(' ');
if (!command) {
  console.error('Missing command after --');
  process.exit(1);
}

function existingDrive(root) {
  let output = '';
  try {
    output = execFileSync('net', ['use'], { encoding: 'utf8' });
  } catch {
    return null;
  }
  const want = root.replace(/[/\\]+$/, '').toLowerCase();
  for (const line of output.split(/\r?\n/)) {
    const match = /^OK\s+([A-Z]):\s+(\\\\[^\s]+)/i.exec(line.trim());
    if (!match) continue;
    const remote = match[2].replace(/[/\\]+$/, '').toLowerCase();
    if (remote === want) return match[1].toUpperCase();
  }
  return null;
}

const root = path.dirname(packageJson);
const unc = process.platform === 'win32' && root.startsWith('\\\\');
const drive = unc ? existingDrive(root) : null;
let script = command;
if (drive) {
  script = `cd /d ${drive}:\\ && ${command}`;
} else if (unc) {
  script = `pushd "${root}" && ${command} & popd`;
}
const cwd = unc ? process.cwd() : root;

const shell = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'sh';
const shellArgs = process.platform === 'win32' ? ['/d', '/s', '/c', script] : ['-c', script];

const child = spawn(shell, shellArgs, {
  cwd,
  env: process.env,
  stdio: 'inherit',
  windowsVerbatimArguments: process.platform === 'win32',
});

child.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code == null ? 1 : code);
});
