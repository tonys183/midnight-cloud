# midnight-cloud

<p align="center">
  <img alt="CSS" src="https://img.shields.io/badge/CSS-663399?style=plastic&amp;logo=css&amp;logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=plastic&amp;logo=javascript&amp;logoColor=black">
  <img alt="Node.js 18 o posterior" src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=plastic&amp;logo=nodedotjs&amp;logoColor=white">
  <img alt="Python 3" src="https://img.shields.io/badge/Python-3-3776AB?style=plastic&amp;logo=python&amp;logoColor=white">
  <img alt="BetterDiscord" src="https://img.shields.io/badge/BetterDiscord-3E82E5?style=plastic&amp;logo=betterdiscord&amp;logoColor=white">
  <a href="https://tonys183.github.io/midnight-cloud/"><img alt="GitHub Pages" src="https://img.shields.io/badge/GitHub_Pages-222222?style=plastic&amp;logo=github&amp;logoColor=white"></a>
  <a href="LICENSE"><img alt="Licencia MIT" src="https://img.shields.io/badge/Licencia-MIT-blue?style=plastic"></a>
</p>

Tema para BetterDiscord de **tonys183**, basado en [Midnight de refact0r](https://github.com/refact0r/midnight-discord).

## Estructura

```text
src/                         # estilos organizados por componente
scripts/                     # construcción, desarrollo y revisión de clases
build/midnight-cloud.css      # CSS generado
midnight-cloud.theme.css      # metadatos, configuración e imports
addons/                      # complementos opcionales
assets/                      # recursos gráficos
tools/update-classes.py       # migración de clases de Discord
LICENSE                      # licencia MIT
```

## Configuración

Los colores, tamaños, fondo y opciones visuales se definen en `midnight-cloud.theme.css`.
Los complementos se activan mediante los imports del mismo archivo.

## Desarrollo

Requiere Node.js 18 o posterior. Los comandos se ejecutan desde la raíz del repositorio.

```powershell
npm run build          # generar build/midnight-cloud.css
npm run dev            # actualizar el tema test al guardar cambios
npm run check:build    # comprobar que el build coincide con las fuentes
```

Las reglas se editan en `src/`. El archivo de `build/` se genera automáticamente.
El orden de compilación se define en `sourceFiles`, dentro de `scripts/theme.config.js`.
Los módulos nuevos deben registrarse en esa lista.

### Prueba local en BetterDiscord

`npm run dev` reconstruye el módulo y genera una copia completa del tema en el
destino indicado por `.theme-dev/dev.json`.
La copia incluye los estilos de `src/`, las opciones de `midnight-cloud.theme.css`,
los addons activos y los recursos locales.

El destino también se puede indicar al ejecutar el comando:

```powershell
npm run dev -- --output "$env:APPDATA\BetterDiscord\themes\test.theme.css"
```

En BetterDiscord se activa **test** y se desactiva el tema publicado para evitar
que sus estilos se superpongan. El proceso debe permanecer abierto mientras se
edita.

Sin un destino configurado, la vista previa se guarda en `.theme-dev/preview/test.theme.css`.
`npm run dev -- --once` genera una sola vez, sin mantener el watcher abierto.

## Clases de Discord

Comprobar los selectores de `src/` contra Stable o Canary:

```powershell
npm run check-classes
npm run check-classes -- --canary
```

La comprobación muestra las clases ausentes y los candidatos con el mismo nombre.
No modifica archivos. El código de salida 1 indica clases pendientes de revisión.
La caché se guarda en `.theme-dev/`, ignorada por Git.

Generar una propuesta de migración con Python:

```powershell
python tools/update-classes.py --canary
```

Si está disponible la lista anterior, se puede utilizar para relacionar los módulos:

```powershell
python tools/update-classes.py --canary --previous .theme-dev/classes/stableclasses-YYYY-MM-DD.json
```

También se pueden utilizar listas locales para ambas versiones:

```powershell
python tools/update-classes.py --source .theme-dev/classes/canaryclasses-YYYY-MM-DD.json --previous .theme-dev/classes/stableclasses-YYYY-MM-DD.json
```

La propuesta se guarda en `.theme-dev/class-migration/output.css` y el informe en
`.theme-dev/class-migration/output.report.json`.

Los reemplazos deben revisarse y aplicarse a los módulos de `src/`.
Después de aplicar los cambios, reconstruir y comprobar:

```powershell
npm run build
npm run check:build
npm run check-classes -- --canary
```

Los addons y el archivo de configuración se revisan por separado.

## GitHub Pages

El CSS publicado se carga desde:

```text
https://tonys183.github.io/midnight-cloud/build/midnight-cloud.css
```

## Créditos

- Personalizaciones: tonys183.
- Tema Midnight y herramienta de revisión de clases: refact0r (Licencia MIT).
