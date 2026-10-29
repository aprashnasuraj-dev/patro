(function (global) {
  "use strict";

  function RoutingError(code, message, cause) {
    this.name = "RoutingError";
    this.code = code;
    this.message = message || code;
    this.cause = cause || null;
    if (Error.captureStackTrace) Error.captureStackTrace(this, RoutingError);
  }
  RoutingError.prototype = Object.create(Error.prototype);
  RoutingError.prototype.constructor = RoutingError;

  function PublicFossgisProvider(baseUrl) {
    this.baseUrl = String(baseUrl || "https://routing.openstreetmap.de/").replace(/\/+$/, "") + "/";
    this.name = "fossgis-public-osrm";
  }
  PublicFossgisProvider.prototype.route = async function (req, signal) {
    var profiles = { car: ["routed-car", "driving"], bike: ["routed-bike", "driving"], foot: ["routed-foot", "driving"] };
    var profile = profiles[req.mode] || profiles.car;
    var a = req.from, b = req.to;
    var url = this.baseUrl + profile[0] + "/route/v1/" + profile[1] + "/" +
      a.lng.toFixed(6) + "," + a.lat.toFixed(6) + ";" + b.lng.toFixed(6) + "," + b.lat.toFixed(6) +
      "?overview=full&geometries=geojson&steps=true&alternatives=false";
    var response;
    try { response = await fetch(url, { signal: signal }); }
    catch (error) { throw new RoutingError(error && error.name === "AbortError" ? "timeout" : "network", "routing request failed", error); }
    if (response.status === 429) throw new RoutingError("throttled", "routing provider throttled the request");
    if (response.status >= 500) throw new RoutingError("upstream_5xx", "routing provider failed");
    if (!response.ok) throw new RoutingError("upstream_http", "routing provider returned " + response.status);
    var json;
    try { json = await response.json(); } catch (error) { throw new RoutingError("malformed_response", "routing response was not valid JSON", error); }
    if (!json.routes || !json.routes.length || !json.routes[0].geometry) throw new RoutingError("no_route", json.code || "no route");
    var route = json.routes[0];
    return {
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      legs: route.legs || [],
      warnings: [],
      confidence: null,
      provenance: { provider: this.name, base_url: this.baseUrl, policy: "https://routing.openstreetmap.de/about.html" }
    };
  };

  function TokenBucket(options) {
    options = options || {};
    this.capacity = Math.max(1, options.capacity || 1);
    this.tokens = this.capacity;
    this.refillMs = Math.max(1, options.refillMs || 1000);
    this.last = Date.now();
  }
  TokenBucket.prototype.take = async function () {
    for (;;) {
      var now = Date.now();
      var refill = Math.floor((now - this.last) / this.refillMs);
      if (refill > 0) {
        this.tokens = Math.min(this.capacity, this.tokens + refill);
        this.last += refill * this.refillMs;
      }
      if (this.tokens > 0) { this.tokens--; return; }
      await new Promise(function (resolve) { setTimeout(resolve, 25); });
    }
  };

  function CircuitBreaker(options) {
    options = options || {};
    this.threshold = Math.max(1, options.threshold || 3);
    this.cooldownMs = Math.max(100, options.cooldownMs || 30000);
    this.failures = 0;
    this.state = "closed";
    this.openUntil = 0;
    this.halfOpenInFlight = false;
  }
  CircuitBreaker.prototype.before = function () {
    var now = Date.now();
    if (this.state === "open") {
      if (now < this.openUntil) throw new RoutingError("circuit_open", "routing circuit is temporarily open");
      this.state = "half-open";
    }
    if (this.state === "half-open") {
      if (this.halfOpenInFlight) throw new RoutingError("circuit_open", "routing half-open probe already running");
      this.halfOpenInFlight = true;
    }
  };
  CircuitBreaker.prototype.success = function () {
    this.failures = 0; this.state = "closed"; this.openUntil = 0; this.halfOpenInFlight = false;
  };
  CircuitBreaker.prototype.failure = function () {
    this.halfOpenInFlight = false;
    this.failures++;
    if (this.state === "half-open" || this.failures >= this.threshold) {
      this.state = "open"; this.openUntil = Date.now() + this.cooldownMs;
    }
  };

  function Client(provider, options) {
    options = options || {};
    this.provider = provider;
    this.timeoutMs = Math.max(100, options.timeoutMs || 15000);
    this.bucket = new TokenBucket(options.rateLimit || { capacity: 1, refillMs: 1000 });
    this.breaker = new CircuitBreaker(options.breaker || { threshold: 3, cooldownMs: 30000 });
  }
  Client.prototype.setProvider = function (provider) { this.provider = provider; };
  Client.prototype.route = async function (req) {
    this.breaker.before();
    await this.bucket.take();
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, this.timeoutMs) : null;
    try {
      var result = await this.provider.route(req, ctrl ? ctrl.signal : undefined);
      if (!result || !result.geometry || !Number.isFinite(result.distance)) throw new RoutingError("malformed_response", "normalized route is incomplete");
      this.breaker.success();
      return result;
    } catch (error) {
      this.breaker.failure();
      if (error instanceof RoutingError) throw error;
      throw new RoutingError("unknown", "routing failed", error);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  global.AafnaiRoutingV2 = {
    RoutingError: RoutingError,
    PublicFossgisProvider: PublicFossgisProvider,
    TokenBucket: TokenBucket,
    CircuitBreaker: CircuitBreaker,
    Client: Client
  };
})(typeof window !== "undefined" ? window : globalThis);
