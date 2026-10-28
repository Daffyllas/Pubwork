// Runs tools/make-doc-fonts.py (complete fonts for the Scribus, InDesign and SVG downloads) with whichever
// Python is on the computer. Without Python or fontTools the build still works; those downloads just
// come without their fonts.
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
const script = fileURLToPath(new URL('./make-doc-fonts.py', import.meta.url));
for (const py of ['python3', 'python', 'py']) {
  const r = spawnSync(py, [script], { stdio: 'inherit' });
  if (!r.error) process.exit(0);
}
console.log('make-doc-fonts: Python not found; Scribus/InDesign/SVG downloads will come without fonts');
