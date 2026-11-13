fn main() {
    println!("cargo:rerun-if-changed=.env");
    if let Ok(contents) = std::fs::read_to_string(".env") {
        for line in contents.lines() {
            let Some((key, value)) = line.split_once('=') else { continue; };
            let target = match key.trim() {
                "VITE_SUPABASE_URL" => "OVERDRIVE_SUPABASE_URL",
                "VITE_SUPABASE_PUBLISHABLE_KEY" => "OVERDRIVE_SUPABASE_KEY",
                _ => continue,
            };
            let value = value.trim().trim_matches(['"', '\'']);
            println!("cargo:rustc-env={target}={value}");
        }
    }
}
