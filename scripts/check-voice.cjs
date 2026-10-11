const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  const origin=process.env.VOICE_TEST_ORIGIN||'http://127.0.0.1:4173';
  try {
    for(const target of [
      {path:'/tools/voice-typing',mic:'.voice-record-button',editor:'.voice-transcript-label textarea',english:'.voice-language-picker button:last-child'},
      {path:'/',mic:'.qn-mic',editor:'.qn-field textarea',english:'.qn-lang button:last-child'},
      {path:'/me/notes',mic:'.mp-note-modes button:last-child',editor:'.mp-note-editor textarea',english:'.mp-note-modes button:first-child'},
    ]) {
      const page=await browser.newPage();
      await page.route('**/api/nepali/**',()=>{throw Error('Forbidden Patro speech backend request');});
      await page.addInitScript(()=>{
        window.__voice={starts:0,media:0};
        class Recognition{
          start(){window.__voice.recognition=this;window.__voice.starts++;queueMicrotask(()=>{this.onstart?.();this.onaudiostart?.()});}
          stop(){this.onend?.();}
          abort(){this.onend?.();}
        }
        Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:Recognition});
        Object.defineProperty(window,'webkitSpeechRecognition',{configurable:true,value:undefined});
      });
      await page.goto(origin+target.path);
      const mic=page.locator(target.mic);await mic.waitFor({state:'visible'});
      await mic.click();await page.waitForFunction(()=>window.__voice.starts===1);
      await page.evaluate(()=>{
        const r=window.__voice.recognition;
        r.onresult({resultIndex:0,results:[Object.assign([{transcript:'नमस्ते नेपाल पूर्णविराम'}],{isFinal:true})]});
      });
      await page.waitForFunction(sel=>(document.querySelector(sel)?.value||'').includes('नमस्ते नेपाल।'),target.editor);
      const ne=await page.locator(target.editor).inputValue();
      await page.locator(target.english).click();
      await page.waitForFunction(()=>window.__voice.starts===2);
      await page.evaluate(()=>{
        const r=window.__voice.recognition;
        r.onresult({resultIndex:0,results:[Object.assign([{transcript:'Hello world period'}],{isFinal:true})]});
      });
      await page.waitForFunction(sel=>(document.querySelector(sel)?.value||'').includes('Hello world.'),target.editor);
      const both=await page.locator(target.editor).inputValue();
      assert.ok(both.includes('नमस्ते नेपाल।')&&both.includes('Hello world.'),target.path);
      assert.equal(await page.evaluate(()=>window.__voice.media),0);
      await mic.click();
      if(target.path==='/tools/voice-typing')assert.equal(await page.getByText('Server transcription').count(),0);
      console.log('Browser-only voice passed:',target.path,ne.trim());
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
