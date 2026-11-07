// Based on refact0r/midnight-discord build tooling (MIT; see LICENSE).
const fs = require('node:fs');
const path = require('node:path');
const config = require('./theme.config');
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const baseFile = path.join(root, config.baseFile);
const buildFile = path.join(root, config.buildFile);

function compileSource() {
    const discovered = fs.readdirSync(srcDir).filter(f => f.endsWith('.css')).sort();
    const configured = [...config.sourceFiles].sort();
    if (new Set(configured).size !== configured.length ||
        JSON.stringify(discovered) !== JSON.stringify(configured)) {
        throw new Error('Actualiza sourceFiles en scripts/theme.config.js: ' + discovered.join(', '));
    }
    // Preserve source bytes and order, including the original CRLF section headers.
    return Buffer.concat(config.sourceFiles.flatMap(file => [
        Buffer.from(`/* ${file} */\r\n`), fs.readFileSync(path.join(srcDir, file)),
    ]));
}

function buildSource() {
    const compiled = compileSource();
    fs.mkdirSync(path.dirname(buildFile), { recursive: true });
    fs.writeFileSync(buildFile, compiled);
    return compiled.toString('utf8');
}

function buildCombinedTheme() {
    const base = fs.readFileSync(baseFile, 'utf8');
    if (base.split(config.buildImport).length !== 2) {
        throw new Error('Debe existir exactamente un import del build en ' + config.baseFile);
    }
    return base.replace(config.buildImport, () => compileSource().toString('utf8'));
}

if (require.main === module) {
    try {
        if (process.argv.includes('--check')) {
            if (!fs.existsSync(buildFile) || !fs.readFileSync(buildFile).equals(compileSource())) {
                throw new Error('Build desactualizado. Ejecuta npm run build.');
            }
            console.log('Build actualizado: ' + config.buildFile);
        } else {
            buildSource();
            console.log('Generado: ' + config.buildFile);
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
module.exports = { config, root, srcDir, baseFile, buildFile, buildSource, buildCombinedTheme };
