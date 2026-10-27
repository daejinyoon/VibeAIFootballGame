param(
  [string]$PptxPath = (Join-Path $PSScriptRoot '2026-10-27-football-dev-presentation-with-screenshots.pptx'),
  [string]$OutputDir = (Join-Path $env:TEMP ('football-dev-presentation-preview-' + [System.DateTime]::UtcNow.ToString('yyyyMMddHHmmss')))
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Export-SlidePreviews {
  param([string]$PptxPath, [string]$OutputDir)
  $resolved = (Resolve-Path -LiteralPath $PptxPath).Path
  $target = [System.IO.Path]::GetFullPath($OutputDir)
  [System.IO.Directory]::CreateDirectory($target) | Out-Null

  $app = $null
  $presentation = $null
  try {
    $app = New-Object -ComObject PowerPoint.Application
    $presentation = $app.Presentations.Open($resolved, -1, 0, 0)
    if ($presentation.Slides.Count -ne 8) {
      throw "Expected 8 slides, found $($presentation.Slides.Count)"
    }
    $presentation.Export($target, 'PNG', 1600, 900)
  }
  finally {
    if ($presentation) {
      $presentation.Close()
      [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
    }
    if ($app) {
      $app.Quit()
      [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app)
    }
  }

  $files = @(Get-ChildItem -LiteralPath $target -File | Where-Object { $_.Extension -ieq '.png' })
  if ($files.Count -ne 8) { throw "Expected 8 PNG previews, found $($files.Count): $target" }
  foreach ($file in $files) {
    $image = [System.Drawing.Image]::FromFile($file.FullName)
    try {
      if ($image.Width -ne 1600 -or $image.Height -ne 900) {
        throw "$($file.Name) is $($image.Width)x$($image.Height), expected 1600x900"
      }
    }
    finally { $image.Dispose() }
  }
  Write-Output "PREVIEW_DIR=$target"
  Write-Output '8 PNG previews exported at 1600x900'
}

Export-SlidePreviews -PptxPath $PptxPath -OutputDir $OutputDir
