import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const schemaPath = new URL('../../schema/graph.schema.json', import.meta.url);
const jsonPath = new URL('../static/graph.json', import.meta.url);

const ajv = new Ajv({ allErrors: true, strict: false });
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
} else {
  const nodes = data?.meta?.node_count ?? data?.nodes?.length ?? 'unknown';
  const edges = data?.meta?.edge_count ?? data?.edges?.length ?? 'unknown';
  const sid = schema?.$id ?? 'unknown-id';
  const sver = schema?.version ?? 'n/a';
  console.log(`graph.json valid \u2713 (nodes=${nodes}, edges=${edges}) • schema: ${sid} v${sver}`);
}
