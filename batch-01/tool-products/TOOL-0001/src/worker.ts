import { convert } from './core';
self.onmessage = (event: MessageEvent) => {
  try { self.postMessage({ok:true, result:convert(event.data.csv, event.data.options)}); }
  catch (error) { self.postMessage({ok:false,error:error instanceof Error ? error.message : 'Unable to process CSV.'}); }
};
