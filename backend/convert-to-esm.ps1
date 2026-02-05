Write-Host "Fixing ONLY MediFlow backend code (excluding node_modules)" -ForegroundColor Green
Write-Host ""

# Define paths to fix (exclude node_modules)
$pathsToFix = @(
    ".\controllers",
    ".\models",
    ".\routes",
    ".\services",
    ".\utils",
    ".\middleware",
    ".\config",
    ".\cron"
)

$totalFiles = 0
$convertedFiles = 0

foreach ($path in $pathsToFix) {
    if (Test-Path $path) {
        Write-Host "Processing folder: $path" -ForegroundColor Cyan
        
        Get-ChildItem -Path $path -Filter *.js -Recurse | ForEach-Object {
            $content = Get-Content $_.FullName -Raw
            $originalContent = $content
            
            # Convert mongoose
            $content = $content -replace "const mongoose = require\('mongoose'\);?", "import mongoose from 'mongoose';"
            
            # Convert local imports with .js extension
            $content = $content -replace "const (\w+) = require\('(\.\.?/[^']+)'\);?", 'import $1 from ''$2.js'';'
            
            # Convert named imports from local files
            $content = $content -replace "const \{([^}]+)\} = require\('(\.\.?/[^']+)'\);?", 'import {$1} from ''$2.js'';'
            
            # Convert npm package imports (no .js)
            $content = $content -replace "const (\w+) = require\('([^'./][^']+)'\);?", 'import $1 from ''$2'';'
            $content = $content -replace "const \{([^}]+)\} = require\('([^'./][^']+)'\);?", 'import {$1} from ''$2'';'
            
            # Convert module.exports
            $content = $content -replace "module\.exports = (\w+);?", 'export default $1;'
            
            if ($content -ne $originalContent) {
                Set-Content -Path $_.FullName -Value $content -NoNewline
                Write-Host "  ✅ $($_.Name)" -ForegroundColor Green
                $convertedFiles++
            }
            
            $totalFiles++
        }
    }
}

Write-Host ""
Write-Host "Done! Scanned: $totalFiles | Converted: $convertedFiles" -ForegroundColor Yellow
