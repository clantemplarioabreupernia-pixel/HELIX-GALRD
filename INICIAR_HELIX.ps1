Set-Location "C:\HELIX\HELIX-GALRD"
if (-not (Get-Process ollama -ErrorAction SilentlyContinue)) {
  Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
  Start-Sleep -Seconds 2
}
Start-Process "http://localhost:3050"
npx tsx server.ts