import type { ReactNode } from "react";
import "./library-article.css";

export type LibrarySource = {
  n:number;
  title:string;
  publisher:string;
  role:string;
  href:string;
};

export type LibraryFigure = {
  src:string;
  alt:string;
  caption:string;
  provenance?:string;
};

export type LibraryArticleModel = {
  topicId:string;
  sector:string;
  topic:string;
  kicker:string;
  title:string;
  dek:string;
  author:string;
  expertise:string;
  researchNote:string;
  reviewed:string;
  tags:string[];
  quickAnswer:string[];
  hero:LibraryFigure;
  sources:LibrarySource[];
};

export function Citation({n,sources}:{n:number;sources:LibrarySource[]}){
  const source=sources.find(s=>s.n===n);
  if(!source)return <sup className="lib-cite">[{n}]</sup>;
  return <details className="lib-citation">
    <summary aria-label={"Open source "+n}>[{n}]</summary>
    <div className="lib-source-popover">
      <b>{source.title}</b>
      <span>{source.publisher}</span>
      <p>{source.role}</p>
      <a href={source.href} target="_blank" rel="noreferrer">View source ↗</a>
    </div>
  </details>;
}

export function EvidenceFigure({figure,priority=false}:{figure:LibraryFigure;priority?:boolean}){
  return <figure className="lib-figure">
    <img src={figure.src} alt={figure.alt} loading={priority?"eager":"lazy"} fetchPriority={priority?"high":"auto"}/>
    <figcaption>
      <span>{figure.caption}</span>
      {figure.provenance?<small>{figure.provenance}</small>:null}
    </figcaption>
  </figure>;
}

export function ArticleTable({headers,rows}:{headers:string[];rows:ReactNode[][]}){
  return <div className="lib-table-wrap" role="region" aria-label="Article data table" tabIndex={0}>
    <table className="lib-table">
      <thead><tr>{headers.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th key={j} scope="row">{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

export function LibraryArticlePage({article,children}:{article:LibraryArticleModel;children:ReactNode}){
  return <main className="lib-article-page">
    <article className="lib-article">
      <nav className="lib-breadcrumb" aria-label="Breadcrumb">
        <a href="/library">Aafnai Library</a><span>›</span><a href={"/library?sector="+encodeURIComponent(article.sector)}>{article.sector}</a><span>›</span><span>{article.topic}</span>
      </nav>

      <header className="lib-article-header">
        <div className="lib-kicker">{article.kicker}</div>
        <h1>{article.title}</h1>
        <p className="lib-dek">{article.dek}</p>

        <div className="lib-byline">
          <div className="lib-author-mark" aria-hidden="true">AP</div>
          <div>
            <strong>By {article.author}</strong>
            <span>{article.expertise}</span>
          </div>
        </div>

        <aside className="lib-research-note">
          <b>Research note</b>
          <p>{article.researchNote}</p>
        </aside>

        <div className="lib-article-meta">
          <span>Reviewed {article.reviewed}</span><span>•</span><span>{article.topicId}</span>
        </div>
        <div className="lib-tags">{article.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
      </header>

      <aside className="lib-quick-answer">
        <span className="lib-callout-label">Quick answer</span>
        {article.quickAnswer.map((p,i)=><p key={i}>{p}</p>)}
      </aside>

      <EvidenceFigure figure={article.hero} priority/>

      <div className="lib-reading-grid">
        <div className="lib-prose">{children}</div>
        <aside className="lib-reading-rail">
          <a className="lib-rail-card" href={"/research/"+article.topicId.toLowerCase()}>
            <b>Research & evidence</b>
            <span>Sources, claims, methodology and limitations →</span>
          </a>
          <div className="lib-rail-card">
            <b>Article identity</b>
            <span>{article.topicId}</span>
            <span>{article.sector}</span>
          </div>
        </aside>
      </div>

      <section className="lib-references" aria-labelledby="references-heading">
        <div className="lib-section-eyebrow">Evidence</div>
        <h2 id="references-heading">References</h2>
        <ol>
          {article.sources.map(source=><li key={source.n} id={"source-"+source.n}>
            <div>
              <strong>{source.title}</strong>
              <span>{source.publisher}</span>
              <p>{source.role}</p>
            </div>
            <a href={source.href} target="_blank" rel="noreferrer">Original source ↗</a>
          </li>)}
        </ol>
        <a className="lib-research-link" href={"/research/"+article.topicId.toLowerCase()}>Open full claim-to-source research record →</a>
      </section>

      <section className="lib-related">
        <div className="lib-section-eyebrow">Continue learning</div>
        <h2>Related reading</h2>
        <p>Related articles are selected from the same sector/topic graph and must pass the same Phase-1 identity gate before appearing here.</p>
      </section>
    </article>
  </main>
}
