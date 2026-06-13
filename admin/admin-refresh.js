(function(){
window.adminFreshUrl = function(url){
const nextUrl = new URL(url,window.location.href);
nextUrl.searchParams.set("_",Date.now());
return nextUrl.toString();
};

window.adminGo = function(url){
window.location.href = window.adminFreshUrl(url);
};

document.addEventListener("click",function(e){
const link = e.target.closest("a[data-admin-fresh]");

if(!link){
return;
}

e.preventDefault();
window.adminGo(link.getAttribute("href"));
});
})();
