"""Never auto-deploy; only approved, verified packages can stage through JS renderer."""
from .fact_checker import structural_verify
from .verify_content import require_passage_audit,excessive_copy
def eligible(article):
    if article.get("status")!="approved" or article.get("publish_approved") is not True:raise ValueError("Human editorial approval required")
    if article.get("duplicate_check")!="passed":raise ValueError("Duplicate check required")
    structural_verify(article)
    require_passage_audit(article)
    if excessive_copy(article.get('body_md',''),[s['extract'] for s in article['sources']]):raise ValueError('Excessive source copying')
    if article.get('passage_audit_passed') is not True:raise ValueError('Editorial passage audit signoff missing')
    return True
