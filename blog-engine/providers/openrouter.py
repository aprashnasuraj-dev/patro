from .base import Provider
def adapter(**settings):return Provider("openrouter",settings.get("endpoint",""),"OPENROUTER_API_KEY",settings.get("enabled",False))
