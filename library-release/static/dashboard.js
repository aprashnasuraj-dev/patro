(()=> {
  let all=[], visible=48, sector="", topic="", query="";
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const norm=value=>String(value??"").toLowerCase();

  function rows(){
    const parts=norm(query).trim().split(/\s+/).filter(Boolean);
    return all.filter(article=>{
      if(sector&&article.sector!==sector)return false;
      if(topic&&article.topic!==topic)return false;
      const hay=norm([
        article.title,article.dek,article.sector,article.topic,
        (article.tags||[]).join(" "),article.topic_id
      ].join(" "));
      return parts.every(part=>hay.includes(part));
    });
  }

  function render(){
    const result=rows();
    byId("count").textContent=result.length.toLocaleString()+" articles";
    byId("results").innerHTML=result.slice(0,visible).map(article=>{
      return '<article class="card">'+
        '<div class="card-meta"><span>'+esc(article.sector)+'</span><span>'+esc(article.topic_id)+'</span></div>'+
        '<h2><a href="'+esc(article.url)+'">'+esc(article.title)+'</a></h2>'+
        '<p>'+esc(article.dek||"")+'</p>'+
        '<div class="badges"><span>'+Number(article.source_count||0)+' sources</span><span>'+Number(article.visual_count||0)+' visuals</span><span>'+Number(article.claim_count||0)+' mapped claims</span></div>'+
        '<div class="actions"><a href="'+esc(article.url)+'">Read article</a><a href="'+esc(article.research_url)+'">Research</a></div>'+
      '</article>';
    }).join("");
    byId("more").hidden=visible>=result.length;
  }

  function rebuildTopics(){
    const values=[...new Set(all.filter(a=>!sector||a.sector===sector).map(a=>a.topic))].sort((a,b)=>a.localeCompare(b));
    byId("topic").innerHTML='<option value="">All topics</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");
  }

  fetch("/library-index.json",{headers:{accept:"application/json"}})
    .then(response=>{if(!response.ok)throw new Error(String(response.status));return response.json()})
    .then(data=>{
      all=Array.isArray(data.articles)?data.articles:[];
      const sectors=Object.entries(data.sector_counts||{}).sort((a,b)=>b[1]-a[1]);
      byId("sectorCount").textContent=sectors.length.toLocaleString();
      byId("sector").innerHTML='<option value="">All sectors</option>'+sectors.map(([name])=>'<option value="'+esc(name)+'">'+esc(name)+'</option>').join("");
      byId("sectorList").innerHTML=
        '<button class="active" data-sector=""><span>All sectors</span><b>'+all.length.toLocaleString()+'</b></button>'+
        sectors.map(([name,count])=>'<button data-sector="'+esc(name)+'"><span>'+esc(name)+'</span><b>'+Number(count).toLocaleString()+'</b></button>').join("");
      byId("sectorList").addEventListener("click",event=>{
        const button=event.target.closest("button");
        if(!button)return;
        sector=button.dataset.sector||"";
        topic="";
        visible=48;
        byId("sector").value=sector;
        [...byId("sectorList").querySelectorAll("button")].forEach(node=>node.classList.toggle("active",node===button));
        rebuildTopics();
        render();
      });
      rebuildTopics();
      render();
    })
    .catch(()=>{byId("count").textContent="Library catalogue unavailable";});

  byId("q").addEventListener("input",event=>{query=event.target.value;visible=48;render();});
  byId("sector").addEventListener("change",event=>{sector=event.target.value;topic="";visible=48;rebuildTopics();render();});
  byId("topic").addEventListener("change",event=>{topic=event.target.value;visible=48;render();});
  byId("more").addEventListener("click",()=>{visible+=48;render();});
})();