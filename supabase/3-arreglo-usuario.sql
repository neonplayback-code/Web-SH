-- Quita el correo del nombre de usuario público.
-- Cambia 'alchemystudios' por el nombre que quieras mostrar (sin espacios ni @) y pulsa Run.

update public.profiles set username = 'alchemystudios' where username like '%@%';
update public.projects set author_username = 'alchemystudios' where author_username like '%@%';

-- Para las cuentas nuevas, 5-endurecer.sql ya limpia el nombre (solo lo anterior a la @) y evita repetidos.
