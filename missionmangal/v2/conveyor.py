#!/usr/bin/env python3
"""Single-flight Mission Mangal batch conveyor. Requires GH_TOKEN and gh CLI.
Never merges PRs or publishes release candidates. Safe to re-run every 30 minutes.
"""
import json, os, pathlib, re, shutil, subprocess, sys, tempfile
REPO=os.environ["GITHUB_REPOSITORY"]
BASE=os.environ.get("MM_BASE","missionmangal-v2-rescue-combined")
WORKFLOW="missionmangal-v2-combined-rescue.yml"
def gh(*args):
 p=subprocess.run(["gh",*map(str,args),"--repo",REPO],text=True,capture_output=True)
 if p.returncode: raise RuntimeError("gh failed: "+p.stderr[-1500:])
 return p.stdout.strip()
def data(*args): return json.loads(gh(*args))
def run():
 prs=data("pr","list","--state","all","--limit","200","--json","number,title,state,mergedAt,headRefName,url")
 batches={}
 for p in prs:
  m=re.fullmatch(r"mm-v2-batch-(\d{3})",p["headRefName"])
  if m: batches[int(m.group(1))]=p
 if any(p["state"]=="OPEN" for p in batches.values()):
  print("WAIT: an existing batch PR requires review");return
 runs=data("run","list","--workflow",WORKFLOW,"--branch",BASE,"--limit","100","--json","databaseId,status,conclusion,event,createdAt,displayTitle")
 if any(r["status"] in ("queued","in_progress","waiting","pending","requested") for r in runs):
  print("WAIT: a batch run is still active");return
 next_index=max(batches,default=0)
 # A completed run without a batch PR must be materialized before starting another.
 completed=[r for r in runs if r["status"]=="completed"]
 unrepresented=[r for r in completed if re.search(r"batch-(\d{3})",r.get("displayTitle") or "") and int(re.search(r"batch-(\d{3})",r["displayTitle"]).group(1)) not in batches]
 if unrepresented:
  r=unrepresented[0];number=int(re.search(r"batch-(\d{3})",r["displayTitle"]).group(1))
  if r["conclusion"]!="success":print("STOP: run failed; manual retry required",r["databaseId"]);return
  publish(r["databaseId"],number);return
 if next_index>=100:print("DONE: 100 batch PRs recorded");return
 previous=0
 if next_index:
  prev=[r for r in completed if re.search(r"batch-(\d{3})",r.get("displayTitle") or "") and int(re.search(r"batch-(\d{3})",r["displayTitle"]).group(1))==next_index]
  if not prev:print("STOP: prior run artifact not found");return
  previous=prev[0]["databaseId"]
 number=next_index+1
 gh("workflow","run",WORKFLOW,"--ref",BASE,"-f","batch_index="+str(next_index),"-f","batch_number="+f"{number:03d}","-f","previous_run="+str(previous),"-f","workers=20","-f","deadline_minutes=330")
 print("DISPATCHED batch",number,"restoring",previous)
def publish(run_id,number):
 with tempfile.TemporaryDirectory() as tmp:
  t=pathlib.Path(tmp)
  gh("run","download",run_id,"--pattern","missionmangal-v2-*","--dir",str(t))
  report=t/"missionmangal-v2-combined-results"/"missionmangal"/"v2-work"/"combined-report.json"
  # Artifact paths can be rooted at v2-work rather than missionmangal/v2-work.
  reports=list(t.rglob("combined-report.json"))
  if not reports: print("STOP: combined report absent");return
  result=json.loads(reports[0].read_text())
  manifest=list(t.rglob("batch-manifest.json"))
  if not manifest:print("STOP: batch manifest absent");return
  m=json.loads(manifest[0].read_text())
  if m["batch"]!=number:print("STOP: manifest mismatch");return
  branch=f"mm-v2-batch-{number:03d}"
  gh("api","-X","POST",f"repos/{REPO}/git/refs","-f","ref=refs/heads/"+branch,"-f","sha="+data("api",f"repos/{REPO}/git/ref/heads/{BASE}")["object"]["sha"])
  # Work on a detached temporary checkout; no user content or unreviewed drafts are published.
  subprocess.run(["git","fetch","origin",branch],check=True)
  subprocess.run(["git","checkout","-B",branch,"origin/"+branch],check=True)
  dest=pathlib.Path("missionmangal/batch-output")/f"batch-{number:03d}"
  dest.mkdir(parents=True,exist_ok=True)
  (dest/"manifest.json").write_text(json.dumps(m,indent=2)+"\n")
  (dest/"report.json").write_text(json.dumps(result,indent=2)+"\n")
  approved=0;candidates=0
  for file in t.rglob("content/*.json"):
   try: article=json.loads(file.read_text())
   except (ValueError,OSError):continue
   if article.get("id") not in m["ids"]:continue
   status=article.get("status")
   if status=="approved":
    out=dest/"approved";approved+=1
   elif status=="release_candidate":
    out=dest/"review-required";candidates+=1
   else:continue
   out.mkdir(exist_ok=True)
   (out/(article["id"]+".json")).write_text(json.dumps(article,indent=2)+"\n")
  subprocess.run(["git","add",str(dest)],check=True)
  subprocess.run(["git","-c","user.name=mission-mangal-bot","-c","user.email=bot@users.noreply.github.com","commit","-m",f"Mission Mangal batch {number:03d}: evidence and review inventory"],check=True)
  subprocess.run(["git","push","origin",branch],check=True)
  body=f"Batch {number}/100; run {run_id}. Approved artifacts: {approved}; release candidates requiring manual review: {candidates}. No auto-publishing or auto-merge. Close or merge after review to permit next batch. Original topic count: {m['original_count']}; pending at start: {m['pending_count']}."
  gh("pr","create","--base",BASE,"--head",branch,"--title",f"Mission Mangal batch {number:03d}/100","--body",body)
  print("CREATED batch PR",number)
if __name__=="__main__":run()
