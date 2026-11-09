"""No provider calls unless the provider is explicitly vetted and enabled."""
import os
from urllib.parse import urlparse
class Provider:
    def __init__(self,name,endpoint,secret_env,enabled=False):
        if enabled and (not endpoint.startswith("https://") or not urlparse(endpoint).hostname or not os.environ.get(secret_env)):
            raise ValueError("Approved HTTPS endpoint and secret required")
        self.name,self.endpoint,self.secret_env,self.enabled=name,endpoint,secret_env,enabled
    def generate(self,prompt):
        if not self.enabled:raise RuntimeError("Provider disabled pending terms/quota review")
        raise NotImplementedError("Implement official API protocol with timeout, rate budget, Retry-After, safety and audit logging")
