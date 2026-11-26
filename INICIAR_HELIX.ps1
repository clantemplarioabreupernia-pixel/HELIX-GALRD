Set-Location "C:\HELIX\HELIX-GALRD"
if (-not (Get-Process ollama -ErrorAction SilentlyContinue)) {
  Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
}
Start-Process "go" -ArgumentList "run main.go" -WindowStyle Minimized
Start-Process "powershell" -ArgumentList "-NoExit", "-Command", "npx tsx server.ts"
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"
