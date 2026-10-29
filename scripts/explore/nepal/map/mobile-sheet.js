(function(global){
  "use strict";
  var ORDER=["peek","half","full"];

  function mount(options){
    var panel=options.panel,handle=options.handle,map=options.map;
    if(!panel||!handle) return null;
    var state="peek",drag=null;
    document.body.setAttribute("data-np-sheet",state);
    handle.setAttribute("aria-expanded","false");
    handle.setAttribute("aria-label","Expand map controls");

    function mobile(){ return matchMedia("(max-width:760px)").matches; }
    function apply(next,animate){
      if(!ORDER.includes(next)) next="peek";
      state=next;
      document.body.setAttribute("data-np-sheet",state);
      handle.setAttribute("aria-expanded",String(state!=="peek"));
      handle.setAttribute("aria-label",state==="full"?"Collapse map controls":"Expand map controls");
      panel.style.removeProperty("--np-sheet-drag");
      if(map&&mobile()){
        var h=panel.getBoundingClientRect().height;
        var visible=state==="peek"?118:state==="half"?Math.min(innerHeight*.52,h):Math.min(innerHeight*.88,h);
        try { map.setPadding({top:0,right:0,bottom:Math.round(visible),left:0}); } catch {}
        setTimeout(function(){try{map.resize();}catch{}},animate===false?0:260);
      } else if(map) {
        try { map.setPadding({top:0,right:0,bottom:0,left:0});map.resize(); } catch {}
      }
      panel.dispatchEvent(new CustomEvent("np-sheet-change",{detail:{state:state}}));
    }

    function cycle(){
      var i=ORDER.indexOf(state);
      apply(ORDER[(i+1)%ORDER.length]);
    }
    handle.addEventListener("click",cycle);
    handle.addEventListener("keydown",function(e){
      if(e.key==="ArrowUp"){e.preventDefault();apply(state==="peek"?"half":"full");}
      if(e.key==="ArrowDown"){e.preventDefault();apply(state==="full"?"half":"peek");}
      if(e.key==="Escape"){e.preventDefault();apply("peek");}
    });
    handle.addEventListener("pointerdown",function(e){
      if(!mobile()) return;
      drag={id:e.pointerId,startY:e.clientY,startState:state};
      handle.setPointerCapture(e.pointerId);
      panel.classList.add("np-sheet-dragging");
    });
    handle.addEventListener("pointermove",function(e){
      if(!drag||e.pointerId!==drag.id) return;
      panel.style.setProperty("--np-sheet-drag",(e.clientY-drag.startY)+"px");
    });
    function end(e){
      if(!drag||e.pointerId!==drag.id) return;
      var dy=e.clientY-drag.startY,start=ORDER.indexOf(drag.startState),next=start;
      if(dy<-45) next=Math.min(ORDER.length-1,start+1);
      if(dy>45) next=Math.max(0,start-1);
      drag=null;panel.classList.remove("np-sheet-dragging");apply(ORDER[next]);
    }
    handle.addEventListener("pointerup",end);
    handle.addEventListener("pointercancel",end);
    addEventListener("resize",function(){apply(mobile()?state:"peek",false);});
    apply("peek",false);
    return { get state(){return state;}, set:apply };
  }
  global.AafnaiMobileSheet={mount:mount};
})(typeof window!=="undefined"?window:globalThis);
