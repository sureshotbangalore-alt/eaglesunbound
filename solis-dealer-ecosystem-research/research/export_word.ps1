$ErrorActionPreference = 'Stop'
$solisOutputRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$solisDocPath = Join-Path $solisOutputRoot 'Solis_Dealer_Ecosystem_Research_Report.docx'
$solisPdfPath = Join-Path $solisOutputRoot 'Solis_Dealer_Ecosystem_Research_Report.pdf'
$solisWord = $null
$solisDocument = $null
try {
    $solisWord = New-Object -ComObject Word.Application
    $solisWord.Visible = $false
    $solisWord.DisplayAlerts = 0
    $solisWord.AutomationSecurity = 3
    $solisDocument = $solisWord.Documents.Open($solisDocPath, $false, $false)
    $solisDocument.Fields.Update() | Out-Null
    foreach ($solisToc in $solisDocument.TablesOfContents) { $solisToc.Update() }
    $solisDocument.Repaginate()
    $solisDocument.Save()
    $solisDocument.ExportAsFixedFormat($solisPdfPath, 17)
    $solisPages = $solisDocument.ComputeStatistics(2)
    Write-Output "Native Word exported $solisPages pages"
}
finally {
    if ($null -ne $solisDocument) { $solisDocument.Close(0) }
    if ($null -ne $solisWord) { $solisWord.Quit() }
}
