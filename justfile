set shell := ["powershell.exe", "-NoProfile", "/c"]

test:
  bun "./src/main.ts" "./inputs/" "./output/" 

bundle:
  bun build ./src/main.ts --outdir ./output --target node --minify
