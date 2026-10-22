"""Authenticated HTTP client for a separately deployed quota coordinator.
Each GitHub matrix runner must share the SAME endpoint and credentials; fail closed otherwise.
"""
import json,os,urllib.request,urllib.error
class QuotaUnavailable(RuntimeError):pass
class RemoteQuota:
 def __init__(self,endpoint=None,token=None,transport=None):
  self.endpoint=endpoint or os.environ.get('MANGAL_QUOTA_ENDPOINT','')
  self.token=token or os.environ.get('MANGAL_COORDINATOR_TOKEN','')
  self.transport=transport
  if not self.endpoint.startswith('https://') or not self.token:raise QuotaUnavailable('Shared coordinator unavailable')
 def request(self,operation,provider,window_key,request_key,limit=None):
  data={'operation':operation,'provider':provider,'window_key':window_key,'request_key':request_key}
  if limit is not None:data['limit']=limit
  if self.transport:return self.transport(data)
  req=urllib.request.Request(self.endpoint,data=json.dumps(data).encode(),method='POST',headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json'})
  try:
   with urllib.request.urlopen(req,timeout=12) as response:return json.load(response)
  except urllib.error.HTTPError as e:
   if e.code==429:raise QuotaUnavailable('Shared provider quota exhausted') from None
   raise QuotaUnavailable('Quota coordinator HTTP failure') from None
  except (urllib.error.URLError,TimeoutError,OSError):raise QuotaUnavailable('Quota coordinator unreachable') from None
 def reserve(self,provider,window_key,request_key,limit):return self.request('reserve',provider,window_key,request_key,limit)
 def complete(self,provider,window_key,request_key):return self.request('complete',provider,window_key,request_key)
