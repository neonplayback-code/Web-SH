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

// Las vistas previas al compartir (og:image, og:url) necesitan direcciones absolutas: se añaden si se conoce la de la web.
// Se define con VITE_SITE_URL (por ejemplo https://usuario.github.io/repositorio/); sin ella, esas etiquetas no se escriben.
function socialTags(): Plugin {
  return {
    name: 'social-tags',
    transformIndexHtml(html) {
      const raw = process.env.VITE_SITE_URL?.trim()
      if (!raw) return html.replace('    <!--SOCIAL_TAGS-->\n', '')
      const site = raw.endsWith('/') ? raw : `${raw}/`
      const tags = [
        `<link rel="canonical" href="${site}" />`,
        `<meta property="og:url" content="${site}" />`,
        `<meta property="og:image" content="${site}alchemy-logo.png" />`,
        `<meta property="og:image:alt" content="Logo de Alchemy Studios" />`,
        `<meta name="twitter:image" content="${site}alchemy-logo.png" />`,
      ]
      return html.replace('<!--SOCIAL_TAGS-->', tags.join('\n    '))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), githubPagesSpaFallback(), socialTags()],
  build: {
    rolldownOptions: {
      output: {
        // Las librerías cambian poco: en archivos aparte se cachean y el código de la web queda más ligero.
        codeSplitting: {
          groups: [
            { name: 'vendor-supabase', test: /node_modules[\\/]@supabase/, priority: 20 },
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})
