$ErrorActionPreference = 'Stop'
Write-Host "Building Prachi AI Frontend with esbuild.exe..."

$esbuild = Join-Path $PSScriptRoot "node_modules\@esbuild\win32-x64\esbuild.exe"
if (-not (Test-Path $esbuild)) {
  $esbuild = Join-Path $PSScriptRoot "..\backend\node_modules\@esbuild\win32-x64\esbuild.exe"
}

& $esbuild src/main.tsx `
  --bundle `
  --outfile=dist/bundle.js `
  --sourcemap `
  --target=es2020 `
  '--define:process.env.NODE_ENV=\"production\"' `
  --loader:.png=dataurl `
  --loader:.svg=text

Write-Host "Copying compiled bundle to ../../prachi/..."
Copy-Item "dist/bundle.js" -Destination "..\..\prachi\bundle.js" -Force
if (Test-Path "dist/bundle.js.map") {
  Copy-Item "dist/bundle.js.map" -Destination "..\..\prachi\bundle.js.map" -Force
}
if (Test-Path "dist/bundle.css") {
  Copy-Item "dist/bundle.css" -Destination "..\..\prachi\bundle.css" -Force
}
if (Test-Path "dist/bundle.css.map") {
  Copy-Item "dist/bundle.css.map" -Destination "..\..\prachi\bundle.css.map" -Force
}
if (Test-Path "src/styles/index.css") {
  Copy-Item "src/styles/index.css" -Destination "dist\index.css" -Force
  Copy-Item "src/styles/index.css" -Destination "..\..\prachi\index.css" -Force
}
if (Test-Path "..\..\prachi\index.html") {
  Copy-Item "..\..\prachi\index.html" -Destination "dist\index.html" -Force
}

Write-Host "Prachi AI Frontend built and synced successfully!"
