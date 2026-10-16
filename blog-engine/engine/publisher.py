"""Never auto-deploy; only approved, verified packages can stage through JS renderer."""
from .fact_checker import structural_verify
def eligible(article):
    if article.get("status")!="approved" or article.get("publish_approved") is not True:raise ValueError("Human editorial approval required")
    if article.get("duplicate_check")!="passed":raise ValueError("Duplicate check required")
    structural_verify(article)
    return True
