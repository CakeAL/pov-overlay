use base64::{Engine, engine::general_purpose::STANDARD};
use serde::Serialize;
use std::{fs, path::Path};
#[derive(Serialize)]
pub struct ImageAsset { pub name:String, pub url:String }
pub fn import_image(path:&Path)->Result<ImageAsset,String>{
 let extension=path.extension().and_then(|value|value.to_str()).unwrap_or("").to_lowercase();
 let mime=match extension.as_str(){"png"=>"image/png","jpg"|"jpeg"=>"image/jpeg","webp"=>"image/webp","gif"=>"image/gif","avif"=>"image/avif",_=>return Err("请选择 PNG、JPEG、WebP、GIF 或 AVIF 图片。".into())};
 if fs::metadata(path).map_err(|error|error.to_string())?.len()>20*1024*1024{return Err("背景图不能超过 20 MB。".into());}
 let bytes=fs::read(path).map_err(|error|error.to_string())?;
 Ok(ImageAsset{name:path.file_name().unwrap_or_default().to_string_lossy().into_owned(),url:format!("data:{mime};base64,{}",STANDARD.encode(bytes))})
}
