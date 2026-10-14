import { build } from '../backend/node_modules/esbuild/lib/main.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Building Prachi AI Frontend with esbuild...');
try {
  await build({
    entryPoints: [path.join(__dirname, 'src/main.tsx')],
    bundle: true,
    outfile: path.join(__dirname, 'dist/bundle.js'),
    minify: false,
    sourcemap: true,
    target: ['es2020'],
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    loader: {
      '.png': 'dataurl',
      '.svg': 'text',
      '.jpg': 'dataurl',
    },
  });

  // Ensure dist exists
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

  // Read index.html, update script tag for production bundle, and write to dist
  const htmlPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');
  html = html.replace(/src="[^"]*src\/main\.tsx"/, 'src="./bundle.js"');
  html = html.replaceAll('href="/index.css"', 'href="./index.css"');
  html = html.replaceAll('href="/bundle.css"', 'href="./bundle.css"');
  fs.writeFileSync(path.join(distDir, 'index.html'), html);

  const cssSrc = path.join(__dirname, 'src/styles/index.css');
  if (fs.existsSync(cssSrc)) {
    fs.copyFileSync(cssSrc, path.join(distDir, 'index.css'));
  }

  // Copy assets folder if present
  const assetsSrc = path.join(__dirname, 'src/assets');
  if (fs.existsSync(assetsSrc)) {
    const distAssets = path.join(distDir, 'assets');
    if (!fs.existsSync(distAssets)) fs.mkdirSync(distAssets, { recursive: true });
    for (const file of fs.readdirSync(assetsSrc)) {
      fs.copyFileSync(path.join(assetsSrc, file), path.join(distAssets, file));
    }
  }

  // List of target directories to sync for Portfolio, Live Server, and Vercel integration
  const targetSyncDirs = [
    __dirname, // Local frontend root
    path.resolve(__dirname, '../../Personal Portfolio/prachi'),
    path.resolve(__dirname, '../../Personal Portfolio/Prachi AI/frontend'),
    path.resolve(__dirname, '../../../Personal Portfolio/prachi'),
    path.resolve(__dirname, '../../../Personal Portfolio/Prachi AI/frontend'),
    path.resolve(__dirname, '../../prachi'),
    path.resolve(__dirname, '../../../prachi'),
  ];

  const uniqueTargets = [...new Set(targetSyncDirs)].filter(dir => {
    // Check if directory or parent directory exists
    return fs.existsSync(dir) || fs.existsSync(path.dirname(dir));
  });

  for (const targetDir of uniqueTargets) {
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // HTML for embedded prachi
    let targetHtml = fs.readFileSync(htmlPath, 'utf-8');
    targetHtml = targetHtml.replace(/src="[^"]*src\/main\.tsx"/, 'src="./bundle.js"');
    targetHtml = targetHtml.replaceAll('href="/index.css"', 'href="./index.css"');
    targetHtml = targetHtml.replaceAll('href="/bundle.css"', 'href="./bundle.css"');
    targetHtml = targetHtml.replaceAll('href="./assets/', 'href="./assets/');
    fs.writeFileSync(path.join(targetDir, 'index.html'), targetHtml);

    // Copy bundle files
    const filesToCopy = ['bundle.js', 'bundle.js.map', 'bundle.css', 'bundle.css.map', 'index.css'];
    for (const f of filesToCopy) {
      const srcFile = path.join(distDir, f);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(targetDir, f));
      }
    }

    // Copy assets
    if (fs.existsSync(assetsSrc)) {
      const targetAssets = path.join(targetDir, 'assets');
      if (!fs.existsSync(targetAssets)) fs.mkdirSync(targetAssets, { recursive: true });
      for (const file of fs.readdirSync(assetsSrc)) {
        fs.copyFileSync(path.join(assetsSrc, file), path.join(targetAssets, file));
      }
    }

    console.log(`Synced production bundle to: ${targetDir}`);
  }

  console.log('Frontend built & synced to all portfolio targets successfully!');
} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
}
