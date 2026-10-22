"""Optional local model; local inference has compute costs and must be benchmarked."""
from .base import Provider
def adapter(**settings):return Provider("local",settings.get("endpoint",""),"LOCAL_MODEL_TOKEN",settings.get("enabled",False))
