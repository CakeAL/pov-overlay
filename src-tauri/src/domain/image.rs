use serde::Serialize;
#[derive(Serialize)]
pub struct ImageAsset {
    pub name: String,
    pub url: String,
}
