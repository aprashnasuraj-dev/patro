"""Optional local vectors. A 0.75 score triggers review, never blindly deletes content."""
import math
def cosine(a,b):
 if len(a)!=len(b) or not a:raise ValueError("Embedding dimensions differ")
 d=sum(x*y for x,y in zip(a,b));ma=math.sqrt(sum(x*x for x in a));mb=math.sqrt(sum(x*x for x in b))
 return d/(ma*mb) if ma and mb else 0
def gate(candidate,prior,threshold=.75):
 matches=sorted(((cosine(candidate,vector),id_) for id_,vector in prior.items()),reverse=True)
 return {"passed":not matches or matches[0][0]<=threshold,"closest_id":matches[0][1] if matches else None,"score":matches[0][0] if matches else 0,"decision":"review_or_pivot" if matches and matches[0][0]>threshold else "pass"}
