require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();
const DEFAULT_ADMIN_MOBILE = "8270003472";
const PORT = process.env.PORT || 3000;
const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_MB || 100) * 1024 * 1024;

if(process.env.NODE_ENV === "production"){
app.set("trust proxy",1);
}

function isDefaultAdminMobile(mobile){
return String(mobile || "").trim() === DEFAULT_ADMIN_MOBILE;
}

function requireAdmin(req,res,next){
if(req.session && req.session.isAdmin){
return next();
}

return res.status(401).json({
message:"Please login again"
});
}

app.use(cors());
app.use(bodyParser.json({ limit:"25mb" }));
app.use(bodyParser.urlencoded({ extended:true,limit:"25mb" }));
app.use(session({
secret:process.env.SESSION_SECRET || "change-this-session-secret-before-hosting",
resave:false,
saveUninitialized:false,
cookie:{
httpOnly:true,
sameSite:"lax",
secure:process.env.NODE_ENV === "production"
}
}));

// ======================
// MYSQL CONNECTION
// ======================

const db = mysql.createConnection({
host:process.env.DB_HOST || "localhost",
user:process.env.DB_USER || "root",
password:process.env.DB_PASSWORD || "",
database:process.env.DB_NAME || "my_project"
});

db.connect((err)=>{

if(err){
console.log("DB Failed",err);
}else{
console.log("MySQL Connected");

function ensureColumn(table,column,definition){
db.query(
`SHOW COLUMNS FROM ${table} LIKE ?`,
[column],
(showErr,result)=>{

if(showErr){
console.log(`Column check failed: ${table}.${column}`,showErr);
return;
}

if(result.length>0){
return;
}

db.query(
`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
(alterErr)=>{

if(alterErr){
console.log(`Column add failed: ${table}.${column}`,alterErr);
}

}
);

}
);
}

db.query(`
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS posX INT DEFAULT 0
`,()=>{});

db.query(`
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS posY INT DEFAULT 0
`,()=>{});

db.query(`
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS scale FLOAT DEFAULT 1
`,()=>{});

ensureColumn("site_settings","fontStyle","VARCHAR(80) DEFAULT 'Poppins'");
ensureColumn("site_settings","aboutTitle","VARCHAR(255) DEFAULT NULL");
ensureColumn("site_settings","aboutText","TEXT DEFAULT NULL");

db.query(`
ALTER TABLE hero_slides
ADD COLUMN IF NOT EXISTS posX INT DEFAULT 0
`,()=>{});

db.query(`
ALTER TABLE hero_slides
ADD COLUMN IF NOT EXISTS posY INT DEFAULT 0
`,()=>{});

db.query(`
ALTER TABLE hero_slides
ADD COLUMN IF NOT EXISTS scale FLOAT DEFAULT 1
`,()=>{});

db.query(`
ALTER TABLE hero_slides
ADD COLUMN IF NOT EXISTS mobilePosX INT DEFAULT NULL
`,()=>{});

db.query(`
ALTER TABLE hero_slides
ADD COLUMN IF NOT EXISTS mobilePosY INT DEFAULT NULL
`,()=>{});

db.query(`
ALTER TABLE hero_slides
ADD COLUMN IF NOT EXISTS mobileScale FLOAT DEFAULT NULL
`,()=>{});

db.query(`
ALTER TABLE hero_slides
ADD COLUMN IF NOT EXISTS desktopPosX INT DEFAULT NULL
`,()=>{});

db.query(`
ALTER TABLE hero_slides
ADD COLUMN IF NOT EXISTS desktopPosY INT DEFAULT NULL
`,()=>{});

db.query(`
ALTER TABLE hero_slides
ADD COLUMN IF NOT EXISTS desktopScale FLOAT DEFAULT NULL
`,()=>{});

ensureColumn("hero_slides","mobilePosX","INT DEFAULT NULL");
ensureColumn("hero_slides","mobilePosY","INT DEFAULT NULL");
ensureColumn("hero_slides","mobileScale","FLOAT DEFAULT NULL");
ensureColumn("hero_slides","desktopPosX","INT DEFAULT NULL");
ensureColumn("hero_slides","desktopPosY","INT DEFAULT NULL");
ensureColumn("hero_slides","desktopScale","FLOAT DEFAULT NULL");
ensureColumn("photos","featured","INT DEFAULT 0");
ensureColumn("photos","featuredOrder","INT DEFAULT 0");
ensureColumn("users","mobile","VARCHAR(20) DEFAULT NULL");

db.query(
`
UPDATE users
SET mobile=?
WHERE mobile IS NULL OR mobile=''
`,
[DEFAULT_ADMIN_MOBILE],
()=>{}
);

db.query(`
CREATE TABLE IF NOT EXISTS category_covers (
category VARCHAR(255) PRIMARY KEY,
photoId INT NOT NULL
)
`,()=>{});

db.query(`
CREATE TABLE IF NOT EXISTS password_otps (
mobile VARCHAR(20) PRIMARY KEY,
otp VARCHAR(6) NOT NULL,
expiresAt BIGINT NOT NULL,
verified INT DEFAULT 0
)
`,()=>{});

}

});

// ======================
// UPLOADS FOLDER
// ======================

if(!fs.existsSync("uploads")){
fs.mkdirSync("uploads");
}

["gallery","videos"].forEach(folder=>{
const folderPath = path.join(__dirname,"uploads",folder);

if(!fs.existsSync(folderPath)){
fs.mkdirSync(folderPath);
}
});

app.use(
"/uploads",
express.static(path.join(__dirname,"uploads"))
);

app.use(
"/assets",
express.static(path.join(__dirname,"assets"))
);

app.use(
"/images",
express.static(path.join(__dirname,"images"))
);

app.get("/",(req,res)=>{
res.sendFile(path.join(__dirname,"index.html"));
});

app.get([
"/index.html",
"/booking.html",
"/career.html",
"/client-gallery.html",
"/reels.html",
"/style.css",
"/public-header.js",
"/error-handler.js"
],(req,res)=>{
res.sendFile(path.join(__dirname,req.path));
});

app.use(
"/admin",
function(req,res,next){

const page =
String(req.path || "").toLowerCase();

if(page === "/login.html" || page === "/" || req.session?.isAdmin){
return next();
}

return res.redirect("/admin/login.html");

},
express.static(path.join(__dirname,"admin"))
);

// ======================
// LOGIN
// ======================

app.post("/login",(req,res)=>{

const { username,password } = req.body;

db.query(
"SELECT * FROM users WHERE username=? LIMIT 1",
[username],
(err,result)=>{

if(err){
return res.status(500).json(err);
}

if(result.length===0){
return res.json({
login:false,
message:"Invalid credentials"
});
}

const user =
result[0];

const storedPassword =
String(user.password || "");

const finishLogin = ()=>{
req.session.isAdmin = true;
req.session.username = user.username;

res.json({
login:true,
message:"Login success"
});
};

if(storedPassword.startsWith("$2")){
bcrypt.compare(
String(password || ""),
storedPassword,
(compareErr,match)=>{

if(compareErr){
return res.status(500).json(compareErr);
}

if(!match){
return res.json({
login:false,
message:"Invalid credentials"
});
}

finishLogin();

}
);

return;
}

if(storedPassword !== String(password || "")){
return res.json({
login:false,
message:"Invalid credentials"
});
}

bcrypt.hash(
String(password || ""),
10,
(hashErr,hash)=>{

if(!hashErr){
db.query(
"UPDATE users SET password=? WHERE username=?",
[hash,user.username],
()=>{}
);
}

finishLogin();

}
);

}
);

});

// ======================
// FORGOT PASSWORD OTP
// ======================

app.post("/forgot-password/send-otp",(req,res)=>{

const mobile =
String(req.body.mobile || "").trim();

if(!mobile){
return res.status(400).json({
message:"Enter mobile number"
});
}

db.query(
`
SELECT *
FROM users
WHERE mobile=?
LIMIT 1
`,
[mobile],
(err,result)=>{

if(err){
return res.status(500).json(err);
}

if(result.length===0 && !isDefaultAdminMobile(mobile)){
return res.status(404).json({
message:"Mobile number not found"
});
}

const otp =
String(Math.floor(100000 + Math.random() * 900000));

const expiresAt =
Date.now() + (5 * 60 * 1000);

db.query(
`
REPLACE INTO password_otps
(
mobile,
otp,
expiresAt,
verified
)
VALUES
(
?,
?,
?,
0
)
`,
[
mobile,
otp,
expiresAt
],
(otpErr)=>{

if(otpErr){
return res.status(500).json(otpErr);
}

console.log(`Password reset OTP for ${mobile}: ${otp}`);

res.json({
message:"OTP sent to registered mobile number",
devOtp:otp
});

}
);

}
);

});

app.post("/forgot-password/verify-otp",(req,res)=>{

const mobile =
String(req.body.mobile || "").trim();

const otp =
String(req.body.otp || "").trim();

db.query(
`
SELECT *
FROM password_otps
WHERE mobile=?
AND otp=?
LIMIT 1
`,
[
mobile,
otp
],
(err,result)=>{

if(err){
return res.status(500).json(err);
}

if(result.length===0 || Number(result[0].expiresAt) < Date.now()){
return res.status(400).json({
message:"Invalid or expired OTP"
});
}

db.query(
`
UPDATE password_otps
SET verified=1
WHERE mobile=?
`,
[mobile],
(updateErr)=>{

if(updateErr){
return res.status(500).json(updateErr);
}

res.json({
message:"OTP verified"
});

}
);

}
);

});

app.post("/forgot-password/reset",(req,res)=>{

const mobile =
String(req.body.mobile || "").trim();

const newPassword =
String(req.body.newPassword || "").trim();

if(!newPassword){
return res.status(400).json({
message:"Enter new password"
});
}

db.query(
`
SELECT *
FROM password_otps
WHERE mobile=?
AND verified=1
AND expiresAt>=?
LIMIT 1
`,
[
mobile,
Date.now()
],
(err,result)=>{

if(err){
return res.status(500).json(err);
}

if(result.length===0){
return res.status(400).json({
message:"Please verify OTP first"
});
}

bcrypt.hash(
newPassword,
10,
(hashErr,hashedPassword)=>{

if(hashErr){
return res.status(500).json(hashErr);
}

db.query(
`
UPDATE users
SET password=?
WHERE mobile=?
`,
[
hashedPassword,
mobile
],
(updateErr,updateResult)=>{

if(updateErr){
return res.status(500).json(updateErr);
}

if(updateResult.affectedRows===0 && isDefaultAdminMobile(mobile)){
return db.query(
`
UPDATE users
SET password=?,
mobile=?
LIMIT 1
`,
[
hashedPassword,
DEFAULT_ADMIN_MOBILE
],
(fallbackErr,fallbackResult)=>{

if(fallbackErr){
return res.status(500).json(fallbackErr);
}

if(fallbackResult.affectedRows===0){
return res.status(404).json({
message:"Admin account not found"
});
}

db.query(
`
DELETE FROM password_otps
WHERE mobile=?
`,
[mobile],
()=>{}
);

res.json({
message:"Password changed successfully"
});

}
);
}

db.query(
`
DELETE FROM password_otps
WHERE mobile=?
`,
[mobile],
()=>{}
);

res.json({
message:"Password changed successfully"
});

}
);

}
);

}
);

});

app.post("/logout",(req,res)=>{

req.session.destroy(()=>{
res.json({
message:"Logged out"
});
});

});

app.use((req,res,next)=>{

if(["POST","PUT","DELETE"].includes(req.method)){
return requireAdmin(req,res,next);
}

return next();

});

// ======================
// MULTER STORAGE
// ======================

const storage = multer.diskStorage({

destination:(req,file,cb)=>{
cb(null,"uploads/");
},

filename:(req,file,cb)=>{
cb(null,Date.now() + "-" + file.originalname);
}

});

const upload = multer({
storage,
limits:{
fileSize:MAX_UPLOAD_SIZE
}
});

const mediaStorage = multer.diskStorage({

destination:(req,file,cb)=>{
const subfolder =
file.mimetype.startsWith("video") ? "videos" : "gallery";
file.uploadSubfolder = subfolder;
cb(null,path.join("uploads",subfolder));
},

filename:(req,file,cb)=>{
const savedName = Date.now() + "-" + file.originalname;
file.relativeFilename = file.uploadSubfolder + "/" + savedName;
cb(null,savedName);
}

});

const mediaUpload = multer({
storage:mediaStorage,
limits:{
fileSize:MAX_UPLOAD_SIZE
}
});

function getImageSize(filePath){
const buffer = fs.readFileSync(filePath);

if(
buffer.length > 24 &&
buffer[0] === 0x89 &&
buffer[1] === 0x50 &&
buffer[2] === 0x4e &&
buffer[3] === 0x47
){
return {
width:buffer.readUInt32BE(16),
height:buffer.readUInt32BE(20)
};
}

if(buffer.length > 10 && buffer[0] === 0xff && buffer[1] === 0xd8){
let offset = 2;

while(offset < buffer.length){
if(buffer[offset] !== 0xff){
offset++;
continue;
}

const marker = buffer[offset + 1];
const length = buffer.readUInt16BE(offset + 2);

if(
(marker >= 0xc0 && marker <= 0xc3) ||
(marker >= 0xc5 && marker <= 0xc7) ||
(marker >= 0xc9 && marker <= 0xcb) ||
(marker >= 0xcd && marker <= 0xcf)
){
return {
height:buffer.readUInt16BE(offset + 5),
width:buffer.readUInt16BE(offset + 7)
};
}

offset += 2 + length;
}
}

if(
buffer.length > 30 &&
buffer.toString("ascii",0,4) === "RIFF" &&
buffer.toString("ascii",8,12) === "WEBP"
){
const format = buffer.toString("ascii",12,16);

if(format === "VP8X"){
return {
width:1 + buffer.readUIntLE(24,3),
height:1 + buffer.readUIntLE(27,3)
};
}

if(format === "VP8 " && buffer.length > 30){
return {
width:buffer.readUInt16LE(26) & 0x3fff,
height:buffer.readUInt16LE(28) & 0x3fff
};
}

if(format === "VP8L" && buffer.length > 25){
const bits = buffer.readUInt32LE(21);

return {
width:(bits & 0x3fff) + 1,
height:((bits >> 14) & 0x3fff) + 1
};
}
}

return null;
}

function deleteUploadedFiles(files){
files.forEach(file=>{
const filePath = path.join(__dirname,"uploads",file.filename);

if(fs.existsSync(filePath)){
fs.unlinkSync(filePath);
}
});
}

function validateHeroFilesAreCinematic(files){
for(const file of files){
const filePath = path.join(__dirname,"uploads",file.filename);
const size = getImageSize(filePath);

if(!size){
return false;
}
}

return true;
}

// ======================
// LOGO STORAGE
// ======================

const logoStorage = multer.diskStorage({

destination:(req,file,cb)=>{
cb(null,"uploads/");
},

filename:(req,file,cb)=>{
const ext = path.extname(file.originalname || "") || ".png";
cb(null,`logo-${Date.now()}${ext}`);
}

});

const logoUpload = multer({
storage:logoStorage,
limits:{
fileSize:MAX_UPLOAD_SIZE
}
});

// ======================
// UPLOAD LOGO
// ======================

app.post("/upload-logo",requireAdmin,logoUpload.single("logo"),(req,res)=>{

if(!req.file){
return res.status(400).json({
message:"No logo selected"
});
}

const finalLogoPath = path.join(__dirname,"uploads","logo.png");

try{
if(fs.existsSync(finalLogoPath)){
fs.unlinkSync(finalLogoPath);
}

fs.renameSync(req.file.path,finalLogoPath);
req.file.filename = "logo.png";
}catch(fileErr){
if(req.file && fs.existsSync(req.file.path)){
fs.unlinkSync(req.file.path);
}

return res.status(500).json({
message:"Logo replacement failed",
error:fileErr.message
});
}

db.query(
"SELECT * FROM site_settings WHERE id=1",
(err,result)=>{

if(err){
return res.status(500).json(err);
}

if(result.length===0){

db.query(
`
INSERT INTO site_settings
(
id,
logo,
posX,
posY,
scale
)
VALUES
(
1,
?,
0,
0,
1
)
`,
["logo.png"],
(err2)=>{

if(err2){
return res.status(500).json(err2);
}

res.json({
message:"Logo uploaded"
});

}
);

}else{

db.query(
`
UPDATE site_settings
SET logo=?
WHERE id=1
`,
["logo.png"],
(err2)=>{

if(err2){
return res.status(500).json(err2);
}

res.json({
message:"Logo updated"
});

}
);

}

}
);

});

// ======================
// SAVE LOGO POSITION
// ======================

app.put("/logo-position",requireAdmin,(req,res)=>{

const { posX,posY,scale } = req.body;

db.query(
"SELECT * FROM site_settings WHERE id=1",
(err,result)=>{

if(err){
return res.status(500).json(err);
}

if(result.length===0){

db.query(
`
INSERT INTO site_settings
(
id,
logo,
posX,
posY,
scale
)
VALUES
(
1,
'logo.png',
?,
?,
?
)
`,
[
Number(posX) || 0,
Number(posY) || 0,
Number(scale) || 1
],
(err2)=>{

if(err2){
return res.status(500).json(err2);
}

res.json({
success:true,
message:"Logo position saved"
});

}
);

}else{

db.query(
`
UPDATE site_settings
SET
posX=?,
posY=?,
scale=?
WHERE id=1
`,
[
Number(posX) || 0,
Number(posY) || 0,
Number(scale) || 1
],
(err2)=>{

if(err2){
return res.status(500).json(err2);
}

res.json({
success:true,
message:"Logo position updated"
});

}
);

}

}
);

});

// ======================
// GET LOGO
// ======================

app.get("/logo",(req,res)=>{

db.query(
"SELECT * FROM site_settings WHERE id=1",
(err,result)=>{

if(err){
return res.status(500).json(err);
}

if(result.length===0){
return res.json({
logo:"logo.png",
posX:0,
posY:0,
scale:1,
fontStyle:"Poppins"
});
}

res.json({
logo:result[0].logo || "logo.png",
posX:Number(result[0].posX) || 0,
posY:Number(result[0].posY) || 0,
scale:Number(result[0].scale) || 1,
fontStyle:result[0].fontStyle || "Poppins"
});

}
);

});

// ======================
// SAVE PUBLIC FONT STYLE
// ======================

app.put("/font-style",(req,res)=>{

const allowedFonts = [
"Poppins",
"Calibri",
"Cambria",
"Garamond",
"Verdana",
"Tahoma",
"Times New Roman",
"Trebuchet MS",
"Cinzel",
"Syne",
"Georgia",
"Arial",
"Playfair Display",
"Montserrat",
"Oswald",
"Lora",
"Great Vibes",
"Cormorant Garamond",
"Merriweather",
"Raleway",
"Roboto Slab",
"Dancing Script"
];

const fontStyle =
allowedFonts.includes(req.body.fontStyle) ? req.body.fontStyle : "Poppins";

db.query(
`
INSERT INTO site_settings
(
id,
logo,
posX,
posY,
scale,
fontStyle
)
VALUES
(
1,
'logo.png',
0,
0,
1,
?
)
ON DUPLICATE KEY UPDATE
fontStyle=VALUES(fontStyle)
`,
[fontStyle],
(err)=>{

if(err){
return res.status(500).json(err);
}

res.json({
message:"Font style updated"
});

}
);

});

// ======================
// DELETE LOGO
// ======================

app.delete("/delete-logo",requireAdmin,(req,res)=>{

const logoPath = path.join(__dirname,"uploads","logo.png");

if(fs.existsSync(logoPath)){
fs.unlinkSync(logoPath);
}

db.query(
`
UPDATE site_settings
SET
logo=NULL,
posX=0,
posY=0,
scale=1
WHERE id=1
`,
(err)=>{

if(err){
return res.status(500).json(err);
}

res.json({
message:"Logo deleted"
});

}
);

});

// ======================
// PUBLIC CONTENT SETTINGS
// ======================

app.get("/site-content",(req,res)=>{
db.query(
`
SELECT aboutTitle,aboutText
FROM site_settings
WHERE id=1
`,
(err,result)=>{
if(err){
return res.status(500).json(err);
}

res.json({
aboutTitle:result[0]?.aboutTitle || "Capturing Timeless Wedding Moments",
aboutText:result[0]?.aboutText || "PhotoRoast creates heartfelt wedding stories, cinematic portraits, and elegant visual memories with a calm, premium editing style. Every frame is shaped to feel natural, emotional, and easy to relive."
});
}
);
});

app.put("/site-content",requireAdmin,(req,res)=>{
const {
aboutTitle,
aboutText
} = req.body;

db.query(
`
INSERT INTO site_settings
(id,aboutTitle,aboutText)
VALUES (1,?,?)
ON DUPLICATE KEY UPDATE
aboutTitle=VALUES(aboutTitle),
aboutText=VALUES(aboutText)
`,
[
String(aboutTitle || "").trim(),
String(aboutText || "").trim()
],
err=>{
if(err){
return res.status(500).json(err);
}

res.json({
message:"About section updated"
});
}
);
});

// ======================
// HERO UPLOAD
// ======================

app.post("/upload-hero",requireAdmin,upload.array("heroImages",10),(req,res)=>{

const {
heading,
description,
posX,
posY,
scale,
viewport,
mobilePosX,
mobilePosY,
mobileScale,
desktopPosX,
desktopPosY,
desktopScale
} = req.body;

const heroPosX = Number(posX) || 0;
const heroPosY = Number(posY) || 0;
const heroScale = Number(scale) || 1;
const isMobileHero = viewport === "mobile";
const heroMobilePosX = Number(mobilePosX ?? (isMobileHero ? heroPosX : 0)) || 0;
const heroMobilePosY = Number(mobilePosY ?? (isMobileHero ? heroPosY : 0)) || 0;
const heroMobileScale = Number(mobileScale ?? (isMobileHero ? heroScale : 1)) || 1;
const heroDesktopPosX = Number(desktopPosX ?? (isMobileHero ? 0 : heroPosX)) || 0;
const heroDesktopPosY = Number(desktopPosY ?? (isMobileHero ? 0 : heroPosY)) || 0;
const heroDesktopScale = Number(desktopScale ?? (isMobileHero ? 1 : heroScale)) || 1;

if(!req.files || req.files.length===0){
return res.status(400).json({
message:"No hero images"
});
}

if(req.files.length>5){
deleteUploadedFiles(req.files);
return res.status(400).json({
message:"Home page can have only 5 hero images. Please delete one image before adding another."
});
}

if(!validateHeroFilesAreCinematic(req.files)){
deleteUploadedFiles(req.files);
return res.status(400).json({
message:"Choose a valid image file for the hero section"
});
}

db.query(
`
SELECT COUNT(*) AS total
FROM hero_slides
`,
(err,countResult)=>{

if(err){
deleteUploadedFiles(req.files);
return res.status(500).json(err);
}

const existingHeroCount = Number(countResult[0].total) || 0;
const newHeroCount = existingHeroCount + req.files.length;

if(newHeroCount > 5){
deleteUploadedFiles(req.files);
return res.status(400).json({
message:"Home page already has 5 hero images. Please delete one image before adding another."
});
}

const values = req.files.map(file=>[
heading,
description,
file.filename,
heroPosX,
heroPosY,
heroScale,
heroMobilePosX,
heroMobilePosY,
heroMobileScale,
heroDesktopPosX,
heroDesktopPosY,
heroDesktopScale
]);

db.query(
`
INSERT INTO hero_slides
(
heading,
description,
image,
posX,
posY,
scale,
mobilePosX,
mobilePosY,
mobileScale,
desktopPosX,
desktopPosY,
desktopScale
)
VALUES ?
`,
[values],
(err2)=>{

if(err2){
deleteUploadedFiles(req.files);
return res.status(500).json(err2);
}

res.json({
message:"Hero images added"
});

}
);

}
);

});

app.post("/hero-from-gallery",requireAdmin,(req,res)=>{
const {
photoId,
heading,
description
} = req.body;

db.query(
`
SELECT COUNT(*) AS total
FROM hero_slides
`,
(countErr,countResult)=>{
if(countErr){
return res.status(500).json(countErr);
}

const existingHeroCount = Number(countResult[0].total) || 0;

if(existingHeroCount >= 5){
return res.status(400).json({
message:"Home page already has 5 hero images. Please delete one image before adding another."
});
}

db.query(
`
SELECT *
FROM photos
WHERE id=?
AND filename IS NOT NULL
AND (type='photo' OR type='image')
LIMIT 1
`,
[photoId],
(photoErr,photoResult)=>{
if(photoErr){
return res.status(500).json(photoErr);
}

if(photoResult.length===0){
return res.status(404).json({
message:"Gallery image not found"
});
}

const sourceName = String(photoResult[0].filename || "");
const uploadsRoot = path.resolve(__dirname,"uploads");
const sourcePath = path.resolve(uploadsRoot,sourceName);
const sourceInsideUploads =
sourcePath === uploadsRoot || sourcePath.startsWith(uploadsRoot + path.sep);

if(!sourceInsideUploads || !fs.existsSync(sourcePath)){
return res.status(404).json({
message:"Gallery image file not found"
});
}

const extension = path.extname(sourceName) || ".jpg";
const heroFilename = `hero-gallery-${Date.now()}${extension}`;
const heroPath = path.join(uploadsRoot,heroFilename);

try{
fs.copyFileSync(sourcePath,heroPath);
}catch(copyErr){
return res.status(500).json({
message:"Could not add gallery image to hero",
error:copyErr.message
});
}

db.query(
`
INSERT INTO hero_slides
(
heading,
description,
image,
posX,
posY,
scale,
mobilePosX,
mobilePosY,
mobileScale,
desktopPosX,
desktopPosY,
desktopScale
)
VALUES
(
?,
?,
?,
0,
0,
1,
0,
0,
1,
0,
0,
1
)
`,
[
String(heading || "").trim(),
String(description || "").trim(),
heroFilename
],
insertErr=>{
if(insertErr){
if(fs.existsSync(heroPath)){
fs.unlinkSync(heroPath);
}

return res.status(500).json(insertErr);
}

res.json({
message:"Gallery image added to hero"
});
}
);
}
);
}
);
});

// ======================
// DELETE HERO SLIDE
// ======================

app.delete("/delete-hero/:id",requireAdmin,(req,res)=>{

const id = req.params.id;

db.query(
`
SELECT *
FROM hero_slides
WHERE id=?
`,
[id],
(err,result)=>{

if(err){
return res.status(500).json(err);
}

if(result.length===0){
return res.status(404).json({
message:"Hero image not found"
});
}

const image = result[0].image;

db.query(
`
DELETE FROM hero_slides
WHERE id=?
`,
[id],
(err2)=>{

if(err2){
return res.status(500).json(err2);
}

if(image){
const imagePath = path.join(__dirname,"uploads",image);

if(fs.existsSync(imagePath)){
fs.unlinkSync(imagePath);
}
}

res.json({
message:"Hero image deleted"
});

}
);

}
);

});

app.put("/hero-text/:id",requireAdmin,(req,res)=>{
const id = req.params.id;
const {
heading,
description
} = req.body;

db.query(
`
UPDATE hero_slides
SET heading=?,description=?
WHERE id=?
`,
[
String(heading || "").trim(),
String(description || "").trim(),
id
],
(err,result)=>{
if(err){
return res.status(500).json(err);
}

if(result.affectedRows===0){
return res.status(404).json({
message:"Hero image not found"
});
}

res.json({
message:"Hero text updated"
});
}
);
});

// ======================
// REPLACE SINGLE HERO SLIDE
// ======================

app.put("/replace-hero/:id",requireAdmin,upload.single("heroImage"),(req,res)=>{

const id = req.params.id;

const {
heading,
description,
posX,
posY,
scale,
viewport
} = req.body;

const heroPosX = Number(posX) || 0;
const heroPosY = Number(posY) || 0;
const heroScale = Number(scale) || 1;
const isMobileHero = viewport === "mobile";

db.query(
`
SELECT *
FROM hero_slides
WHERE id=?
`,
[id],
(err,result)=>{

if(err){
return res.status(500).json(err);
}

if(result.length===0){
if(req.file){
deleteUploadedFiles([req.file]);
}

return res.status(404).json({
message:"Hero image not found"
});
}

if(req.file && !validateHeroFilesAreCinematic([req.file])){
deleteUploadedFiles([req.file]);
return res.status(400).json({
message:"Choose only cinematic view pic for hero images"
});
}

const oldImage = result[0].image;
const newImage = req.file ? req.file.filename : oldImage;

const updateQuery = isMobileHero
? `
UPDATE hero_slides
SET
heading=?,
description=?,
image=?,
mobilePosX=?,
mobilePosY=?,
mobileScale=?,
posX=?,
posY=?,
scale=?
WHERE id=?
`
: `
UPDATE hero_slides
SET
heading=?,
description=?,
image=?,
desktopPosX=?,
desktopPosY=?,
desktopScale=?
WHERE id=?
`;

const updateValues = isMobileHero
? [
heading,
description,
newImage,
heroPosX,
heroPosY,
heroScale,
heroPosX,
heroPosY,
heroScale,
id
]
: [
heading,
description,
newImage,
heroPosX,
heroPosY,
heroScale,
id
];

db.query(
updateQuery,
updateValues,
(updateErr)=>{

if(updateErr){
return res.status(500).json(updateErr);
}

if(req.file && oldImage && oldImage !== newImage){
const oldPath = path.join(__dirname,"uploads",oldImage);

if(fs.existsSync(oldPath)){
fs.unlinkSync(oldPath);
}
}

res.json({
message:"Hero image updated"
});

}
);

}
);

});

// ======================
// SAVE HERO POSITION ONLY
// ======================

app.put("/hero-position",requireAdmin,(req,res)=>{

const {
posX,
posY,
scale,
viewport,
id
} = req.body;

const heroPosX = Number(posX) || 0;
const heroPosY = Number(posY) || 0;
const heroScale = Number(scale) || 1;
const isMobileHero = viewport === "mobile";
const heroId = Number(id) || null;
const positionWhere = heroId ? " WHERE id=?" : "";

const positionQuery = isMobileHero
? `
UPDATE hero_slides
SET
mobilePosX=?,
mobilePosY=?,
mobileScale=?,
posX=?,
posY=?,
scale=?
${positionWhere}
`
: `
UPDATE hero_slides
SET
desktopPosX=?,
desktopPosY=?,
desktopScale=?
${positionWhere}
`;

const positionValues = isMobileHero
? [
heroPosX,
heroPosY,
heroScale,
heroPosX,
heroPosY,
heroScale
]
: [
heroPosX,
heroPosY,
heroScale
];

if(heroId){
positionValues.push(heroId);
}

db.query(
positionQuery,
positionValues,
(err)=>{

if(err){
return res.status(500).json(err);
}

res.json({
success:true,
message:"Hero position saved"
});

}
);

});

// ======================
// GET HERO
// ======================

app.get("/hero",(req,res)=>{

db.query(
`
SELECT *
FROM hero_slides
ORDER BY id ASC
`,
(err,result)=>{

if(err){
return res.status(500).json(err);
}

const updated = result.map(item=>({
...item,
posX:Number(item.posX) || 0,
posY:Number(item.posY) || 0,
scale:Number(item.scale) || 1,
mobilePosX:Number(item.mobilePosX) || 0,
mobilePosY:Number(item.mobilePosY) || 0,
mobileScale:Number(item.mobileScale) || 1,
desktopPosX:Number(item.desktopPosX ?? item.posX) || 0,
desktopPosY:Number(item.desktopPosY ?? item.posY) || 0,
desktopScale:Number(item.desktopScale ?? item.scale) || 1
}));

res.json(updated);

}
);

});

// ======================
// UPLOAD MEDIA
// ======================

app.post("/upload-gallery",mediaUpload.array("galleryImages",30),(req,res)=>{

const {
title,
description,
category
} = req.body;

if(!category){
deleteUploadedFiles(req.files || []);
return res.status(400).json({
message:"Please choose category"
});
}

if(!req.files || req.files.length===0){
return res.status(400).json({
message:"Please select gallery images"
});
}

if(req.files.length>30){
deleteUploadedFiles(req.files);
return res.status(400).json({
message:"You can select only 30 images at a time"
});
}

const hasVideo =
req.files.some(file=>file.mimetype.startsWith("video"));

if(hasVideo){
deleteUploadedFiles(req.files);
return res.status(400).json({
message:"Please choose images only for gallery"
});
}

const values = req.files.map(file=>[
file.relativeFilename || file.filename,
title,
description,
category,
"photo",
null,
0,
0,
1
]);

db.query(
`
INSERT INTO photos
(
filename,
title,
description,
category,
type,
youtube,
posX,
posY,
scale
)
VALUES ?
`,
[values],
(err,result)=>{

if(err){
deleteUploadedFiles(req.files);
return res.status(500).json(err);
}

const insertedIds =
Array.from(
{ length:req.files.length },
(_,index)=>Number(result?.insertId || 0) + index
).filter(Boolean);

res.json({
message:"Gallery images uploaded",
ids:insertedIds
});

}
);

});

app.post("/upload",mediaUpload.single("media"),(req,res)=>{

const filename = req.file ? (req.file.relativeFilename || req.file.filename) : null;

const {
title,
description,
category,
youtube
} = req.body;

let type = "youtube";

if(req.file){
type = req.file.mimetype.startsWith("video") ? "video" : "photo";
}

db.query(
`
INSERT INTO photos
(
filename,
title,
description,
category,
type,
youtube,
posX,
posY,
scale
)
VALUES
(
?,
?,
?,
?,
?,
?,
0,
0,
1
)
`,
[
filename,
title,
description,
category,
type,
youtube
],
(err)=>{

if(err){
return res.status(500).json(err);
}

res.json({
message:"Upload success"
});

}
);

});

// ======================
// GET PHOTOS
// ======================

app.get("/photos",(req,res)=>{

db.query(
`
SELECT *
FROM photos
ORDER BY id DESC
`,
(err,result)=>{

if(err){
return res.status(500).json(err);
}

res.json(result);

}
);

});

// ======================
// GET VIDEOS / REELS
// ======================

app.get("/videos",(req,res)=>{

db.query(
`
SELECT *
FROM photos
WHERE type='video' OR type='youtube'
ORDER BY id DESC
`,
(err,result)=>{

if(err){
return res.status(500).json(err);
}

res.json(result);

}
);

});

// ======================
// FEATURED IMAGES
// ======================

app.get("/featured-images",(req,res)=>{

db.query(
`
SELECT *
FROM photos
WHERE
featured=1
AND filename IS NOT NULL
AND (type='photo' OR type='image')
ORDER BY featuredOrder ASC,id DESC
`,
(err,result)=>{

if(err){
return res.status(500).json(err);
}

res.json(result);

}
);

});

app.put("/featured-images",(req,res)=>{

const ids =
Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];

if(ids.length>5){
return res.status(400).json({
message:"Only 5 images can be shown in featured gallery"
});
}

db.query(
`
UPDATE photos
SET
featured=0,
featuredOrder=0
`,
(err)=>{

if(err){
return res.status(500).json(err);
}

if(ids.length===0){
return res.json({
message:"Featured images updated"
});
}

let completed = 0;

ids.forEach((id,index)=>{

db.query(
`
UPDATE photos
SET
featured=1,
featuredOrder=?
WHERE
id=?
AND filename IS NOT NULL
AND (type='photo' OR type='image')
`,
[
index + 1,
id
],
(updateErr)=>{

if(updateErr){
return res.status(500).json(updateErr);
}

completed++;

if(completed===ids.length){
res.json({
message:"Featured images updated"
});
}

}
);

});

}
);

});

app.post("/featured-image/:id",(req,res)=>{
const id = Number(req.params.id) || 0;

db.query(
`
SELECT *
FROM photos
WHERE id=?
AND filename IS NOT NULL
AND (type='photo' OR type='image')
LIMIT 1
`,
[id],
(photoErr,photoResult)=>{
if(photoErr){
return res.status(500).json(photoErr);
}

if(photoResult.length===0){
return res.status(404).json({
message:"Gallery image not found"
});
}

if(Number(photoResult[0].featured) === 1){
return res.json({
message:"Image is already featured"
});
}

db.query(
`
SELECT COUNT(*) AS total
FROM photos
WHERE featured=1
AND filename IS NOT NULL
AND (type='photo' OR type='image')
`,
(countErr,countResult)=>{
if(countErr){
return res.status(500).json(countErr);
}

const total = Number(countResult[0].total) || 0;

if(total >= 5){
return res.status(400).json({
message:"Featured gallery already has 5 images. Please delete one image before adding another."
});
}

db.query(
`
UPDATE photos
SET
featured=1,
featuredOrder=?
WHERE id=?
`,
[
total + 1,
id
],
updateErr=>{
if(updateErr){
return res.status(500).json(updateErr);
}

res.json({
message:"Image added to featured gallery"
});
}
);
}
);
}
);
});

app.delete("/featured-image/:id",(req,res)=>{
const id = Number(req.params.id) || 0;

db.query(
`
UPDATE photos
SET
featured=0,
featuredOrder=0
WHERE id=?
`,
[id],
err=>{
if(err){
return res.status(500).json(err);
}

res.json({
message:"Featured image removed"
});
}
);
});

// ======================
// DELETE MEDIA
// ======================

app.delete("/delete/:id",(req,res)=>{

const id = req.params.id;

db.query(
`
SELECT *
FROM photos
WHERE id=?
`,
[id],
(err,result)=>{

if(err){
return res.status(500).json(err);
}

if(result.length===0){
return res.json({
message:"Not found"
});
}

const file = result[0].filename;

db.query(
`
DELETE FROM photos
WHERE id=?
`,
[id],
(err2)=>{

if(err2){
return res.status(500).json(err2);
}

if(file){

const filePath = path.join(__dirname,"uploads",file);

if(fs.existsSync(filePath)){
fs.unlinkSync(filePath);
}

}

res.json({
message:"Deleted"
});

}
);

}
);

});

// ======================
// EDIT MEDIA
// ======================

app.put("/edit-photo/:id",(req,res)=>{

const id = req.params.id;

const {
title,
description,
category
} = req.body;

db.query(
`
UPDATE photos
SET
title=?,
description=?,
category=?
WHERE id=?
`,
[
title,
description,
category,
id
],
(err)=>{

if(err){
return res.status(500).json(err);
}

res.json({
message:"Updated"
});

}
);

});

// ======================
// MOVE MEDIA
// ======================

app.put("/move-media/:id",(req,res)=>{

const id = req.params.id;

const {
posX,
posY,
scale
} = req.body;

db.query(
`
UPDATE photos
SET
posX=?,
posY=?,
scale=?
WHERE id=?
`,
[
posX,
posY,
scale,
id
],
(err)=>{

if(err){
return res.status(500).json(err);
}

res.json({
message:"Moved"
});

}
);

});

// ======================
// UPLOAD REVIEW
// ======================

app.post("/upload-review",upload.single("reviewVideo"),(req,res)=>{

const video = req.file ? req.file.filename : null;

const {
name,
review
} = req.body;

db.query(
`
INSERT INTO reviews
(
name,
text,
video
)
VALUES
(
?,
?,
?
)
`,
[
name,
review,
video
],
(err)=>{

if(err){
return res.status(500).json(err);
}

res.json({
message:"Review uploaded"
});

}
);

});

// ======================
// GET REVIEWS
// ======================

app.get("/reviews",(req,res)=>{

db.query(
`
SELECT *
FROM reviews
ORDER BY id DESC
`,
(err,result)=>{

if(err){
return res.status(500).json(err);
}

res.json(result);

}
);

});

// ======================
// DELETE REVIEW
// ======================

app.delete("/delete-review/:id",(req,res)=>{

const id = req.params.id;

db.query(
`
SELECT *
FROM reviews
WHERE id=?
`,
[id],
(err,result)=>{

if(err){
return res.status(500).json(err);
}

if(result.length===0){
return res.json({
message:"Review not found"
});
}

const video = result[0].video;

db.query(
`
DELETE FROM reviews
WHERE id=?
`,
[id],
(err2)=>{

if(err2){
return res.status(500).json(err2);
}

if(video){

const videoPath = path.join(__dirname,"uploads",video);

if(fs.existsSync(videoPath)){
fs.unlinkSync(videoPath);
}

}

res.json({
message:"Review deleted"
});

}
);

}
);

});

// ======================
// GET CATEGORIES
// ======================

app.get("/categories",(req,res)=>{

db.query(
`
SELECT *
FROM categories
ORDER BY id DESC
`,
(err,result)=>{

if(err){
return res.status(500).json(err);
}

res.json(result);

}
);

});

// ======================
// CATEGORY COVER IMAGES
// ======================

app.get("/category-covers",(req,res)=>{

db.query(
`
SELECT
category_covers.category,
category_covers.photoId,
photos.filename
FROM category_covers
LEFT JOIN photos
ON photos.id = category_covers.photoId
`,
(err,result)=>{

if(err){
return res.status(500).json(err);
}

res.json(result);

}
);

});

app.put("/category-covers",(req,res)=>{

const {
category,
photoId
} = req.body;

if(!category || !photoId){
return res.status(400).json({
message:"Choose category cover image"
});
}

db.query(
`
REPLACE INTO category_covers
(
category,
photoId
)
VALUES
(
?,
?
)
`,
[
category,
photoId
],
(err)=>{

if(err){
return res.status(500).json(err);
}

res.json({
message:"Category cover updated"
});

}
);

});

// ======================
// START SERVER
// ======================

app.listen(PORT,()=>{

console.log(`Server running on port ${PORT}`);

});
