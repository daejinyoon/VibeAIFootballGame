param(
  [string]$PptxPath = (Join-Path $PSScriptRoot '2026-10-27-football-dev-presentation-with-screenshots.pptx')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-ZipEntryText {
  param([System.IO.Compression.ZipArchiveEntry]$Entry)
  $stream = $Entry.Open()
  $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
  try { return $reader.ReadToEnd() }
  finally { $reader.Dispose(); $stream.Dispose() }
}

function Assert-PptxPackage {
  param([string]$PptxPath)
  $resolved = (Resolve-Path -LiteralPath $PptxPath).Path
  $archive = [System.IO.Compression.ZipFile]::OpenRead($resolved)
  try {
    $slides = @($archive.Entries | Where-Object { $_.FullName -match '^ppt/slides/slide[0-9]+\.xml$' })
    $notes = @($archive.Entries | Where-Object { $_.FullName -match '^ppt/notesSlides/notesSlide[0-9]+\.xml$' })
    if ($slides.Count -ne 8 -or $notes.Count -ne 8) {
      throw "8 slides and 8 notes required; found $($slides.Count) slides, $($notes.Count) notes"
    }

    foreach ($entry in $slides) {
      [xml]$xml = Read-ZipEntryText -Entry $entry
      $textShapes = @($xml.SelectNodes('//*[local-name()="sp"]'))
      if ($textShapes.Count -lt 5) { throw "$($entry.FullName) has too few editable shapes: $($textShapes.Count)" }
    }

    foreach ($entry in $notes) {
      [xml]$xml = Read-ZipEntryText -Entry $entry
      $texts = @($xml.SelectNodes('//*[local-name()="t"]') | ForEach-Object { $_.InnerText })
      $joined = $texts -join ' '
      if ($joined.Length -lt 30) { throw "$($entry.FullName) has an empty or too-short speaker note" }
    }

    $presentationEntry = $archive.GetEntry('ppt/presentation.xml')
    if (-not $presentationEntry) { throw 'ppt/presentation.xml missing' }
    [xml]$presentation = Read-ZipEntryText -Entry $presentationEntry
    $size = $presentation.SelectSingleNode('//*[local-name()="sldSz"]')
    if (-not $size) { throw 'Slide size missing' }
    $ratio = [double]$size.GetAttribute('cx') / [double]$size.GetAttribute('cy')
    if ([math]::Abs($ratio - (16.0 / 9.0)) -gt 0.002) { throw "Slide ratio is not 16:9: $ratio" }

    $content = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'slide-content.json') -Raw -Encoding UTF8
    $allSlideXml = ($slides | ForEach-Object { Read-ZipEntryText -Entry $_ }) -join ' '
    if (($content + $allSlideXml) -match '(?i)AZURE_STATIC_WEB_APPS_API_TOKEN|AccountKey=|client_secret') {
      throw 'Credential-like content found in source or slides'
    }
    Write-Output "PPTX 검증 통과: 8 slides / 8 speaker notes / 16:9 / editable shapes"
  }
  finally { $archive.Dispose() }
}

Assert-PptxPackage -PptxPath $PptxPath
