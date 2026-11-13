use serde::{Deserialize, Serialize, de::DeserializeOwned};
use std::sync::OnceLock;

static HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn client() -> &'static reqwest::Client {
    HTTP_CLIENT.get_or_init(reqwest::Client::new)
}

fn config() -> Result<(&'static str, &'static str), String> {
    let url = option_env!("OVERDRIVE_SUPABASE_URL").unwrap_or("");
    let key = option_env!("OVERDRIVE_SUPABASE_KEY").unwrap_or("");
    if url.is_empty() || key.is_empty() {
        return Err(
            "Supabase no está configurado. Completa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env y recompila."
                .into(),
        );
    }
    Ok((url.trim_end_matches('/'), key))
}

pub fn is_configured() -> bool {
    config().is_ok()
}

fn now_millis() -> Result<i64, String> {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .map_err(|error| error.to_string())
}

fn api_request(
    method: reqwest::Method,
    path: &str,
    token: Option<&str>,
) -> Result<reqwest::RequestBuilder, String> {
    let (url, key) = config()?;
    Ok(client()
        .request(method, format!("{url}{path}"))
        .header("apikey", key)
        .bearer_auth(token.unwrap_or(key)))
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct Session {
    pub access_token: String,
    pub refresh_token: String,
    pub user: AuthUser,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct AuthUser {
    pub id: String,
    pub email: Option<String>,
    #[serde(default)]
    pub user_metadata: serde_json::Value,
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
pub struct Project {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub title: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub body: String,
    pub cover_url: Option<String>,
    #[serde(default)]
    pub media_urls: Vec<String>,
    #[serde(default)]
    pub links: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub author_id: String,
    #[serde(default)]
    pub author_username: String,
    #[serde(default)]
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
    #[serde(default)]
    pub views: i32,
    #[serde(default)]
    pub likes: i32,
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
pub struct ProjectUpdate {
    pub id: String,
    pub text: String,
    pub created_at: i64,
}

#[derive(Deserialize)]
struct AuthResponse {
    access_token: String,
    refresh_token: String,
    user: AuthUser,
}

#[derive(Deserialize)]
struct LikedRow {
    project_id: String,
}

#[derive(Deserialize)]
struct ToggleLikeResponse {
    #[serde(default)]
    liked: bool,
    #[serde(default)]
    likes: i32,
}

#[derive(Clone, Default)]
pub struct UploadFile {
    pub name: String,
    pub content_type: String,
    pub bytes: Vec<u8>,
}

#[derive(Default)]
pub struct ProjectDraft {
    pub kind: String,
    pub title: String,
    pub summary: String,
    pub body: String,
    pub links: Vec<String>,
    pub tags: Vec<String>,
    pub draft: bool,
    pub cover: Option<UploadFile>,
    pub media: Vec<UploadFile>,
}

async fn decode_error(response: reqwest::Response) -> String {
    let status = response.status();
    let text = response.text().await.unwrap_or_default();
    let message = serde_json::from_str::<serde_json::Value>(&text)
        .ok()
        .and_then(|value| {
            value
                .get("msg")
                .or_else(|| value.get("message"))
                .or_else(|| value.get("error_description"))
                .and_then(serde_json::Value::as_str)
                .map(str::to_owned)
        })
        .unwrap_or(text);
    if message.is_empty() {
        format!("Error del servidor ({status}).")
    } else {
        message
    }
}

async fn ensure_success(response: reqwest::Response) -> Result<reqwest::Response, String> {
    if response.status().is_success() {
        Ok(response)
    } else {
        Err(decode_error(response).await)
    }
}

async fn send_json<T: DeserializeOwned>(builder: reqwest::RequestBuilder) -> Result<T, String> {
    let response = builder.send().await.map_err(|error| error.to_string())?;
    ensure_success(response)
        .await?
        .json()
        .await
        .map_err(|error| error.to_string())
}

async fn send_empty(builder: reqwest::RequestBuilder) -> Result<(), String> {
    let response = builder.send().await.map_err(|error| error.to_string())?;
    ensure_success(response).await?;
    Ok(())
}

pub async fn sign_in(email: &str, password: &str) -> Result<Session, String> {
    let (url, key) = config()?;
    let auth: AuthResponse = send_json(
        client()
            .post(format!("{url}/auth/v1/token?grant_type=password"))
            .header("apikey", key)
            .json(&serde_json::json!({ "email": email.trim(), "password": password })),
    )
    .await?;
    Ok(Session {
        access_token: auth.access_token,
        refresh_token: auth.refresh_token,
        user: auth.user,
    })
}

pub async fn sign_up(
    email: &str,
    password: &str,
    username: &str,
) -> Result<Option<Session>, String> {
    let (url, key) = config()?;
    let body: serde_json::Value = send_json(
        client()
            .post(format!("{url}/auth/v1/signup"))
            .header("apikey", key)
            .json(&serde_json::json!({
                "email": email.trim(),
                "password": password,
                "data": { "username": username }
            })),
    )
    .await?;
    let Some(access_token) = body.get("access_token").and_then(serde_json::Value::as_str) else {
        return Ok(None);
    };
    let refresh_token = body
        .get("refresh_token")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default();
    let user: AuthUser = serde_json::from_value(body.get("user").cloned().unwrap_or_default())
        .map_err(|error| error.to_string())?;
    Ok(Some(Session {
        access_token: access_token.to_owned(),
        refresh_token: refresh_token.to_owned(),
        user,
    }))
}

pub async fn fetch_projects(token: Option<&str>) -> Result<Vec<Project>, String> {
    let req = api_request(
        reqwest::Method::GET,
        "/rest/v1/projects?select=*&status=eq.published&order=created_at.desc&limit=100",
        token,
    )?;
    send_json(req).await
}

pub async fn toggle_like(project_id: &str, token: &str) -> Result<(bool, i32), String> {
    let req = api_request(
        reqwest::Method::POST,
        "/rest/v1/rpc/toggle_like",
        Some(token),
    )?
    .json(&serde_json::json!({ "p_project_id": project_id }));
    let data: ToggleLikeResponse = send_json(req).await?;
    Ok((data.liked, data.likes))
}

pub async fn is_owner(token: &str) -> Result<bool, String> {
    let req = api_request(reqwest::Method::POST, "/rest/v1/rpc/is_owner", Some(token))?;
    send_json(req).await
}

pub async fn fetch_liked_ids(user_id: &str, token: &str) -> Result<Vec<String>, String> {
    let req = api_request(
        reqwest::Method::GET,
        &format!("/rest/v1/project_likes?select=project_id&user_id=eq.{user_id}"),
        Some(token),
    )?;
    let rows: Vec<LikedRow> = send_json(req).await?;
    Ok(rows.into_iter().map(|row| row.project_id).collect())
}

pub async fn fetch_updates(
    project_id: &str,
    token: Option<&str>,
) -> Result<Vec<ProjectUpdate>, String> {
    let req = api_request(
        reqwest::Method::GET,
        &format!(
            "/rest/v1/project_updates?select=id,text,created_at&project_id=eq.{project_id}&order=created_at.desc"
        ),
        token,
    )?;
    send_json(req).await
}

pub async fn add_update(project_id: &str, text: &str, session: &Session) -> Result<(), String> {
    let now = now_millis()?;
    let req = api_request(
        reqwest::Method::POST,
        "/rest/v1/project_updates",
        Some(&session.access_token),
    )?
    .header("Prefer", "return=minimal")
    .json(&serde_json::json!({
        "project_id": project_id,
        "text": text,
        "created_at": now
    }));
    send_empty(req).await
}

async fn upload_file(
    url: &str,
    key: &str,
    session: &Session,
    project_id: &str,
    now: i64,
    file: UploadFile,
) -> Result<String, String> {
    let safe_name: String = file
        .name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_') {
                c
            } else {
                '_'
            }
        })
        .collect();
    let path = format!("users/{}/projects/{project_id}/{now}-{safe_name}", session.user.id);
    let req = client()
        .post(format!("{url}/storage/v1/object/media/{path}"))
        .header("apikey", key)
        .bearer_auth(&session.access_token)
        .header("Content-Type", &file.content_type)
        .header("x-upsert", "true")
        .body(file.bytes);
    send_empty(req).await?;
    Ok(format!("{url}/storage/v1/object/public/media/{path}"))
}

pub async fn create_project(
    project: ProjectDraft,
    session: &Session,
    username: &str,
) -> Result<String, String> {
    let (url, key) = config()?;
    let now = now_millis()?;
    let project_id = uuid::Uuid::new_v4().to_string();
    let cover_url = match project.cover {
        Some(file) => Some(upload_file(url, key, session, &project_id, now, file).await?),
        None => None,
    };
    let mut media_urls = Vec::with_capacity(project.media.len());
    for file in project.media {
        media_urls.push(upload_file(url, key, session, &project_id, now, file).await?);
    }
    let req = api_request(
        reqwest::Method::POST,
        "/rest/v1/projects",
        Some(&session.access_token),
    )?
    .header("Prefer", "return=minimal")
    .json(&serde_json::json!({
        "id": project_id,
        "type": project.kind,
        "title": project.title,
        "summary": project.summary,
        "body": project.body,
        "cover_url": cover_url,
        "media_urls": media_urls,
        "links": project.links,
        "tags": project.tags,
        "author_id": session.user.id,
        "author_username": username,
        "status": if project.draft { "draft" } else { "published" },
        "created_at": now,
        "updated_at": now,
        "views": 0,
        "likes": 0
    }));
    send_empty(req).await?;
    Ok(project_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_project_with_defaults() {
        let json = r#"{
            "id": "p1",
            "type": "app",
            "title": "Overdrive",
            "cover_url": null,
            "author_id": "u1",
            "created_at": 1700000000,
            "updated_at": 1700000000
        }"#;
        let project: Project = serde_json::from_str(json).expect("valid project json");
        assert_eq!(project.id, "p1");
        assert_eq!(project.kind, "app");
        assert_eq!(project.likes, 0);
        assert!(project.tags.is_empty());
    }

    #[test]
    fn deserializes_liked_row_and_toggle_response() {
        let rows: Vec<LikedRow> =
            serde_json::from_str(r#"[{"project_id":"a"},{"project_id":"b"}]"#).unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].project_id, "a");

        let toggle: ToggleLikeResponse =
            serde_json::from_str(r#"{"liked":true,"likes":42}"#).unwrap();
        assert!(toggle.liked);
        assert_eq!(toggle.likes, 42);
    }
}
