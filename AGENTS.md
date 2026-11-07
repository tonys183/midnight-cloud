# midnight-cloud

- Editar `src/*.css`, no `build/midnight-cloud.css`: el build es generado.
- Conservar las personalizaciones de tonys183 y los enlaces de https://tonys183.github.io/midnight-cloud/.
- `scripts/theme.config.js` fija el orden de los módulos. Actualizarlo al añadir o quitar un CSS.
- `midnight-cloud.theme.css` contiene los metadatos, opciones, colores e imports de addons.
- `addons/` contiene complementos independientes, incluidos los desactivados.
- Después de cambiar fuentes: `npm run build` y `npm run check:build`.
- Después de cambiar selectores: `npm run check-classes` (o `-- --canary` según el cliente).
- Los errores de clases pendientes se revisan manualmente: no elegir un hash ambiguo.
- No editar ni eliminar el `.git` del repositorio durante una actualización del tema.
