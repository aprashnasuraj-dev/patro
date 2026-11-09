from .base import Provider
def adapter(**settings):return Provider("groq",settings.get("endpoint",""),"GROQ_API_KEY",settings.get("enabled",False))
