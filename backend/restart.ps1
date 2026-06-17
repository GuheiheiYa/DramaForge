# 重启 DramaForge 后端（端口见 .env 中 API_PORT，默认 7790）
$ErrorActionPreference = "SilentlyContinue"
Set-Location $PSScriptRoot

# 读取默认端口
$port = 7790
if (Test-Path ".env") {
  $match = Select-String -Path ".env" -Pattern '^\s*API_PORT\s*=\s*(\d+)\s*$' | Select-Object -First 1
  if ($match) { $port = [int]$match.Matches[0].Groups[1].Value }
}

Write-Host "正在清理端口 ${port} 上的 uvicorn 进程..."

Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -in @('python.exe', 'uvicorn.exe') -and
    $_.CommandLine -and (
      ($_.CommandLine -match 'uvicorn|run\.py') -and
      ($_.CommandLine -match "port\s+${port}|--port\s+${port}|:${port}|app\.main")
    )
  } |
  ForEach-Object {
    Write-Host "  结束 PID $($_.ProcessId)"
    cmd /c "taskkill /F /T /PID $($_.ProcessId)" | Out-Null
  }

Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
  Where-Object { $_.CommandLine -match 'multiprocessing\.spawn' } |
  ForEach-Object {
    Write-Host "  结束 spawn 子进程 PID $($_.ProcessId)"
    cmd /c "taskkill /F /T /PID $($_.ProcessId)" | Out-Null
  }

# 清理仍占用端口的进程（含父进程已退出的僵尸 worker）
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    Write-Host "  结束占用端口 ${port} 的 PID $_"
    cmd /c "taskkill /F /T /PID $_" | Out-Null
  }

Start-Sleep -Seconds 1

Write-Host "启动后端: http://127.0.0.1:${port}  (python run.py)"
python run.py
