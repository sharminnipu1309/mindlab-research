import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const base64Original = fs.readFileSync('logo.png').toString('base64');

const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<canvas id="c"></canvas>
<script>
  const img = new Image();
  img.src = 'data:image/png;base64,${base64Original}';
  img.onload = () => {
    const c = document.getElementById('c');
    // logo.png is 312 x 300
    // Brain node area is approx x: 15 to 295, y: 15 to 205
    const cropX = 15;
    const cropY = 12;
    const cropW = 280;
    const cropH = 175;
    
    c.width = cropW;
    c.height = cropH;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Make white background transparent
    const idata = ctx.getImageData(0, 0, cropW, cropH);
    const d = idata.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      // if near white, make transparent with smooth falloff
      if (r > 235 && g > 235 && b > 235) {
        const minVal = Math.min(r, g, b);
        if (minVal >= 248) {
          d[i + 3] = 0;
        } else {
          d[i + 3] = Math.round(255 * (1 - (minVal - 235) / 13));
        }
      }
    }
    ctx.putImageData(idata, 0, 0);
    const dataUrl = c.toDataURL('image/png');
    const out = document.createElement('div');
    out.id = 'output';
    out.textContent = dataUrl;
    document.body.appendChild(out);
    document.title = 'CROPPED_READY';
  };
</script>
</body>
</html>`;

fs.writeFileSync('crop_runner.html', htmlContent);

// Run with Chrome in headless mode and dump DOM
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlFileUrl = 'file:///' + path.resolve('crop_runner.html').replace(/\\/g, '/');

try {
  const result = execSync(`"${chromePath}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --virtual-time-budget=5000 --dump-dom "${htmlFileUrl}"`, {
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf-8',
  });

  const match = result.match(/<div id="output">data:image\/png;base64,([^<]+)<\/div>/);
  if (match) {
    const croppedBase64 = match[1];
    const croppedBuffer = Buffer.from(croppedBase64, 'base64');
    fs.writeFileSync('src/assets/memtiva-brain.png', croppedBuffer);
    console.log('Successfully extracted brain icon! Size:', croppedBuffer.length);

    // Also write a TypeScript module with both base64 strings so they can NEVER break
    const tsCode = `// Generated Memtiva brand assets - embedded as base64 data URIs so they never break on Vercel or Git LFS
export const MEMTIVA_BRAIN_ICON = 'data:image/png;base64,${croppedBase64}';
export const MEMTIVA_FULL_LOGO = 'data:image/png;base64,${base64Original}';
`;
    fs.writeFileSync('src/assets/logoData.ts', tsCode);
    console.log('Successfully wrote src/assets/logoData.ts');
  } else {
    console.log('Could not find output tag in rendered HTML. Length:', result.length);
  }
} catch (err) {
  console.error('Error running Chrome:', err.message);
} finally {
  if (fs.existsSync('crop_runner.html')) fs.unlinkSync('crop_runner.html');
}
