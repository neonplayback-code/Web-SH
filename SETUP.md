# Setup: Supabase

Overdrive - Box guarda las cuentas (**Auth**), las publicaciones, perfiles, likes y avances (**Postgres**) y las
imágenes y videos (**Storage**), todo en un proyecto de Supabase. Sin configurar nada la web carga igual, pero
muestra avisos en lugar de publicaciones.

## 1. Crear el proyecto

1. Entra en <https://supabase.com> y crea un proyecto (región cercana).
2. Guarda la contraseña de la base de datos en un lugar seguro. No hace falta para la web.
3. Cuando termine de crearse, ve a **Project Settings → API** y copia la **Project URL** y la clave
   **publishable** (empieza por `sb_publishable_`). Nunca uses la clave `service_role` ni `sb_secret_` en la web.

## 2. Variables de entorno

Copia `.env.example` a `.env` en la raíz del proyecto y rellena:

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clave publishable |

Estas claves son públicas: van en el navegador. Lo que protege tus datos son las reglas del paso 3.
`.env` no se sube al repositorio. Reinicia `npm run dev` después de crearlo.

## 3. Crear tablas, reglas y almacenamiento

La configuración base son dos archivos, cada uno en **su propia consulta** (así, si uno falla, el otro no se pierde):

1. En Supabase abre **SQL Editor → New query**.
2. Abre [supabase/1-tablas.sql](supabase/1-tablas.sql), copia todo, pégalo y pulsa **Run**.
   Si aparece un aviso de "operaciones destructivas" (por los `drop policy`), confirma con **Run this query**.
3. Debe decir **Success**. En **Table Editor** verás `profiles`, `projects`, `project_likes` y `project_updates`.
4. Abre una consulta nueva, pega [supabase/2-almacenamiento.sql](supabase/2-almacenamiento.sql) y pulsa **Run**.
   Crea el bucket `media` para imágenes y videos.

5. Otra consulta nueva: [supabase/4-perfil.sql](supabase/4-perfil.sql). Crea la tabla `site_profile`, que guarda tu perfil público
   (nombre, frase, bio, enlaces, logo y secciones visibles). Solo el dueño lo cambia, desde **Editar mi perfil** en la portada.
   Sin este paso la web funciona igual con los valores de `src/config/site.ts`, pero no podrás guardar cambios de perfil.
   (`3-arreglo-usuario.sql` solo hace falta si alguna cuenta quedó con el correo como nombre de usuario.)

Todos se pueden ejecutar más de una vez sin romper nada. Si alguno da un error en rojo, cópialo completo.

Qué crea:

- Tablas con reglas de seguridad (RLS) y la función `toggle_like`, que alterna el ♥ y el contador en una sola operación.
- La función `is_owner`: **el dueño es la primera cuenta que se registra**. Regístrate tú primero.
- Un bucket público `media`; solo el dueño sube archivos, cada uno en su carpeta.

Qué garantizan las reglas:

- Los borradores solo los ve su autor; lo publicado es público.
- **Solo el dueño publica**, edita, borra y añade avances. Las demás cuentas solo ven y dan ♥.
- Nadie puede escribir el contador de likes directamente: solo a través de `toggle_like`, que suma o resta **un** like por usuario.

## 4. Desactivar la confirmación por correo (recomendado)

**Authentication → Sign In / Providers → Email**: desactiva **Confirm email**. Así al registrarte entras de
inmediato, como antes. Si lo dejas activo, cada cuenta nueva tiene que confirmar desde el correo antes de entrar.

## 5. Probar que funciona

1. `npm install` y `npm run dev`.
2. En la cabecera, la píldora **SUPABASE** debe decir **OK** (si dice OFF, falta `.env` o no se reinició el servidor).
3. Pulsa **Entrar** en la cabecera, ve a **Crear cuenta** y regístrate con correo y contraseña. **Hazlo tú primero**:
   la primera cuenta es la del dueño. Luego abre **`/nuevo`** (no hay enlace público; escribe la ruta a mano) para publicar.
   Los visitantes solo ven y dan ♥ después de iniciar sesión.
4. Publica algo con portada. Debe aparecer en la portada, en `/p/:id` y en tu perfil `/u/tu-usuario`.
5. Con otra cuenta (o en otra ventana) da ♥ a esa publicación: el contador sube en todos lados.

Si algo falla, el error aparece en rojo en el formulario o en un aviso. Los más comunes:

- `new row violates row-level security policy`: el SQL del paso 3 no se ejecutó completo.
- `Invalid login credentials`: correo o contraseña incorrectos, o la cuenta aún no está confirmada (paso 4).
- Imágenes que no suben: revisa que el bucket `media` exista (se crea con el SQL) y que el archivo no supere 5 MB (imágenes) o 100 MB (videos).

## 6. Dominios permitidos (cuando publiques la web)

**Authentication → URL Configuration**: añade el dominio final de la web en **Site URL** y en **Redirect URLs**.

## 7. Publicar la web (más adelante)

`npm run build` genera `dist/`. Es una app de una sola página con rutas (`/p/:id`, `/u/:usuario`), así que el
alojamiento debe devolver `index.html` para cualquier ruta (Vercel y Netlify lo permiten con una regla de
reescritura; GitHub Pages necesita una copia de `index.html` como `404.html`). Copia también las dos variables
`VITE_SUPABASE_*` a la configuración del alojamiento.
