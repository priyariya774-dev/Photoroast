(function(){
function injectPublicHeader(){
if(document.getElementById("publicHeader")){
return;
}

document.body.classList.add("public-portal");

const header = document.createElement("header");
header.id = "publicHeader";
header.className = "public-header";
header.innerHTML = `
<a class="public-logo-area" href="index.html">
<div class="public-logo-frame">
<img id="publicSiteLogo" src="/uploads/logo.png" alt="PhotoRoast">
</div>
</a>

<div class="public-brand">PhotoRoast</div>

<button
type="button"
class="public-menu-toggle"
id="publicMenuToggle"
aria-label="Open menu"
aria-expanded="false">
<span></span>
<span></span>
<span></span>
</button>

<nav class="public-menu" id="publicMenu">
<a href="index.html">Home</a>
<a href="client-gallery.html">Gallery</a>
<a href="reels.html">Reels</a>
<a href="index.html#about">About</a>
<a href="index.html#client-reviews">Client Review/Testimonial</a>
<a href="career.html">Career</a>
<a href="booking.html">Contact</a>
</nav>
`;

document.body.prepend(header);
header.insertAdjacentHTML(
"afterend",
`
<div class="public-back-row">
<button type="button" class="public-back-button" id="publicBackButton">
Back
</button>
</div>
`
);
injectWhatsAppButton();
injectPublicFooter();

const toggle = document.getElementById("publicMenuToggle");
const menu = document.getElementById("publicMenu");
const backButton = document.getElementById("publicBackButton");

function updatePublicHeaderBackground(){
header.classList.toggle(
"scrolled",
window.scrollY > 20 || menu.classList.contains("open")
);
}

function closeMenu(){
menu.classList.remove("open");
toggle.setAttribute("aria-expanded","false");
updatePublicHeaderBackground();
}

toggle.addEventListener("click",function(e){
e.stopPropagation();
const isOpen = menu.classList.toggle("open");
toggle.setAttribute("aria-expanded",isOpen ? "true" : "false");
updatePublicHeaderBackground();
});

menu.querySelectorAll("a").forEach(link=>{
link.addEventListener("click",closeMenu);
});

document.addEventListener("click",function(e){
if(!menu.contains(e.target) && !toggle.contains(e.target)){
closeMenu();
}
});

window.addEventListener("scroll",updatePublicHeaderBackground,{passive:true});
updatePublicHeaderBackground();

if(backButton){
backButton.addEventListener("click",function(){
if(document.referrer && new URL(document.referrer).origin === window.location.origin){
window.history.back();
return;
}

window.location.href = "index.html";
});
}

loadPublicLogo();
}

function injectWhatsAppButton(){
if(!document.getElementById("floatingWhatsApp")){

const link =
document.createElement("a");

link.id = "floatingWhatsApp";
link.className = "floating-whatsapp";
link.href = "https://wa.me/919043103301?text=Hi%20PhotoRoast%2C%20I%20would%20like%20to%20enquire%20about%20a%20shoot.";
link.target = "_blank";
link.rel = "noopener";
link.setAttribute("aria-label","Chat on WhatsApp");

link.innerHTML = `
<svg viewBox="0 0 32 32" aria-hidden="true">
<path d="M16.04 3C9.44 3 4.08 8.35 4.08 14.93c0 2.1.55 4.15 1.6 5.95L4 29l8.33-1.62a11.9 11.9 0 0 0 5.71 1.45C24.64 28.83 30 23.48 30 16.9 30 10.33 24.64 3 16.04 3Zm0 23.73c-1.8 0-3.56-.48-5.1-1.38l-.37-.22-4.95.96.99-4.82-.25-.39a9.78 9.78 0 0 1-1.55-5.26c0-5.41 4.42-9.82 9.86-9.82 5.43 0 9.86 4.41 9.86 9.82 0 5.42-4.43 9.83-9.86 9.83Zm5.4-7.36c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.29-.77.96-.94 1.15-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.74-1.64-2.03-.17-.3-.02-.46.13-.6.13-.13.3-.35.44-.52.15-.17.2-.3.3-.49.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.29-1.03 1-1.03 2.45s1.06 2.85 1.2 3.05c.15.2 2.08 3.17 5.04 4.45.7.3 1.25.48 1.68.61.71.22 1.35.19 1.86.12.57-.08 1.76-.72 2-1.42.25-.7.25-1.3.18-1.42-.08-.13-.27-.2-.57-.35Z"/>
</svg>
`;

document.body.appendChild(link);
}

if(document.getElementById("floatingContact")){
return;
}

const contactLink =
document.createElement("a");

contactLink.id = "floatingContact";
contactLink.className = "floating-contact";
contactLink.href = "tel:+919043103301";
contactLink.setAttribute("aria-label","Call PhotoRoast");

contactLink.innerHTML = `
<svg viewBox="0 0 24 24" aria-hidden="true">
<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z"/>
</svg>
`;

document.body.appendChild(contactLink);
}

function injectPublicFooter(){
if(document.querySelector(".public-footer") || document.querySelector("footer")){
return;
}

const footer =
document.createElement("footer");

footer.className = "public-footer";
footer.innerHTML = `
<div class="footer-links">
<a
class="social-icon"
href="https://www.instagram.com/photoroast2020?igsh=MTc0ampqYmZmcG1ieQ%3D%3D"
target="_blank"
rel="noopener"
aria-label="Open Instagram">
<svg viewBox="0 0 24 24" aria-hidden="true">
<path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm8.95 1.55a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>
</svg>
</a>
<a
class="social-icon"
href="https://www.youtube.com/@photoroast"
target="_blank"
rel="noopener"
aria-label="Open YouTube">
<svg viewBox="0 0 24 24" aria-hidden="true">
<path d="M21.58 7.19a2.7 2.7 0 0 0-1.9-1.91C18 4.83 12 4.83 12 4.83s-6 0-7.68.45a2.7 2.7 0 0 0-1.9 1.91A28.1 28.1 0 0 0 2 12a28.1 28.1 0 0 0 .42 4.81 2.7 2.7 0 0 0 1.9 1.91c1.68.45 7.68.45 7.68.45s6 0 7.68-.45a2.7 2.7 0 0 0 1.9-1.91A28.1 28.1 0 0 0 22 12a28.1 28.1 0 0 0-.42-4.81ZM10 15.17V8.83L15.2 12 10 15.17Z"/>
</svg>
</a>
</div>
<p>© 2026 PhotoRoast Studio</p>
`;

document.body.appendChild(footer);
}

function getFontFamily(fontStyle){
const fonts = {
Poppins:"'Montserrat','Poppins','Segoe UI',Arial,sans-serif",
Calibri:"Calibri,'Segoe UI',Arial,sans-serif",
Cambria:"Cambria,Georgia,serif",
Garamond:"Garamond,Georgia,serif",
Verdana:"Verdana,Geneva,sans-serif",
Tahoma:"Tahoma,Geneva,sans-serif",
"Times New Roman":"'Times New Roman',Times,serif",
"Trebuchet MS":"'Trebuchet MS',Arial,sans-serif",
Cinzel:"'Cinzel',Georgia,serif",
Syne:"'Syne','Poppins',Arial,sans-serif",
Georgia:"Georgia,'Times New Roman',serif",
Arial:"Arial,'Segoe UI',sans-serif",
"Playfair Display":"'Playfair Display',Georgia,serif",
Montserrat:"'Montserrat','Poppins',Arial,sans-serif",
Oswald:"'Oswald','Arial Narrow',Arial,sans-serif",
Lora:"'Lora',Georgia,serif",
"Great Vibes":"'Great Vibes',cursive",
"Cormorant Garamond":"'Cormorant Garamond',Georgia,serif",
Merriweather:"'Merriweather',Georgia,serif",
Raleway:"'Raleway','Poppins',Arial,sans-serif",
"Roboto Slab":"'Roboto Slab',Georgia,serif",
"Dancing Script":"'Dancing Script',cursive"
};

return fonts[fontStyle] || fonts.Poppins;
}

function applyPublicFont(fontStyle){
const family =
getFontFamily(fontStyle || "Montserrat");

document.documentElement.style.setProperty("--site-font",family);
document.body.style.fontFamily = family;
document.body.classList.add("site-font-applied");
localStorage.setItem("photoRoastFontStyle",fontStyle || "Montserrat");
}

async function loadPublicLogo(){
try{
const res = await fetch("/logo");
const data = await res.json();
const logo = document.getElementById("publicSiteLogo");

logo.src =
"/uploads/logo.png?t=" +
new Date().getTime();

const posX = Number(data.posX) || 0;
const posY = Number(data.posY) || 0;
const scale = Number(data.scale) || 1;

logo.style.transform =
`translate(-50%,-50%) translate(${posX}px, ${posY}px) scale(${scale})`;

document.body.style.fontFamily =
getFontFamily(data.fontStyle || localStorage.getItem("photoRoastFontStyle") || "Montserrat");

applyPublicFont(data.fontStyle || localStorage.getItem("photoRoastFontStyle") || "Montserrat");

}catch(err){
console.log(err);
}
}

function getFontOptions(){
return [
["Calibri","Calibri"],
["Cambria","Cambria"],
["Garamond","Garamond"],
["Verdana","Verdana"],
["Tahoma","Tahoma"],
["Times New Roman","Times New Roman"],
["Trebuchet MS","Trebuchet MS"],
["Poppins","Poppins"],
["Cinzel","Cinzel"],
["Syne","Syne"],
["Playfair Display","Playfair Display"],
["Montserrat","Montserrat"],
["Oswald","Oswald"],
["Lora","Lora"],
["Great Vibes","Great Vibes"],
["Cormorant Garamond","Cormorant Garamond"],
["Merriweather","Merriweather"],
["Raleway","Raleway"],
["Roboto Slab","Roboto Slab"],
["Dancing Script","Dancing Script"],
["Georgia","Georgia"],
["Arial","Arial"]
];
}

if(document.readyState === "loading"){
document.addEventListener("DOMContentLoaded",function(){
injectPublicHeader();
});
}else{
injectPublicHeader();
}
})();
