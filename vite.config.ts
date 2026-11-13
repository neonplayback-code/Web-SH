import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'

function githubPagesSpaFallback(): Plugin {
  let resolved: ResolvedConfig
  return {
    name: 'github-pages-spa-fallback',
    configResolved(cfg) {
      resolved = cfg
    },
    closeBundle() {
      const cleanBase = resolved.base.replace(/^\/|\/$/g, '')
      const segments = cleanBase ? cleanBase.split('/').length : 0
      const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Redirigiendo…</title>
    <script>
      (function () {
        var keep = ${segments};
        var l = window.location;
        var root = l.pathname.split('/').slice(0, 1 + keep).join('/');
        var rest = l.pathname.slice(1).split('/').slice(keep).join('/').replace(/&/g, '~and~');
        var q = l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '';
        l.replace(l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') + root + '/?/' + rest + q + l.hash);
      })();
    </script>
  </head>
  <body></body>
</html>
`
      writeFileSync(resolve(resolved.root, resolved.build.outDir, '404.html'), html)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), githubPagesSpaFallback()],
})
