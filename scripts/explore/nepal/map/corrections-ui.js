(function(global){
  "use strict";
  var REASONS=[
    ["wrong_name","Wrong name / spelling"],["wrong_location","Wrong location"],
    ["wrong_category","Wrong type/category"],["wrong_admin","Wrong ward/palika/district"],
    ["closed_or_removed","Closed or removed"],["duplicate","Duplicate place"],
    ["missing_detail","Important detail missing"],["other","Other"]
  ];
  function esc(v){return String(v||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function open(input){
    var old=document.getElementById("np-correction-dialog");if(old)old.remove();
    var dlg=document.createElement("dialog");dlg.id="np-correction-dialog";dlg.className="np-correction-dialog";
    dlg.innerHTML='<form id="np-correction-form"><button type="button" class="np-dialog-close" aria-label="Close">×</button>'+
      '<h2>Report a map correction</h2><p><b>'+esc(input.name||input.source_id)+'</b></p>'+
      '<p class="np-note">Your report is stored without an email, raw IP address, user-agent or browser location. For source-map edits, OpenStreetMap remains the upstream authority.</p>'+
      '<label>What is wrong?<select name="reason" required>'+REASONS.map(function(r){return '<option value="'+r[0]+'">'+esc(r[1])+'</option>';}).join("")+'</select></label>'+
      '<label>Details<textarea name="detail" maxlength="500" rows="5" placeholder="What should be corrected? Include a source if you have one."></textarea></label>'+
      '<label class="np-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>'+
      '<div class="np-actions"><button class="np-btn" type="submit">Send report</button><a class="np-btn" target="_blank" rel="noopener" href="'+esc(input.osm_url||"https://www.openstreetmap.org/")+'">Edit / inspect on OpenStreetMap</a></div><p id="np-correction-status" class="np-note" aria-live="polite"></p></form>';
    document.body.appendChild(dlg);
    dlg.querySelector(".np-dialog-close").addEventListener("click",function(){dlg.close();});
    dlg.querySelector("form").addEventListener("submit",async function(e){
      e.preventDefault();var form=e.currentTarget,status=dlg.querySelector("#np-correction-status"),button=form.querySelector('button[type="submit"]');
      button.disabled=true;status.textContent="Sending…";
      var fd=new FormData(form);
      var body={
        source_id:input.source_id,place_id:input.place_id||null,
        reason:String(fd.get("reason")||""),detail:String(fd.get("detail")||""),
        website:String(fd.get("website")||""),page_path:location.pathname
      };
      try{
        var response=await fetch("/api/nepal/v1/corrections",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),credentials:"same-origin"});
        var data=await response.json().catch(function(){return {};});
        if(!response.ok) throw new Error(data.error||("HTTP "+response.status));
        status.innerHTML='Report received. Reference <code>'+esc(data.id||"")+'</code>.';
        button.remove();
      }catch(error){button.disabled=false;status.textContent="Could not send report: "+(error&&error.message||error);}
    });
    if(dlg.showModal)dlg.showModal();else dlg.setAttribute("open","");
  }
  global.AafnaiCorrections={open:open};
})(typeof window!=="undefined"?window:globalThis);
