use dioxus::prelude::*;
mod backend;

const TABS: [(&str, &str); 10] = [
    ("", "Todo"),
    ("proyectos", "Proyectos"),
    ("videos", "Videos"),
    ("anuncios", "Anuncios"),
    ("posts", "Posts"),
    ("betas", "Betas"),
    ("demos", "Demos"),
    ("avances", "Avances"),
    ("links", "Links"),
    ("shorts", "Shorts"),
];

const VALID_MODES: [&str; 2] = ["astra", "overdrive"];
const VALID_THEMES: [&str; 5] = ["ice", "toxic", "ember", "violet", "white"];

#[derive(Clone, Copy, PartialEq, Eq)]
enum Screen {
    Home,
    Login,
    New,
    Detail,
}

#[derive(Clone, PartialEq)]
struct Publication {
    id: String,
    title: String,
    summary: String,
    kind: String,
    likes: i32,
    cover_url: Option<String>,
}

const DEMO_PUBLICATIONS: [(&str, &str, &str, i32); 8] = [
    ("Overdrive Box", "Un espacio para compartir proyectos, ideas y avances.", "app", 28),
    ("Forja de píxeles", "Un experimento interactivo de animación y diseño.", "demo", 17),
    ("Notas de la semana", "Lo nuevo que estoy construyendo y lo que sigue.", "post", 13),
    ("Trailer de la beta", "Un vistazo a la próxima versión.", "video", 11),
    ("Overdrive 0.9", "Prueba las funciones nuevas y comparte comentarios.", "beta", 8),
    ("Cambio de dominio", "La página ya tiene una nueva dirección.", "anuncio", 6),
    ("Primer prototipo", "Así empezó esta idea.", "avance", 4),
    ("Mi canal", "Videos, tutoriales y procesos creativos.", "link", 3),
];

fn main() {
    dioxus::launch(App);
}

fn username_for(session: &backend::Session) -> String {
    session
        .user
        .user_metadata
        .get("username")
        .and_then(serde_json::Value::as_str)
        .map(str::to_owned)
        .or_else(|| {
            session
                .user
                .email
                .as_deref()
                .map(|email| email.split('@').next().unwrap_or("usuario").to_owned())
        })
        .unwrap_or_else(|| "usuario".into())
}

fn clean_username(raw: &str) -> String {
    raw.trim()
        .split('@')
        .next()
        .unwrap_or("")
        .chars()
        .filter(|character| character.is_alphanumeric() || matches!(character, '.' | '_' | '-'))
        .take(30)
        .collect()
}

fn kind_label(kind: &str) -> &str {
    match kind {
        "app" => "Proyectos",
        "video" => "Videos",
        "anuncio" => "Anuncios",
        "post" => "Posts",
        "beta" => "Betas",
        "demo" => "Demos",
        "avance" => "Avances",
        "link" => "Links",
        "short" => "Shorts",
        _ => "Publicación",
    }
}

fn filter_publications(
    projects: &[backend::Project],
    configured: bool,
    section: &str,
    search: &str,
    sort_likes: bool,
) -> Vec<Publication> {
    let needle = search.trim().to_lowercase();
    let selected_type = if section == "proyectos" { "app" } else { section };

    let matches = |kind: &str, title: &str, summary: &str| -> bool {
        (section.is_empty() || kind == selected_type)
            && (needle.is_empty()
                || title.to_lowercase().contains(&needle)
                || summary.to_lowercase().contains(&needle))
    };

    let mut items: Vec<Publication> = if configured {
        projects
            .iter()
            .filter(|project| matches(&project.kind, &project.title, &project.summary))
            .map(|project| Publication {
                id: project.id.clone(),
                title: project.title.clone(),
                summary: project.summary.clone(),
                kind: project.kind.clone(),
                likes: project.likes,
                cover_url: project.cover_url.clone(),
            })
            .collect()
    } else {
        DEMO_PUBLICATIONS
            .iter()
            .enumerate()
            .filter(|(_, (title, summary, kind, _))| matches(kind, title, summary))
            .map(|(index, (title, summary, kind, likes))| Publication {
                id: format!("demo-{index}"),
                title: (*title).into(),
                summary: (*summary).into(),
                kind: (*kind).into(),
                likes: *likes,
                cover_url: None,
            })
            .collect()
    };

    if sort_likes {
        items.sort_by_key(|item| std::cmp::Reverse(item.likes));
    }
    items
}

fn hydrate_user_data(
    token: String,
    user_id: String,
    mut is_owner: Signal<bool>,
    mut liked: Signal<Vec<String>>,
    mut projects: Signal<Vec<backend::Project>>,
) {
    let owner_token = token.clone();
    spawn(async move {
        if let Ok(owner) = backend::is_owner(&owner_token).await {
            is_owner.set(owner);
        }
    });

    let likes_token = token.clone();
    spawn(async move {
        if let Ok(ids) = backend::fetch_liked_ids(&user_id, &likes_token).await {
            liked.set(ids);
        }
    });

    spawn(async move {
        if let Ok(data) = backend::fetch_projects(Some(&token)).await {
            projects.set(data);
        }
    });
}

fn trigger_toggle_like(
    project_id: String,
    session: Signal<Option<backend::Session>>,
    mut liked: Signal<Vec<String>>,
    mut projects: Signal<Vec<backend::Project>>,
    mut data_error: Signal<String>,
    mut signup: Signal<bool>,
    mut screen: Signal<Screen>,
) {
    let Some(auth) = session() else {
        signup.set(false);
        screen.set(Screen::Login);
        return;
    };

    spawn(async move {
        match backend::toggle_like(&project_id, &auth.access_token).await {
            Ok((_, count)) => {
                let mut current = liked();
                if let Some(pos) = current.iter().position(|id| id == &project_id) {
                    current.remove(pos);
                } else {
                    current.push(project_id.clone());
                }
                liked.set(current);
                for project in projects.write().iter_mut() {
                    if project.id == project_id {
                        project.likes = count;
                        break;
                    }
                }
            }
            Err(error) => data_error.set(error),
        }
    });
}

#[component]
fn App() -> Element {
    let mut mode = use_signal(|| "astra".to_string());
    let mut theme = use_signal(|| "ice".to_string());
    let mut prefs_ready = use_signal(|| false);
    let mut tab = use_signal(String::new);
    let mut liked = use_signal(Vec::<String>::new);
    let mut screen = use_signal(|| Screen::Home);
    let mut projects = use_signal(Vec::<backend::Project>::new);
    let mut loading = use_signal(backend::is_configured);
    let data_error = use_signal(String::new);
    let mut session = use_signal(|| None::<backend::Session>);
    let mut is_owner = use_signal(|| false);
    let mut signup = use_signal(|| false);
    let selected_id = use_signal(String::new);

    use_effect(move || {
        spawn(async move {
            if let Ok(value) =
                document::eval("return [localStorage.getItem('od-uimode'), localStorage.getItem('od-theme')]").await
                && let Some(values) = value.as_array()
            {
                if let Some(saved_mode) = values.first().and_then(serde_json::Value::as_str)
                    && VALID_MODES.contains(&saved_mode)
                {
                    mode.set(saved_mode.to_owned());
                }
                if let Some(saved_theme) = values.get(1).and_then(serde_json::Value::as_str)
                    && VALID_THEMES.contains(&saved_theme)
                {
                    theme.set(saved_theme.to_owned());
                }
            }
            prefs_ready.set(true);
        });
    });

    use_effect(move || {
        if !prefs_ready() {
            return;
        }
        let visual_mode = mode();
        let visual_theme = theme();
        spawn(async move {
            let _ = document::eval(&format!(
                "document.documentElement.dataset.mode = '{visual_mode}'; document.documentElement.dataset.theme = '{visual_theme}'; localStorage.setItem('od-uimode', '{visual_mode}'); localStorage.setItem('od-theme', '{visual_theme}'); document.dispatchEvent(new CustomEvent('od-mode-change'));"
            ))
            .await;
        });
    });

    use_effect(move || {
        let mut data_error = data_error;
        spawn(async move {
            if backend::is_configured() {
                match backend::fetch_projects(None).await {
                    Ok(data) => projects.set(data),
                    Err(error) => data_error.set(error),
                }
            }
            loading.set(false);
        });
    });

    use_effect(move || {
        spawn(async move {
            if let Ok(value) = document::eval("return localStorage.getItem('od-rust-session')").await
                && let Some(raw) = value.as_str()
                && let Ok(restored) = serde_json::from_str::<backend::Session>(raw)
            {
                let token = restored.access_token.clone();
                let user_id = restored.user.id.clone();
                session.set(Some(restored));
                hydrate_user_data(token, user_id, is_owner, liked, projects);
            }
        });
    });

    rsx! {
        document::Title { "Overdrive - Box" }
        document::Link { rel: "stylesheet", href: asset!("/assets/main.css") }
        div { id: "app", "data-mode": mode(),
            document::Script { src: asset!("/assets/starrynight.js") }
            document::Script { src: asset!("/assets/hangar-fx.js") }
            a { class: "skip-link", href: "#contenido", "Saltar al contenido" }
            header { class: "topbar",
                a { class: "wordmark", href: "#inicio", onclick: move |_| screen.set(Screen::Home),
                    span { class: "brand-text", span { class: "brand-name", "OVERDRIVE" } span { class: "brand-box", "BOX" } }
                }
                div { class: "topbar-right",
                    div { class: "mode-selector", role: "group", "aria-label": "Modo visual",
                        for (key, label) in [("astra", "ASTRA"), ("overdrive", "HANGAR")] {
                            button {
                                class: if mode() == key { "mode-btn is-active" } else { "mode-btn" },
                                onclick: move |_| mode.set(key.to_string()),
                                "{label}"
                            }
                        }
                    }
                    select {
                        class: "launcher-pill",
                        value: "{theme}",
                        aria_label: "Ambiente de color",
                        onchange: move |event| theme.set(event.value()),
                        option { value: "ice", "Hielo" }
                        option { value: "toxic", "Tóxico" }
                        option { value: "ember", "Brasa" }
                        option { value: "violet", "Violeta" }
                        option { value: "white", "Blanco" }
                    }
                    if session().is_some() {
                        button {
                            class: "ghost-button",
                            onclick: move |_| {
                                session.set(None);
                                is_owner.set(false);
                                liked.set(Vec::new());
                                let _ = document::eval("localStorage.removeItem('od-rust-session')");
                            },
                            "Salir"
                        }
                    } else {
                        button {
                            class: "ghost-button",
                            onclick: move |_| {
                                signup.set(false);
                                screen.set(Screen::Login);
                            },
                            "Entrar"
                        }
                    }
                    if is_owner() {
                        button {
                            class: "add-button",
                            onclick: move |_| screen.set(Screen::New),
                            span { class: "add-symbol", "+" }
                            " Publicar"
                        }
                    }
                }
            }
            main { class: "dashboard", id: "contenido",
                nav { class: "tabbar", aria_label: "Secciones",
                    for (slug, label) in TABS {
                        button {
                            class: if tab() == slug { "launcher-pill tab is-active" } else { "launcher-pill tab" },
                            onclick: move |_| {
                                tab.set(slug.to_string());
                                screen.set(Screen::Home);
                            },
                            "{label}"
                        }
                    }
                }
                match screen() {
                    Screen::Home => rsx! {
                        HomeScreen { tab, liked, session, projects, loading, data_error, signup, screen, selected_id }
                    },
                    Screen::Login => rsx! {
                        LoginScreen { signup, session, is_owner, liked, projects, screen }
                    },
                    Screen::New => rsx! {
                        NewProjectScreen { session, is_owner, projects, screen }
                    },
                    Screen::Detail => rsx! {
                        DetailScreen { selected_id, projects, session, is_owner, liked, data_error, signup, screen }
                    },
                }
                footer { class: "footer", "OVERDRIVE BOX · Hecho con Rust y Dioxus" }
            }
        }
    }
}

#[component]
fn HomeScreen(
    tab: Signal<String>,
    liked: Signal<Vec<String>>,
    session: Signal<Option<backend::Session>>,
    projects: Signal<Vec<backend::Project>>,
    loading: Signal<bool>,
    data_error: Signal<String>,
    signup: Signal<bool>,
    screen: Signal<Screen>,
    selected_id: Signal<String>,
) -> Element {
    let mut search = use_signal(String::new);
    let mut sort_likes = use_signal(|| false);

    let tab_title = TABS
        .iter()
        .find(|(slug, _)| *slug == tab())
        .map(|(_, label)| *label)
        .unwrap_or("Todo");

    let configured = backend::is_configured();
    let total_projects = if configured {
        projects().len()
    } else {
        DEMO_PUBLICATIONS.len()
    };
    let total_likes: i32 = if configured {
        projects.read().iter().map(|project| project.likes).sum()
    } else {
        90
    };

    let filtered = use_memo(move || {
        filter_publications(
            &projects.read(),
            configured,
            &tab(),
            &search(),
            sort_likes(),
        )
    });

    rsx! {
        section { class: "home-hero utility-card",
            div { class: "creator-head",
                a { class: "creator-logo", href: "#inicio",
                    img { src: asset!("/assets/alchemy-logo.png"), alt: "Logo de Alchemy Studios" }
                }
                div { class: "creator-id",
                    span { class: "hero-id", "OD / OVERDRIVE BOX" }
                    p { class: "hero-greeting", "ARCHIVO PERSONAL" }
                    h1 { class: "creator-name", "Alchemy Studios" }
                    p { class: "pub-lead", "Proyectos, videos, betas, demos y avances." }
                }
            }
            p { class: "pub-hint", "Dale ♥ a lo que te guste." }
        }
        section { class: "home-stats utility-card",
            span { class: "section-kicker", "RESUMEN" }
            div { class: "stats-row",
                div { strong { "{total_projects}" } span { "publicaciones" } }
                div { strong { "{total_likes}" } span { "me gusta" } }
                div { strong { "3" } span { "modos visuales" } }
            }
        }
        section { class: "tab-body",
            div { class: "utility-heading",
                div { span { class: "section-kicker", "PUBLICACIONES" } h2 { "{tab_title}" } }
                div { class: "feed-controls",
                    label { class: "search", "Buscar publicaciones",
                        input {
                            placeholder: "Buscar…",
                            value: "{search}",
                            oninput: move |event| search.set(event.value()),
                        }
                    }
                    button {
                        class: "ghost-button",
                        onclick: move |_| sort_likes.set(!sort_likes()),
                        if sort_likes() { "Más gustados" } else { "Recientes" }
                    }
                }
            }
            if loading() {
                div { class: "utility-card pub-empty", strong { "Cargando publicaciones…" } }
            } else if !data_error().is_empty() {
                div { class: "utility-card pub-empty",
                    strong { "No se pudieron cargar las publicaciones." }
                    p { "{data_error}" }
                }
            } else if filtered().is_empty() {
                div { class: "utility-card pub-empty", strong { "No hay publicaciones en esta sección." } }
            } else {
                div { class: "pub-grid",
                    for item in filtered() {
                        PublicationCard {
                            key: "{item.id}",
                            item,
                            liked,
                            session,
                            projects,
                            data_error,
                            signup,
                            screen,
                            selected_id,
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn LoginScreen(
    mut signup: Signal<bool>,
    mut session: Signal<Option<backend::Session>>,
    is_owner: Signal<bool>,
    liked: Signal<Vec<String>>,
    projects: Signal<Vec<backend::Project>>,
    mut screen: Signal<Screen>,
) -> Element {
    let mut email = use_signal(String::new);
    let mut password = use_signal(String::new);
    let mut username = use_signal(String::new);
    let mut busy = use_signal(|| false);
    let mut notice = use_signal(String::new);

    rsx! {
        section { class: "auth-page",
            div { class: "auth-shell utility-card",
                aside { class: "auth-aside",
                    img { class: "auth-logo", src: asset!("/assets/alchemy-logo.png"), alt: "" }
                    p { class: "auth-eyebrow", "OVERDRIVE BOX" }
                    h2 { "Lo que estoy construyendo, en un solo lugar." }
                    ul { class: "auth-points",
                        li { "Da ♥ a los proyectos que te gusten." }
                        li { "Tus likes se comparten con todos." }
                        li { "Acceso seguro con Supabase." }
                    }
                }
                form {
                    class: "auth-form",
                    onsubmit: move |event| async move {
                        event.prevent_default();
                        busy.set(true);
                        notice.set(String::new());
                        let result: Result<Option<backend::Session>, String> = if signup() {
                            backend::sign_up(&email(), &password(), &clean_username(&username())).await
                        } else {
                            backend::sign_in(&email(), &password()).await.map(Some)
                        };
                        match result {
                            Ok(Some(auth)) => {
                                let token = auth.access_token.clone();
                                let user_id = auth.user.id.clone();
                                if let Ok(json) = serde_json::to_string(&auth)
                                    && let Ok(literal) = serde_json::to_string(&json)
                                {
                                    let _ = document::eval(&format!(
                                        "localStorage.setItem('od-rust-session', {literal})"
                                    ))
                                    .await;
                                }
                                session.set(Some(auth));
                                hydrate_user_data(token, user_id, is_owner, liked, projects);
                                screen.set(Screen::Home);
                            }
                            Ok(None) => {
                                notice.set("Cuenta creada. Confirma tu correo para entrar.".into());
                                signup.set(false);
                            }
                            Err(error) => notice.set(error),
                        }
                        busy.set(false);
                    },
                    h1 { if signup() { "Crea tu cuenta" } else { "Inicia sesión" } }
                    p {
                        if signup() {
                            "La primera cuenta registrada será la dueña del sitio."
                        } else {
                            "Entra para dar ♥ y acceder a las funciones de tu cuenta."
                        }
                    }
                    if signup() {
                        label { class: "auth-field", "Nombre público",
                            input {
                                value: "{username}",
                                maxlength: "30",
                                autocomplete: "username",
                                oninput: move |event| username.set(event.value()),
                            }
                        }
                    }
                    label { class: "auth-field", "Correo",
                        input {
                            r#type: "email",
                            value: "{email}",
                            placeholder: "tu@correo.com",
                            required: true,
                            autocomplete: "email",
                            oninput: move |event| email.set(event.value()),
                        }
                    }
                    label { class: "auth-field", "Contraseña",
                        input {
                            r#type: "password",
                            value: "{password}",
                            placeholder: "Mínimo 6 caracteres",
                            minlength: "6",
                            required: true,
                            autocomplete: if signup() { "new-password" } else { "current-password" },
                            oninput: move |event| password.set(event.value()),
                        }
                    }
                    if !notice().is_empty() {
                        p { class: "form-error", role: "alert", "{notice}" }
                    }
                    button { class: "save-button auth-submit", disabled: busy(),
                        if busy() { "Un momento…" } else if signup() { "Crear cuenta" } else { "Entrar" }
                    }
                    button {
                        r#type: "button",
                        class: "ghost-button",
                        onclick: move |_| {
                            signup.set(!signup());
                            notice.set(String::new());
                        },
                        if signup() { "Ya tengo cuenta" } else { "Crear cuenta" }
                    }
                    button {
                        r#type: "button",
                        class: "ghost-button",
                        onclick: move |_| screen.set(Screen::Home),
                        "Volver al inicio"
                    }
                }
            }
        }
    }
}

#[component]
fn NewProjectScreen(
    session: Signal<Option<backend::Session>>,
    is_owner: Signal<bool>,
    mut projects: Signal<Vec<backend::Project>>,
    mut screen: Signal<Screen>,
) -> Element {
    let mut title = use_signal(String::new);
    let mut summary = use_signal(String::new);
    let mut body = use_signal(String::new);
    let mut kind = use_signal(|| "post".to_string());
    let mut links_raw = use_signal(String::new);
    let mut tags_raw = use_signal(String::new);
    let mut cover = use_signal(|| None::<backend::UploadFile>);
    let mut media = use_signal(Vec::<backend::UploadFile>::new);
    let mut draft = use_signal(|| false);
    let mut busy = use_signal(|| false);
    let mut notice = use_signal(String::new);

    rsx! {
        form {
            class: "utility-card form-card wide",
            onsubmit: move |event| async move {
                event.prevent_default();
                let Some(auth) = session() else {
                    notice.set("Inicia sesión para publicar.".into());
                    screen.set(Screen::Login);
                    return;
                };
                if !is_owner() {
                    notice.set("Solo la cuenta dueña puede publicar.".into());
                    return;
                }
                if title().trim().is_empty() {
                    notice.set("Ponle un título.".into());
                    return;
                }
                let clean_links: Vec<String> = links_raw().split_whitespace().map(str::to_owned).collect();
                if clean_links.iter().any(|url| !(url.starts_with("https://") || url.starts_with("http://"))) {
                    notice.set("Los enlaces deben empezar con http:// o https://".into());
                    return;
                }
                busy.set(true);
                notice.set(String::new());
                let payload = backend::ProjectDraft {
                    kind: kind(),
                    title: title().trim().chars().take(120).collect(),
                    summary: summary().trim().chars().take(300).collect(),
                    body: body().chars().take(20_000).collect(),
                    links: clean_links,
                    tags: tags_raw()
                        .split(',')
                        .map(str::trim)
                        .filter(|tag| !tag.is_empty())
                        .take(8)
                        .map(str::to_lowercase)
                        .collect(),
                    draft: draft(),
                    cover: cover.take(),
                    media: media.take(),
                };
                match backend::create_project(payload, &auth, &username_for(&auth)).await {
                    Ok(_) => {
                        if let Ok(data) = backend::fetch_projects(Some(&auth.access_token)).await {
                            projects.set(data);
                        }
                        title.set(String::new());
                        summary.set(String::new());
                        body.set(String::new());
                        links_raw.set(String::new());
                        tags_raw.set(String::new());
                        notice.set("Publicación guardada.".into());
                        screen.set(Screen::Home);
                    }
                    Err(error) => notice.set(error),
                }
                busy.set(false);
            },
            div { class: "utility-heading", div { span { class: "section-kicker", "PUBLICAR" } h2 { "Nueva publicación" } } }
            label { "Tipo",
                select { value: "{kind}", onchange: move |event| kind.set(event.value()),
                    option { value: "app", "Proyecto" }
                    option { value: "video", "Video" }
                    option { value: "anuncio", "Anuncio" }
                    option { value: "post", "Post" }
                    option { value: "beta", "Beta" }
                    option { value: "demo", "Demo" }
                    option { value: "avance", "Avance" }
                    option { value: "link", "Link" }
                    option { value: "short", "Short" }
                }
            }
            label { "Título", input { value: "{title}", maxlength: "120", required: true, oninput: move |event| title.set(event.value()) } }
            label { "Resumen", input { value: "{summary}", maxlength: "300", oninput: move |event| summary.set(event.value()) } }
            label { "Descripción", textarea { value: "{body}", maxlength: "20000", oninput: move |event| body.set(event.value()) } }
            label { "Portada (imagen, máximo 5 MB)",
                input {
                    r#type: "file",
                    accept: "image/*",
                    onchange: move |event| async move {
                        if let Some(file) = event.files().into_iter().next() {
                            if file.size() > 5 * 1024 * 1024 {
                                notice.set("La portada no puede superar 5 MB.".into());
                            } else if !file.content_type().unwrap_or_default().starts_with("image/") {
                                notice.set("La portada debe ser una imagen.".into());
                            } else {
                                match file.read_bytes().await {
                                    Ok(bytes) => {
                                        cover.set(Some(backend::UploadFile {
                                            name: file.name(),
                                            content_type: file.content_type().unwrap_or_else(|| "image/jpeg".into()),
                                            bytes: bytes.to_vec(),
                                        }));
                                        notice.set(String::new());
                                    }
                                    Err(error) => notice.set(error.to_string()),
                                }
                            }
                        }
                    }
                }
            }
            label { "Galería (hasta 6 imágenes o videos)",
                input {
                    r#type: "file",
                    accept: "image/*,video/*",
                    multiple: true,
                    onchange: move |event| async move {
                        let selected = event.files();
                        if selected.len() > 6 {
                            notice.set("La galería admite hasta 6 archivos.".into());
                            return;
                        }
                        let mut files = Vec::with_capacity(selected.len());
                        for file in selected {
                            let media_type = file.content_type().unwrap_or_default();
                            let limit = if media_type.starts_with("image/") {
                                5 * 1024 * 1024
                            } else if media_type.starts_with("video/") {
                                100 * 1024 * 1024
                            } else {
                                notice.set("Solo se permiten imágenes o videos.".into());
                                return;
                            };
                            if file.size() > limit {
                                notice.set(format!("{} supera el límite de tamaño.", file.name()));
                                return;
                            }
                            match file.read_bytes().await {
                                Ok(bytes) => files.push(backend::UploadFile {
                                    name: file.name(),
                                    content_type: media_type,
                                    bytes: bytes.to_vec(),
                                }),
                                Err(error) => {
                                    notice.set(error.to_string());
                                    return;
                                }
                            }
                        }
                        media.set(files);
                        notice.set(String::new());
                    }
                }
            }
            if !notice().is_empty() {
                p { class: "form-hint", "{notice}" }
            }
            label { "Enlaces (separados por espacios)",
                input { value: "{links_raw}", placeholder: "https://...", oninput: move |event| links_raw.set(event.value()) }
            }
            label { "Tags (separados por comas)",
                input { value: "{tags_raw}", placeholder: "juego, arte", oninput: move |event| tags_raw.set(event.value()) }
            }
            div { class: "form-actions",
                button { r#type: "button", class: "ghost-button", onclick: move |_| screen.set(Screen::Home), "Cancelar" }
                button { r#type: "submit", class: "ghost-button", disabled: busy(), onclick: move |_| draft.set(true), "Guardar borrador" }
                button { r#type: "submit", class: "save-button", disabled: busy(), onclick: move |_| draft.set(false),
                    if busy() { "Subiendo…" } else { "Publicar" }
                }
            }
        }
    }
}

#[component]
fn DetailScreen(
    selected_id: Signal<String>,
    projects: Signal<Vec<backend::Project>>,
    session: Signal<Option<backend::Session>>,
    is_owner: Signal<bool>,
    liked: Signal<Vec<String>>,
    mut data_error: Signal<String>,
    signup: Signal<bool>,
    mut screen: Signal<Screen>,
) -> Element {
    let mut update_text = use_signal(String::new);
    let mut updates = use_signal(Vec::<backend::ProjectUpdate>::new);

    use_effect(move || {
        let project_id = selected_id();
        if project_id.is_empty() || project_id.starts_with("demo-") || !backend::is_configured() {
            updates.set(Vec::new());
            return;
        }
        let token = session().map(|auth| auth.access_token);
        spawn(async move {
            match backend::fetch_updates(&project_id, token.as_deref()).await {
                Ok(data) => updates.set(data),
                Err(error) => data_error.set(error),
            }
        });
    });

    let project = projects
        .read()
        .iter()
        .find(|project| project.id == selected_id())
        .cloned();

    let Some(project) = project else {
        return rsx! {
            section { class: "utility-card pub-empty",
                h2 { "No encontramos esa publicación" }
                button { class: "ghost-button", onclick: move |_| screen.set(Screen::Home), "Volver" }
            }
        };
    };

    let project_id = project.id.clone();

    rsx! {
        article { class: "project-page",
            nav { class: "crumbs", aria_label: "Ruta",
                button { class: "crumb-back", onclick: move |_| screen.set(Screen::Home), "← Volver" }
            }
            section { class: "project-hero utility-card",
                if let Some(url) = project.cover_url.as_deref() {
                    img { class: "project-cover", src: "{url}", alt: "" }
                }
                div { class: "project-info",
                    span { class: "pub-badge", "{kind_label(&project.kind).to_uppercase()}" }
                    h1 { class: "pub-title", "{project.title}" }
                    p { class: "pub-lead", "{project.summary}" }
                    p { class: "pub-byline", "Por @{project.author_username}" }
                    if !project.tags.is_empty() {
                        p { class: "item-tags", for tag in project.tags.iter() { i { "#{tag} " } } }
                    }
                    if !project.links.is_empty() {
                        div { class: "pub-links",
                            for url in project.links.iter() {
                                a { class: "launcher-pill", href: "{url}", target: "_blank", rel: "noopener noreferrer", "{url}" }
                            }
                        }
                    }
                    div { class: "pub-actions",
                        button {
                            class: if liked().contains(&project.id) { "like-btn is-liked" } else { "like-btn" },
                            onclick: move |_| {
                                trigger_toggle_like(
                                    project_id.clone(),
                                    session,
                                    liked,
                                    projects,
                                    data_error,
                                    signup,
                                    screen,
                                );
                            },
                            "♥ {project.likes}"
                        }
                    }
                }
            }
            if !project.body.is_empty() {
                section { class: "utility-card pub-article",
                    h2 { "Descripción" }
                    div { class: "pub-body", "{project.body}" }
                }
            }
            if !project.media_urls.is_empty() {
                section { class: "utility-card pub-article",
                    h2 { "Galería" }
                    div { class: "pub-gallery",
                        for url in project.media_urls.iter() {
                            if url.ends_with(".mp4") || url.ends_with(".webm") || url.ends_with(".mov") {
                                video { class: "pub-media", src: "{url}", controls: true }
                            } else {
                                img { class: "pub-media", src: "{url}", alt: "", loading: "lazy" }
                            }
                        }
                    }
                }
            }
            section { class: "utility-card pub-article",
                h2 { "Avances" }
                if is_owner() && session().is_some() {
                    form {
                        class: "task-entry",
                        onsubmit: move |event| async move {
                            event.prevent_default();
                            let Some(auth) = session() else { return; };
                            let text = update_text().trim().to_owned();
                            if text.is_empty() { return; }
                            let current_id = selected_id();
                            match backend::add_update(&current_id, &text, &auth).await {
                                Ok(()) => {
                                    update_text.set(String::new());
                                    if let Ok(data) = backend::fetch_updates(&current_id, Some(&auth.access_token)).await {
                                        updates.set(data);
                                    }
                                }
                                Err(error) => data_error.set(error),
                            }
                        },
                        input {
                            value: "{update_text}",
                            maxlength: "2000",
                            placeholder: "Cuenta un avance…",
                            oninput: move |event| update_text.set(event.value()),
                        }
                        button { r#type: "submit", aria_label: "Publicar avance", "＋" }
                    }
                }
                if updates().is_empty() {
                    p { class: "side-empty", "Sin avances todavía." }
                } else {
                    div { class: "update-list",
                        for update in updates() {
                            div { class: "update-item",
                                time { "{update.created_at}" }
                                p { "{update.text}" }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn PublicationCard(
    item: Publication,
    liked: Signal<Vec<String>>,
    session: Signal<Option<backend::Session>>,
    projects: Signal<Vec<backend::Project>>,
    data_error: Signal<String>,
    signup: Signal<bool>,
    mut screen: Signal<Screen>,
    mut selected_id: Signal<String>,
) -> Element {
    let like_id = item.id.clone();
    let detail_id = item.id.clone();
    let liked_state = liked().contains(&item.id);
    rsx! {
        article { class: "project-card utility-card",
            if let Some(url) = item.cover_url.as_deref() {
                img { class: "item-cover", src: "{url}", alt: "", loading: "lazy" }
            } else {
                div { class: "item-cover", "aria-hidden": "true",
                    "{item.title.chars().take(2).collect::<String>().to_uppercase()}"
                }
            }
            div { class: "item-content",
                span { class: "pub-badge", "{kind_label(&item.kind)}" }
                h3 { "{item.title}" }
                p { "{item.summary}" }
                div { class: "pub-actions",
                    button {
                        class: if liked_state { "like-btn is-liked" } else { "like-btn" },
                        onclick: move |_| {
                            trigger_toggle_like(
                                like_id.clone(),
                                session,
                                liked,
                                projects,
                                data_error,
                                signup,
                                screen,
                            );
                        },
                        "♥ {item.likes}"
                    }
                    button {
                        class: "ghost-button",
                        onclick: move |_| {
                            selected_id.set(detail_id.clone());
                            screen.set(Screen::Detail);
                        },
                        "Ver publicación"
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cleans_username_and_strips_domain() {
        assert_eq!(clean_username("  alchemy.dev@example.com "), "alchemy.dev");
        assert_eq!(clean_username("user!@#$%_name"), "user");
        assert_eq!(clean_username(&"a".repeat(50)).len(), 30);
    }

    #[test]
    fn maps_kind_labels() {
        assert_eq!(kind_label("app"), "Proyectos");
        assert_eq!(kind_label("video"), "Videos");
        assert_eq!(kind_label("unknown"), "Publicación");
    }

    #[test]
    fn filters_and_sorts_demo_publications() {
        let all = filter_publications(&[], false, "", "", false);
        assert_eq!(all.len(), DEMO_PUBLICATIONS.len());

        let projects_only = filter_publications(&[], false, "proyectos", "", false);
        assert_eq!(projects_only.len(), 1);
        assert_eq!(projects_only[0].kind, "app");

        let sorted = filter_publications(&[], false, "", "", true);
        assert!(sorted.windows(2).all(|pair| pair[0].likes >= pair[1].likes));
    }
}
