(function(){
const DEFAULT_MESSAGE = "Something went wrong. Please try again.";
const WRONG_ACTION_MESSAGE = "You should not do so";
const SUCCESS_WORDS = [
"success",
"updated",
"uploaded",
"saved",
"deleted",
"added",
"submitted",
"login success"
];

function ensurePopup(){
let overlay = document.getElementById("friendlyErrorOverlay");

if(overlay){
return overlay;
}

if(!document.body){
return null;
}

const style = document.createElement("style");
style.textContent = `
.friendly-error-overlay{
position:fixed;
inset:0;
display:none;
align-items:center;
justify-content:center;
padding:20px;
background:rgba(0,0,0,.55);
z-index:999999;
}
.friendly-error-overlay.show{
display:flex;
}
.friendly-error-box{
width:min(360px,100%);
background:#fff;
color:#111;
border-radius:14px;
padding:22px;
box-shadow:0 20px 60px rgba(0,0,0,.35);
text-align:center;
font-family:Arial,sans-serif;
}
.friendly-error-box h3{
font-size:20px;
margin-bottom:10px;
}
.friendly-error-box p{
font-size:15px;
line-height:1.5;
color:#555;
}
.friendly-error-box button{
width:100%;
margin-top:18px;
padding:12px 14px;
border:0;
border-radius:10px;
background:#111;
color:#fff;
font-weight:bold;
cursor:pointer;
}
`;
document.head.appendChild(style);

overlay = document.createElement("div");
overlay.id = "friendlyErrorOverlay";
overlay.className = "friendly-error-overlay";
overlay.innerHTML = `
<div class="friendly-error-box" role="dialog" aria-modal="true">
<h3 id="friendlyErrorTitle">Message</h3>
<p id="friendlyErrorMessage">${DEFAULT_MESSAGE}</p>
<button type="button" id="friendlyErrorClose">OK</button>
</div>
`;
document.body.appendChild(overlay);

document
.getElementById("friendlyErrorClose")
.addEventListener("click",function(){
overlay.classList.remove("show");
});

overlay.addEventListener("click",function(e){
if(e.target === overlay){
overlay.classList.remove("show");
}
});

return overlay;
}

function getMessageTitle(message,forcedTitle){
if(forcedTitle){
return forcedTitle;
}

const text =
String(message || "").toLowerCase();

if(SUCCESS_WORDS.some(word=>text.includes(word))){
return "Success";
}

if(text === WRONG_ACTION_MESSAGE.toLowerCase()){
return "Action not allowed";
}

return "Message";
}

function showPopup(message,title){
const overlay = ensurePopup();

if(!overlay){
document.addEventListener("DOMContentLoaded",function(){
showPopup(message,title);
},{ once:true });
return;
}

const titleBox = document.getElementById("friendlyErrorTitle");
const messageBox = document.getElementById("friendlyErrorMessage");
titleBox.textContent = getMessageTitle(message,title);
messageBox.textContent = message || DEFAULT_MESSAGE;
overlay.classList.add("show");
}

window.showFriendlyPopup = showPopup;
window.showFriendlyError = function(){
showPopup(WRONG_ACTION_MESSAGE,"Action not allowed");
};

const nativeFetch = window.fetch.bind(window);
window.fetch = function(input,init){
const options = init ? { ...init } : {};
const token =
localStorage.getItem("adminToken");

const url =
typeof input === "string" ? input : input && input.url;

const isSameOrigin =
!url ||
String(url).startsWith("/") ||
String(url).startsWith(window.location.origin);

if(token && isSameOrigin){
options.headers = new Headers(options.headers || {});
options.headers.set("x-admin-token",token);
}

return nativeFetch(input,options);
};

const nativeAlert = window.alert.bind(window);
window.alert = function(message){
showPopup(message || DEFAULT_MESSAGE);
};

window.addEventListener("error",function(e){
if(e.target && e.target !== window){
return;
}

console.log("Page error handled:",e.message || e.error || e);
});

window.addEventListener("unhandledrejection",function(e){
console.log("Promise error handled:",e.reason || e);
});

document.addEventListener("click",function(e){
const target = e.target.closest("button,a,input,select,textarea");

if(!target){
return;
}

const isDisabled =
target.disabled ||
target.getAttribute("aria-disabled") === "true";

const isEmptyLink =
target.tagName === "A" &&
(
!target.getAttribute("href") ||
target.getAttribute("href") === "#"
);

if(isDisabled || isEmptyLink){
e.preventDefault();
showPopup(WRONG_ACTION_MESSAGE,"Action not allowed");
}
},true);

document.addEventListener("submit",function(e){
if(e.target && e.target.checkValidity && !e.target.checkValidity()){
showPopup(WRONG_ACTION_MESSAGE,"Action not allowed");
}
},true);
})();
