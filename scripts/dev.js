const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
let timer;
function build() {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
    if (result.error) console.error(result.error.message);
}
build();
for (const folder of ['src', 'scripts']) {
    fs.watch(path.join(root, folder), () => {
        clearTimeout(timer);
        timer = setTimeout(build, 150);
    });
}
console.log('Observando src/ y scripts/. Ctrl+C para salir.');
