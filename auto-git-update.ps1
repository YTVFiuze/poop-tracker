while ($true) {
    # Get current timestamp
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    # Add all changes
    git add .
    
    # Create commit with timestamp
    git commit -m "Auto-update: $timestamp"
    
    # Push changes
    git push
    
    # Wait for 5 minutes
    Write-Host "Changes committed and pushed at $timestamp. Waiting 5 minutes..."
    Start-Sleep -Seconds 300
}
