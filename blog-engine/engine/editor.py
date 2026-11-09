"""Content and byline contract, not a claim of automated human approval."""
def edit_contract(article):
    if article.get("author")!="AafnaiPatro Editor Team":raise ValueError("Wrong author")
    if not isinstance(article.get("body_md"),str) or len(article["body_md"].strip())<100:raise ValueError("Missing substantive article body")
    if not article.get("original_contribution"):raise ValueError("Original contribution required")
    return article
