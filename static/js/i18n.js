(function(){
  const map = { fr:"FR", en:"EN", it:"IT" };
  function setup(){ const select=document.getElementById("langSelect"); if(!select) return; select.innerHTML=Object.entries(map).map(([k,v])=>`<option value="${k}">${v}</option>`).join(""); select.value=localStorage.getItem("jsd:lang")||"fr"; select.addEventListener("change",()=>localStorage.setItem("jsd:lang",select.value)); }
  window.addEventListener("DOMContentLoaded", setup);
})();