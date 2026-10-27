// Low-level pdf-lib outline writer used only by TOOL-0144. Deferred integration tests must
// verify this helper against the pinned pdf-lib version before publication.
export function addTopLevelOutlines(pdfLib:any, doc:any, items:{title:string,pageIndex:number}[]):void {
  if(!items.length) return;
  const { PDFName, PDFString, PDFNumber } = pdfLib;
  const ctx=doc.context, pages=doc.getPages();
  const root=ctx.obj({});
  root.set(PDFName.of('Type'),PDFName.of('Outlines'));
  const rootRef=ctx.register(root);
  const refs:any[]=[];
  for(const item of items){
    const page=pages[item.pageIndex]; if(!page) continue;
    const dict=ctx.obj({});
    dict.set(PDFName.of('Title'),PDFString.of(item.title));
    dict.set(PDFName.of('Parent'),rootRef);
    dict.set(PDFName.of('Dest'),ctx.obj([page.ref,PDFName.of('Fit')]));
    refs.push(ctx.register(dict));
  }
  for(let i=0;i<refs.length;i++){ const dict=ctx.lookup(refs[i]); if(i>0)dict.set(PDFName.of('Prev'),refs[i-1]); if(i<refs.length-1)dict.set(PDFName.of('Next'),refs[i+1]); }
  if(refs.length){ root.set(PDFName.of('First'),refs[0]); root.set(PDFName.of('Last'),refs[refs.length-1]); root.set(PDFName.of('Count'),PDFNumber.of(refs.length)); doc.catalog.set(PDFName.of('Outlines'),rootRef); }
}
