// Optional, privacy-conscious interaction events for AafnaiPatro tool pages.
// Sends only the current public route and the event name, never form inputs/files.
const route=location.pathname.replace(/\/+$/,"")||"/";
const allowed=Boolean(document.querySelector("[data-mm530-static-fallback], #ct-tool, [data-page=tool], .seo-prerender"));
if(allowed){
  const group=route.startsWith("/advancetools/")?"specialist":route.startsWith("/tool/")?"browser":route.startsWith("/tools/")?"legacy":"web";
  const emit=(name)=>{
    if(typeof window.gtag!=="function")return;
    window.gtag("event",name,{tool_route:route,tool_group:group,engagement_time_msec:100});
  };
  function watch(doc){
    if(!doc||doc.__aafnaiToolEventsAttached)return;
    try{Object.defineProperty(doc,"__aafnaiToolEventsAttached",{value:true});}catch{return}
    doc.addEventListener("submit",event=>{
      const form=event.target;
      if(form?.tagName==="FORM" && !form.closest?.(".searchbar"))emit("tool_start");
    },true);
    doc.addEventListener("click",event=>{
      const target=event.target?.closest?.("button,a");
      if(!target)return;
      const label=(target.getAttribute("aria-label")||target.textContent||"").trim().slice(0,90);
      if(/^(?:download|export|copy|print|save)(?:\b|\s)/i.test(label))emit("tool_export");
    },true);
  }
  watch(document);
  document.querySelectorAll("iframe.mm530-frame").forEach(frame=>{
    const bind=()=>{try{if(frame.contentDocument)watch(frame.contentDocument)}catch{}};
    frame.addEventListener("load",bind);bind();
  });
}
