# CI Sanity Job (example)

`yaml
name: Sanity
on:
  pull_request:
  push:
    branches: [main]
jobs:
  sanity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install deps
        run: pip install -e .
      - name: Run sanity workflow
        run: pwsh ./scripts/run_sanity.ps1
`

