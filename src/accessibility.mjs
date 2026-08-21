const storageKey="fieldwise-accessibility-v1";
const defaults={largeText:false,highContrast:false};
function load(){try{return{...defaults,...JSON.parse(localStorage.getItem(storageKey)||"{}")};}catch{return{...defaults};}}
function apply(value){document.documentElement.classList.toggle("large-text",value.largeText);document.documentElement.classList.toggle("high-contrast",value.highContrast);}
const preferences=load();
apply(preferences);
const button=document.querySelector("#accessibility-button");
const dialog=document.querySelector("#accessibility-dialog");
if(button&&dialog){
  const large=dialog.querySelector("[name=largeText]");
  const contrast=dialog.querySelector("[name=highContrast]");
  large.checked=preferences.largeText;
  contrast.checked=preferences.highContrast;
  button.addEventListener("click",()=>{dialog.showModal();dialog.querySelector("button").focus();});
  dialog.addEventListener("change",()=>{preferences.largeText=large.checked;preferences.highContrast=contrast.checked;localStorage.setItem(storageKey,JSON.stringify(preferences));apply(preferences);});
  dialog.addEventListener("close",()=>button.focus());
}

