# Rebuild the PNG app icons from the same leaf paths as public/icons/leaf.svg.
# Uses Windows System.Drawing; no npm dependency or external image download.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../public/icons'
$variants = @(
 @{ File = 'apple-touch-icon.png'; Size = 180 },
 @{ File = 'app-192.png'; Size = 192 },
 @{ File = 'app-512.png'; Size = 512 },
 @{ File = 'app-maskable-512.png'; Size = 512 }
)
foreach ($variant in $variants) {
 $bitmap = [System.Drawing.Bitmap]::new($variant.Size, $variant.Size)
 $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
 $outline = [System.Drawing.Drawing2D.GraphicsPath]::new()
 $stem = [System.Drawing.Drawing2D.GraphicsPath]::new()
 $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 23)
 try {
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#176b51'))
  $graphics.ScaleTransform($variant.Size / 512.0, $variant.Size / 512.0)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $outline.AddBezier(142,330,92,260,150,146,350,134)
  $outline.AddBezier(350,134,382,260,314,362,224,362)
  $outline.AddBezier(224,362,189,362,162,352,142,330)
  $outline.CloseFigure()
  $stem.AddBezier(124,390,150,306,231,233,304,200)
  $graphics.DrawPath($pen,$outline)
  $graphics.DrawPath($pen,$stem)
  $bitmap.Save((Join-Path $iconDirectory $variant.File), [System.Drawing.Imaging.ImageFormat]::Png)
 } finally {
  $pen.Dispose()
  $stem.Dispose()
  $outline.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
 }
}
Write-Output 'Generated four home-screen icons (180, 192 and 512 px).'
