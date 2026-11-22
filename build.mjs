import { mkdir, readFile, writeFile } from 'node:fs/promises';

const files = {
  '/': ['index.html', 'text/html'],
  '/studio.js': ['studio.js', 'text/javascript'],
  '/projects.js': ['projects.js', 'text/javascript'],
  '/python-worker.js': ['python-worker.js', 'text/javascript'],
  '/turtle_browser.py': ['turtle_browser.py', 'text/plain'],
};
const assets = {};
for (const [url, [filename, type]] of Object.entries(files)) {
  assets[url] = [await readFile(new URL('../web/' + filename, import.meta.url), 'utf8'), type];
}
const worker = await readFile(new URL('server.js', import.meta.url), 'utf8');
const output = new URL('../dist/server/', import.meta.url);
await mkdir(output, {recursive:true});
await writeFile(new URL('index.js', output), 'const assets = ' + JSON.stringify(assets) + ';\n' + worker);
