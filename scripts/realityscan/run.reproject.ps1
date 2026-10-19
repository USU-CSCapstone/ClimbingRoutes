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
#  * Then, for ADR 0005, the texture is swapped for a JPEG (glb-texture.mjs) and level.mjs
#    levels the model from the camera poses, which a second RealityScan run exports as XMP.
#
# Usage:  .\run.reproject.ps1                  (project "test03")
#         .\run.reproject.ps1 -Name test04 -Triangles 500000 -Quality 80
#         .\run.reproject.ps1 -DryRun          (print the commands, run nothing)
param(
  [string]$Name = "test03",
  [int]$Triangles = 300000,
  # 8K textures on the full-detail mesh. It is only the source for the reprojection and is
  # not exported, so more than one just makes the copied texture sharper.
  [int]$DenseTextures = 4,
  [string]$Imgs = "C:\Users\Garage\Downloads\test-images",
  [ValidateRange(1, 100)][int]$Quality = 85,
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"

$RS = (Get-ChildItem "C:\Program Files\Epic Games" -Recurse -Filter "RealityScan.exe" -File -ErrorAction SilentlyContinue |
       Select-Object -First 1).FullName
if (-not $RS) { throw "RealityScan.exe not found" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "node not found; the glb scripts need Node.js" }
$Here = if ($PSScriptRoot) { $PSScriptRoot } else { "C:\Users\Garage\rs" }
$Finish  = Join-Path $Here "glb-finish.mjs"
$Texture = Join-Path $Here "glb-texture.mjs"
$Level   = Join-Path $Here "level.mjs"
foreach ($f in $Finish, $Texture, $Level, (Join-Path $Here "glb.mjs")) { if (-not (Test-Path $f)) { throw "Missing $f" } }
Write-Host "Using $RS"

$Proj   = "C:\Users\Garage\rs\$Name"
$Box    = "C:\Users\Garage\rs\wall.rsbox"
$Raw    = "$Proj\out\${Name}_raw.glb"           # RealityScan's export, with an external PNG
$Png    = "$Proj\out\${Name}_png.glb"           # glb-finish.mjs, PNG embedded
$Jpg    = "$Proj\out\${Name}_diffuse_q$Quality.jpg"
$Jpeg   = "$Proj\out\${Name}_jpg.glb"           # glb-texture.mjs, JPEG embedded
$Final  = "$Proj\out\$Name.glb"                 # level.mjs; the file to open
$Cams   = "$Proj\cams"
$BudgetMB = 15                                  # ADR 0005

foreach ($dir in "$Proj\out", $Cams) {
  if (-not $DryRun -and (Test-Path $dir) -and (Get-ChildItem $dir -Force | Select-Object -First 1)) {
    throw "$dir already has files. Pick another -Name, or delete that folder first."
  }
}

# Give RealityScan only the photos. -addFolder would also import any exported
# texture sitting in the folder (e.g. test_model_u0_v0_diffuse.png) as an extra "photo".
$photos = Get-ChildItem $Imgs -File | Where-Object { $_.Extension -match '^\.(heic|heif|jpe?g)$' }
if (-not $photos) { throw "No photos found in $Imgs" }
$List = "$Proj\photos.imagelist"
Write-Host "Photos: $($photos.Count)"

# The XMP export writes 00000.xmp (and 00000.png) next to the photos, overwriting any already there.
$camFile = '^\d{5}\.(xmp|png)$'
$stale = Get-ChildItem $Imgs -File | Where-Object { $_.Name -match $camFile }
if (-not $DryRun -and $stale) {
  throw "$Imgs already has $($stale.Count) exported camera files (e.g. $($stale[0].Name)). Move them out first."
}

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
$camArgs = @("-headless", "-silent", "$Proj\crash", "-set", "appQuitOnError=true",
             "-load", "$Proj\$Name.rsproj", "-selectMaximalComponent", "-exportXMPForSelectedComponent", "-quit")

if ($DryRun) {
  Write-Host "`nWould run:`n`"$RS`" $($rsArgs -join ' ')"
  Write-Host "`"$RS`" $($camArgs -join ' ')"
  Write-Host "Then move $Imgs\NNNNN.xmp to $Cams and delete $Imgs\NNNNN.png"
  Write-Host "node `"$Finish`" `"$Raw`" `"$Png`""
  Write-Host "JPEG q$Quality of the *_diffuse.png -> $Jpg"
  Write-Host "node `"$Texture`" `"$Png`" `"$Jpg`" `"$Jpeg`""
  Write-Host "node `"$Level`" `"$Jpeg`" `"$Cams`" `"$Final`""
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

& $RS @camArgs | Out-Null
if ($LASTEXITCODE -ne 0) { throw "RealityScan's XMP export failed. Check $Proj\crash." }
$exported = Get-ChildItem $Imgs -File | Where-Object { $_.Name -match $camFile }
$xmps = @($exported | Where-Object Extension -eq ".xmp")
New-Item -ItemType Directory -Force -Path $Cams | Out-Null
$xmps | Move-Item -Destination $Cams
$exported | Where-Object Extension -ne ".xmp" | Remove-Item
$aligned = "Cameras aligned: $($xmps.Count) of $($photos.Count) photos"
if ($xmps.Count -lt $photos.Count) { Write-Warning $aligned } else { Write-Host $aligned }

& node $Finish $Raw $Png
if ($LASTEXITCODE -ne 0) { throw "glb-finish.mjs failed on $Raw" }

$diffuse = @(Get-ChildItem "$Proj\out" -Filter "*_diffuse.png")
if ($diffuse.Count -ne 1) { throw "Expected one *_diffuse.png in $Proj\out, found $($diffuse.Count)" }
Add-Type -AssemblyName System.Drawing
$codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq "image/jpeg"
$encoder = New-Object Drawing.Imaging.EncoderParameters 1
$encoder.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality, [long]$Quality)
$image = [Drawing.Image]::FromFile($diffuse[0].FullName)
try { $image.Save($Jpg, $codec, $encoder) } finally { $image.Dispose() }

& node $Texture $Png $Jpg $Jpeg
if ($LASTEXITCODE -ne 0) { throw "glb-texture.mjs failed on $Png" }

& node $Level $Jpeg $Cams $Final
if ($LASTEXITCODE -ne 0) { throw "level.mjs failed. $Jpeg is the same model, not leveled." }

Get-ChildItem "$Proj\out" | Select-Object Name, @{n='MB';e={[math]::Round($_.Length/1e6,1)}} | Format-Table -AutoSize
$mb = (Get-Item $Final).Length / 1e6
$size = "{0:N1} MB of the {1} MB budget" -f $mb, $BudgetMB
if ($mb -gt $BudgetMB) { Write-Warning "$Final is $size. Try a lower -Quality or -Triangles." } else { Write-Host "Size: $size" }
Write-Host "Open this one: $Final"
