# Deadlock Static Graph Explorer

## Development

`ash
npm install
npm run dev
`

Ensure graph.json exists in public/. Generate it from the data set via:

`ash
python -m deadlock_graph.cli export-static
`

## Building

`ash
npm run build
`

Outputs dist/ for GitHub Pages deployment.

