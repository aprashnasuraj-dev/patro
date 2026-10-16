"""Provider allowlist and automatic fallback. Offline tests inject the transport."""
import json,os,time,urllib.request,urllib.error
from pathlib import Path
class ExhaustedProviders(RuntimeError):pass
class TransientFailure(RuntimeError):
 def __init__(self,message,delay=None):super().__init__(message);self.delay=delay
class PermanentFailure(RuntimeError):pass
def transport(spec,messages,secret):
 kind=spec['kind'];model=spec['model']
 if kind=='gemini':
  url=spec['endpoint'].rstrip('/')+'/models/'+model+':generateContent'
  prompt='\n'.join(m['content'] for m in messages)
  body={'contents':[{'role':'user','parts':[{'text':prompt}]}]};headers={'x-goog-api-key':secret}
 elif kind in ('groq','openrouter','siliconflow','openai','pollinations'):
  url=spec['endpoint'];body={'model':model,'messages':messages,'temperature':0.35,'stream':False}
  headers={'Authorization':'Bearer '+secret}
  if kind=='openrouter':headers.update({'HTTP-Referer':'https://aafnaipatro.com','X-Title':'Mission Mangal'})
 else:raise PermanentFailure('Unsupported protocol')
 if not url.startswith('https://'):raise PermanentFailure('HTTPS required')
 req=urllib.request.Request(url,data=json.dumps(body).encode(),headers={**headers,'Content-Type':'application/json'},method='POST')
 try:
  with urllib.request.urlopen(req,timeout=spec.get('timeout_seconds',40)) as response:payload=json.load(response)
 except urllib.error.HTTPError as e:
  if e.code in (408,409,425,429,500,502,503,504):
   retry=e.headers.get('Retry-After') if e.headers else None
   try:retry=min(30,max(0,float(retry))) if retry else None
   except (ValueError,TypeError):retry=None
   raise TransientFailure('HTTP '+str(e.code),retry) from None
  raise PermanentFailure('HTTP '+str(e.code)) from None
 except (urllib.error.URLError,TimeoutError,OSError):raise TransientFailure('Network or timeout') from None
 try:
  if kind=='gemini':answer='\n'.join(p['text'] for c in payload['candidates'] for p in c['content']['parts'] if 'text' in p)
  else:answer=payload['choices'][0]['message']['content']
 except (KeyError,IndexError,TypeError):raise PermanentFailure('Invalid provider response') from None
 if not isinstance(answer,str) or not answer.strip():raise PermanentFailure('Empty provider output')
 return answer
class Router:
 def __init__(self,specs,transport_fn=None,usage=None,sleep=None,quota=None):
  self.specs=specs;self.transport=transport_fn or transport;self.usage=usage if usage is not None else {};self.sleep=sleep or time.sleep;self.failures=[];self.quota=quota
 @classmethod
 def from_file(cls,path,**kwargs):
  cfg=json.loads(Path(path).read_text(encoding='utf-8'))
  return cls(cfg.get('adapters',[]) if cfg.get('enabled') else [],**kwargs)
 def choices(self,capability,exclude=()):
  out=[]
  for p in self.specs:
   if p['id'] in exclude or capability not in p.get('capabilities',[]):continue
   if not all(p.get(k) is True for k in ('enabled','official_terms_verified','commercial_use_verified')):continue
   if not p.get('endpoint','').startswith('https://') or not p.get('model') or not os.environ.get(p.get('secret_env','')):continue
   limit=p.get('daily_limit',0)
   if not isinstance(limit,int) or limit<=0 or self.usage.get(p['id'],0)>=limit:continue
   out.append(p)
  return sorted(out,key=lambda p:(self.usage.get(p['id'],0)/p['daily_limit'],p['id']))
 def complete(self,capability,messages,exclude=()):
  for p in self.choices(capability,exclude):
   for attempt in range(p.get('max_retries',2)+1):
    if self.usage.get(p['id'],0)>=p['daily_limit']:break
    if self.quota is not None:
     import uuid,datetime
     window=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
     request_key='mangal:'+uuid.uuid4().hex
     try:self.quota.reserve(p['id'],window,request_key,p['daily_limit'])
     except Exception:
      self.failures.append((p['id'],'shared-quota','Unavailable or exhausted'));break
    self.usage[p['id']]=self.usage.get(p['id'],0)+1
    try:
     answer=self.transport(p,messages,os.environ[p['secret_env']])
     if not isinstance(answer,str) or not answer.strip():raise PermanentFailure('Empty output')
     if self.quota is not None:
      try:self.quota.complete(p['id'],window,request_key)
      except Exception:pass  # Conservatively keep the quota reservation consumed.
     return {'provider':p['id'],'model':p['model'],'text':answer,'attempts':attempt+1}
    except PermanentFailure as e:self.failures.append((p['id'],'permanent',str(e)));break
    except TransientFailure as e:
     self.failures.append((p['id'],'transient',str(e)))
     if attempt<p.get('max_retries',2):self.sleep(e.delay if e.delay is not None else min(8,2**attempt))
    except Exception:self.failures.append((p['id'],'adapter-error','Unexpected error'));break
  raise ExhaustedProviders('No eligible provider succeeded; keep stage blocked')
def independent_review(router,brief,draft,writer_provider):
 messages=[{'role':'system','content':'Review claims against provided evidence; do not invent citations or assert that verification occurred.'},{'role':'user','content':json.dumps({'brief':brief,'draft':draft})}]
 return router.complete('review',messages,exclude=(writer_provider,))
