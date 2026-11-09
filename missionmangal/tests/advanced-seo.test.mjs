import test from 'node:test';import assert from 'node:assert/strict';
import {structuredData,relatedHtml,editorialPage} from '../core/seo-enhancements.mjs';
const record={type:'answer',url:'https://aafnaipatro.com/what/metal-cold/',slug:'metal-cold'};
const article={title:'Why does metal feel cold?',sources:[{url:'https://example.org/a'}]};
test('editorial answer uses truthful Article schema and breadcrumbs, never false QAPage',()=>{const g=structuredData(article,record)['@graph'];assert.equal(g[0]['@type'],'Article');assert.equal(g[1]['@type'],'BreadcrumbList');assert(!g.some(x=>x['@type']==='QAPage'));});
test('FAQ structured data requires visible actual multiple questions',()=>{const g=structuredData({...article,faq:[{question:'Why cold?',answer:'Because conductivity.'},{question:'What is heat?',answer:'Energy transfer.'}]},record)['@graph'];assert(g.some(x=>x['@type']==='FAQPage'));});
test('related reading uses URLs and escapes unsafe text',()=>{assert(relatedHtml([{url:'https://aafnaipatro.com/blogs/a/',anchor:'Metal & heat'}]).includes('Metal &amp; heat'));assert(editorialPage().includes('AafnaiPatro Editor Team'));});
