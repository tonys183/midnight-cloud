const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');

function loadBuild() {
    for (const file of ['./build', './theme.config']) delete require.cache[require.resolve(file)];
    return require('./build');
}

function createPreview(outputFile) {
    const build = loadBuild();
    const importUrl = build.config.buildImport.match(/url\(['"]([^'"]+)['"]\)/)?.[1];
    if (!importUrl) throw new Error('No se reconoce buildImport en theme.config.js.');
    const publicRoot = new URL('../', importUrl).href;
    const cssToken = /\/\*[\s\S]*?\*\/|@import\s+url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)\s*;|url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g;

    function localPath(url, fromFile) {
        if (!url || url.startsWith('#') || url.startsWith('data:')) return null;
        let filename;
        if (url.startsWith(publicRoot)) {
            filename = path.resolve(root, decodeURIComponent(url.slice(publicRoot.length).split(/[?#]/)[0]));
        } else if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/)/i.test(url)) {
            return null;
        } else {
            filename = path.resolve(path.dirname(fromFile), decodeURIComponent(url.split(/[?#]/)[0]));
        }
        const relative = path.relative(root, filename);
        if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Recurso fuera del proyecto: ' + url);
        return filename;
    }

    function inline(css, fromFile, parents = new Set()) {
        return css.replace(new RegExp(cssToken), (token, impDouble, impSingle, impBare, assetDouble, assetSingle, assetBare) => {
            if (token.startsWith('/*')) return token;
            const isImport = token.startsWith('@import');
            const url = isImport ? (impDouble ?? impSingle ?? impBare) : (assetDouble ?? assetSingle ?? assetBare);
            const filename = localPath(url, fromFile);
            if (!filename) return token;
            if (isImport) {
                if (parents.has(filename)) throw new Error('Import circular: ' + filename);
                return inline(fs.readFileSync(filename, 'utf8'), filename, new Set([...parents, filename]));
            }
            const mime = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
                '.woff2': 'font/woff2', '.woff': 'font/woff' }[path.extname(filename).toLowerCase()] || 'application/octet-stream';
            return `url("data:${mime};base64,${fs.readFileSync(filename).toString('base64')}")`;
        });
    }

    let css = inline(build.buildCombinedTheme(), build.baseFile);
    const name = path.basename(outputFile, '.theme.css').replace(/[\r\n]/g, '');
    css = css.replace(/(@name\s+)[^\r\n]+/, (_, prefix) => prefix + name);
    return { css, build };
}

function main() {
    const args = process.argv.slice(2);
    let output;
    let once = false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--once') once = true;
        else if (args[i] === '--output' && args[i + 1]) output = args[++i];
        else throw new Error('Argumento desconocido o incompleto: ' + args[i]);
    }
    const configFile = path.join(root, '.theme-dev', 'dev.json');
    const local = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : {};
    output = path.resolve(root, output || process.env.DEV_OUTPUT_PATH || local.output || '.theme-dev/preview/test.theme.css');
    if (!output.endsWith('.theme.css')) throw new Error('La salida debe terminar en .theme.css.');
    const relative = path.relative(root, output);
    if (relative === 'midnight-cloud.theme.css' || /^(src|scripts|addons|assets|build)([\\/]|$)/.test(relative)) {
        throw new Error('La salida no puede reemplazar una fuente del proyecto.');
    }
    const backup = path.join(root, '.theme-dev', 'backups', 'dev-output',
        createHash('sha256').update(output).digest('hex').slice(0, 12), path.basename(output));

    function update() {
        const { css, build } = createPreview(output);
        if (fs.existsSync(output) && !fs.existsSync(backup)) {
            fs.mkdirSync(path.dirname(backup), { recursive: true });
            fs.copyFileSync(output, backup, fs.constants.COPYFILE_EXCL);
            console.log('Respaldo: ' + backup);
        }
        build.buildSource();
        fs.mkdirSync(path.dirname(output), { recursive: true });
        if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== css) fs.writeFileSync(output, css);
        console.log('Actualizado: ' + output);
    }
    update();
    if (once) return;
    let timer;
    function schedule() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            try { update(); } catch (error) { console.error('No se actualizo el test: ' + error.message); }
        }, 150);
    }
    const watchers = [];
    for (const folder of ['src', 'scripts', 'addons', 'assets']) {
        const dir = path.join(root, folder);
        if (fs.existsSync(dir)) watchers.push(fs.watch(dir, { recursive: process.platform === 'win32' }, schedule));
    }
    watchers.push(fs.watch(root, (_, name) => {
        if (name && name.endsWith('.theme.css')) schedule();
    }));
    for (const watcher of watchers) watcher.on('error', error => console.error(error.message));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
        clearTimeout(timer);
        for (const watcher of watchers) watcher.close();
        process.exit(0);
    });
    console.log('Observando fuentes, opciones, addons y assets. Ctrl+C para detener.');
}

if (require.main === module) {
    try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { createPreview };
