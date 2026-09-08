#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { importLogs, defaultDirectory, saveRecords, loadRecords, verifyGraph, verifySource, search, briefing, exportBundle, restoreBundle, privateOutput, makeRecord, readProposal } from './memory.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const [command, ...args] = process.argv.slice(2);
try {
  const directory = defaultDirectory(root);
  if (command === 'import') {
    const { snapshot, records } = importLogs(root, args[0] ?? 'HEAD');
    console.log(JSON.stringify({ snapshot, ...saveRecords(directory, records) }));
  } else if (command === 'verify') {
    const records = loadRecords(directory);
    verifyGraph(records);
    for (const record of records) verifySource(root, record);
    console.log(JSON.stringify({ verified: records.length, engine: 'lexical-baseline' }));
  } else if (command === 'search') {
    console.log(JSON.stringify(search(loadRecords(directory), args.join(' ')), null, 2));
  } else if (command === 'brief') {
    console.log(briefing(loadRecords(directory), args.join(' ')));
  } else if (command === 'export') {
    const target = privateOutput(root, args[0] ?? 'memory.json');
    writeFileSync(target, JSON.stringify(exportBundle(loadRecords(directory)), null, 2), { flag: 'wx', mode: 0o600 });
    console.log(target);
  } else if (command === 'restore') {
    const target = privateOutput(root, args[0] ?? 'memory.json');
    console.log(JSON.stringify(restoreBundle(directory, JSON.parse(readFileSync(target, 'utf8')), root)));
  } else if (command === 'record') {
    // Deliberate structured input only; never import arbitrary transcripts.
    const record = makeRecord(readProposal(root, args[0] ?? 'proposal.json'));
    verifySource(root, record);
    console.log(JSON.stringify({ id: record.id, ...saveRecords(directory, [record]) }));
  } else {
    console.log('node brain/cli.mjs import [commit] | verify | search <cue> | brief <cue> | export [filename] | restore [filename] | record [filename]');
    if (command) process.exitCode = 2;
  }
} catch (error) {
  // Do not dump source records or arbitrary exception subprocess output.
  console.error(`brain: ${error.code ?? 'validation failed'}: ${error instanceof SyntaxError ? 'Invalid JSON input' : error.message.split('\n')[0]}`);
  process.exitCode = 1;
}
