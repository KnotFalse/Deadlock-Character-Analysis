import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schemaPath = new URL('../../schema/graph.schema.json', import.meta.url);
const jsonPath = new URL('../static/graph.json', import.meta.url);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const [schemaRaw, jsonRaw] = await Promise.all([
  readFile(schemaPath, 'utf8'),
  readFile(jsonPath, 'utf8')
]);

const schema = JSON.parse(schemaRaw);
const data = JSON.parse(jsonRaw);

const validate = ajv.compile(schema);
const ok = validate(data);
if (!ok) {
  console.error('graph.json failed schema validation');
  for (const err of validate.errors ?? []) {
    console.error(`- ${err.instancePath} ${err.message}`);
  }
  process.exit(1);
}

// Duplicate checks (ids & pairs). Use STRICT=1 to fail on any duplicates.
function checkDuplicates(graph) {
  const dup = { nodeIds: [], edgeIds: [], edgePairs: [] };
  const seenNodes = new Set();
  for (const n of graph.nodes || []) {
    if (seenNodes.has(n.id)) dup.nodeIds.push(n.id);
    else seenNodes.add(n.id);
  }
  const seenEdges = new Set();
  const seenDirected = new Set();
  for (const e of graph.edges || []) {
    if (seenEdges.has(e.id)) dup.edgeIds.push(e.id); else seenEdges.add(e.id);
    const dk = `${e.type}|${e.source}|${e.target}`;
    if (seenDirected.has(dk)) dup.edgeIds.push(`byDirected:${dk}`); else seenDirected.add(dk);
  }
  // Only treat some types as undirected from a data-quality perspective
  const UNDIRECTED_TYPES = new Set([ 'EVEN_AGAINST' ]);
  const seenPairs = new Set();
  for (const e of graph.edges || []) {
    if (!UNDIRECTED_TYPES.has(e.type)) continue;
    const a = e.source, b = e.target;
    const k = a < b ? `${e.type}|${a}|${b}` : `${e.type}|${b}|${a}`;
    if (seenPairs.has(k)) dup.edgePairs.push(k); else seenPairs.add(k);
  }
  return dup;
}

const dup = checkDuplicates(data);
const nodes = data?.meta?.node_count ?? data?.nodes?.length ?? 'unknown';
const edges = data?.meta?.edge_count ?? data?.edges?.length ?? 'unknown';
const sid = schema?.$id ?? 'unknown-id';
const sver = schema?.version ?? 'n/a';

const dupSummary = [
  `dupNodeIds=${dup.nodeIds.length}`,
  `dupEdgeIds=${dup.edgeIds.length}`,
  `dupEdgePairs=${dup.edgePairs.length}`
].join(' ');

console.log(`graph.json valid \u2713 (nodes=${nodes}, edges=${edges}) • ${dupSummary} • schema: ${sid} v${sver}`);

if (process.env.STRICT === '1') {
  if (dup.nodeIds.length || dup.edgeIds.length || dup.edgePairs.length) {
    const max = 10;
    if (dup.nodeIds.length) console.error('Duplicate node IDs (sample):', dup.nodeIds.slice(0,max));
    if (dup.edgeIds.length) console.error('Duplicate edge IDs (sample):', dup.edgeIds.slice(0,max));
    if (dup.edgePairs.length) console.error('Duplicate edge pairs (sample):', dup.edgePairs.slice(0,max));
    process.exit(2);
  }
}
