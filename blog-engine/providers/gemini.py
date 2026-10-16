from .base import Provider
def adapter(**settings):return Provider("gemini",settings.get("endpoint",""),"GEMINI_API_KEY",settings.get("enabled",False))
