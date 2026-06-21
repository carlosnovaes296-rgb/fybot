try {
    $url = "https://raw.githubusercontent.com/carlosnovaes296-rgb/fybot/main/server.ts"
    $response = Invoke-RestMethod -Uri $url
    Set-Content -Path ".\server.ts" -Value $response
    Write-Host "SUCCESS"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
