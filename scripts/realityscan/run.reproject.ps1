# Photos -> RealityScan -> low-poly GLB with a sharp texture.
#
# What changed from run.ps1:
#  * The texture is calculated on the full-detail mesh first. Only then is the mesh
#    simplified, and the texture is copied onto the simplified copy with -reprojectTexture
#    (RealityScan's documented workflow). run.ps1 textured the simplified mesh straight
#    from the photos.
#  * glb-finish.mjs (next to this script) then removes the COLOR_0 vertex colors, which
#    viewers multiply into the texture, so a simplified mesh looks mottled. It also makes
#    sure the GLB uses the color texture rather than the checkerboard layer, stands the
#    model Y-up, and embeds the texture so the result is a single file.
#
# Usage:  .\run.reproject.ps1                  (project "test03")
#         .\run.reproject.ps1 -Name test04 -Triangles 500000
#         .\run.reproject.ps1 -DryRun          (print the RealityScan command, run nothing)
param(
  [string]$Name = "test03",
  [int]$Triangles = 300000,
  # 8K textures on the full-detail mesh. It is only the source for the reprojection and is
  # not exported, so more than one just makes the copied texture sharper.
  [int]$DenseTextures = 4,
  [string]$Imgs = "C:\Users\Garage\Downloads\test-images",
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"

$RS = (Get-ChildItem "C:\Program Files\Epic Games" -Recurse -Filter "RealityScan.exe" -File -ErrorAction SilentlyContinue |
       Select-Object -First 1).FullName
if (-not $RS) { throw "RealityScan.exe not found" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "node not found; glb-finish.mjs needs Node.js" }
$Here = if ($PSScriptRoot) { $PSScriptRoot } else { "C:\Users\Garage\rs" }
$Finish = Join-Path $Here "glb-finish.mjs"
if (-not (Test-Path $Finish)) { throw "Missing $Finish" }
Write-Host "Using $RS"

$Proj  = "C:\Users\Garage\rs\$Name"
$Box   = "C:\Users\Garage\rs\wall.rsbox"
$Raw   = "$Proj\out\${Name}_raw.glb"   # RealityScan's export, with an external PNG
$Final = "$Proj\out\$Name.glb"         # the file to open

if (-not $DryRun -and (Test-Path "$Proj\out") -and (Get-ChildItem "$Proj\out" -Force | Select-Object -First 1)) {
  throw "$Proj\out already has files. Pick another -Name, or delete that folder first."
}

# Give RealityScan only the photos. -addFolder would also import any exported
# texture sitting in the folder (e.g. test_model_u0_v0_diffuse.png) as an extra "photo".
$photos = Get-ChildItem $Imgs -File | Where-Object { $_.Extension -match '^\.(heic|heif|jpe?g)$' }
if (-not $photos) { throw "No photos found in $Imgs" }
$List = "$Proj\photos.imagelist"
Write-Host "Photos: $($photos.Count)"

# Note: every fresh alignment lands in a slightly different coordinate frame, so a box
# saved from another project won't line up unless the frame is pinned (e.g. control points).
if (Test-Path $Box) {
  $region = @("-setReconstructionRegion", $Box)
  Write-Host "Using region file: $Box"
} else {
  $region = @("-setReconstructionRegionAuto")
  Write-Host "No .rsbox found - falling back to auto region"
}

# -silent and appQuitOnError make a failure exit with an error code instead of
# leaving an error dialog open in the hidden instance.
$rsArgs = @("-headless", "-silent", "$Proj\crash", "-set", "appQuitOnError=true",
            "-add", $List, "-align", "-selectMaximalComponent") + $region + @(
  "-calculateNormalModel",
  "-renameSelectedModel", "dense",
  "-set", "unwrapStyle=MaxTexturesCount",
  "-set", "unwrapMaximalTexCount=$DenseTextures",
  "-calculateTexture",
  "-simplify", "$Triangles",               # creates and selects a new, simplified model
  "-renameSelectedModel", "low",
  "-set", "unwrapMaximalTexCount=1",        # the exported model gets one 8K texture
  "-unwrap",
  "-reprojectTexture", "dense", "low",
  "-selectModel", "low",
  "-save", "$Proj\$Name.rsproj",            # saved before export, so a failed export can be inspected
  "-exportSelectedModel", $Raw,
  "-quit"
)

if ($DryRun) {
  Write-Host "`nWould run:`n`"$RS`" $($rsArgs -join ' ')"
  Write-Host "Then: node `"$Finish`" `"$Raw`" `"$Final`""
  return
}

New-Item -ItemType Directory -Force -Path "$Proj\out", "$Proj\crash" | Out-Null
$photos.FullName | Set-Content -Path $List -Encoding ascii

$sw = [Diagnostics.Stopwatch]::StartNew()
# RealityScan is a windowed app, so PowerShell only waits for it when its output is piped.
& $RS @rsArgs | Out-Null
$code = $LASTEXITCODE
$sw.Stop()
Write-Host "RealityScan exit code: $code (elapsed $($sw.Elapsed.ToString('hh\:mm\:ss')))"
if ($code -ne 0 -or -not (Test-Path $Raw)) {
  throw "RealityScan failed. Check $Proj\crash, or open $Proj\$Name.rsproj in the GUI to see how far it got."
}

& node $Finish $Raw $Final
if ($LASTEXITCODE -ne 0) { throw "glb-finish.mjs failed on $Raw" }

Get-ChildItem "$Proj\out" | Select-Object Name, @{n='MB';e={[math]::Round($_.Length/1MB,1)}} | Format-Table -AutoSize
Write-Host "Open this one: $Final"
