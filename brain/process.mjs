import { spawn } from 'node:child_process';

// No shell, bounded input/output, and diagnostics never echo child content.
export function boundedProcess(command, args, { input = '', timeout = 120000, maxOutput = 4_000_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = [];
    let count = 0, failure;
    const stop = reason => { failure ??= new Error(reason); child.kill('SIGKILL'); };
    const timer = setTimeout(() => stop('Process deadline exceeded'), timeout);
    child.on('error', () => { clearTimeout(timer); reject(new Error('Process could not start')); });
    child.stdout.on('data', chunk => {
      count += chunk.length;
      if (count > maxOutput) stop('Process output limit exceeded');
      else if (!failure) chunks.push(chunk);
    });
    child.stderr.on('data', chunk => { count += chunk.length; if (count > maxOutput) stop('Process output limit exceeded'); });
    child.stdin.on('error', () => {});
    child.on('close', code => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`Process exited ${code}; diagnostics withheld`));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    child.stdin.end(input);
  });
}
