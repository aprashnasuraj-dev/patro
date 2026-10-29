(function(global){
  "use strict";
  function mount(target,options){
    var el=typeof target==="string"?document.querySelector(target):target;if(!el)throw new Error("embed target not found");
    options=options||{};var u=new URL("https://aafnaipatro.com/embed/nepalmap/");
    if(options.category)u.searchParams.set("c",options.category);
    if(options.district)u.searchParams.set("d",options.district);
    var iframe=document.createElement("iframe");
    iframe.src=u.toString();iframe.title=options.title||"AafnaiPatro Nepal Map";iframe.loading="lazy";iframe.referrerPolicy="strict-origin-when-cross-origin";
    iframe.style.width="100%";iframe.style.height=(options.height||480)+"px";iframe.style.border="0";iframe.style.borderRadius="12px";
    iframe.setAttribute("allowfullscreen","");
    el.replaceChildren(iframe);return iframe;
  }
  global.AafnaiNepalMapEmbed={mount:mount};
})(typeof window!=="undefined"?window:globalThis);
