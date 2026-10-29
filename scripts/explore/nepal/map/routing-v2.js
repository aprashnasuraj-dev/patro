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
    var points = Array.isArray(req.points) && req.points.length >= 2
      ? req.points
      : [req.from].concat(Array.isArray(req.stops) ? req.stops : []).concat([req.to]).filter(Boolean);
    if (points.length < 2) throw new RoutingError("invalid_request", "routing needs at least two points");
    var coords = points.map(function (p) { return p.lng.toFixed(6) + "," + p.lat.toFixed(6); }).join(";");
    var url = this.baseUrl + profile[0] + "/route/v1/" + profile[1] + "/" + coords +
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
      provenance: { provider: this.name, base_url: this.baseUrl, policy: "https://routing.openstreetmap.de/about.html" },
      waypoint_count: points.length
    };
  };


  function FirstPartyValhallaProvider(endpoint) {
    this.endpoint = String(endpoint || "/api/nepal/v1/route");
    if (!this.endpoint.startsWith("/")) throw new RoutingError("invalid_provider", "first-party Valhalla endpoint must be same-origin");
    this.name = "aafnaipatro-valhalla";
  }
  FirstPartyValhallaProvider.prototype.route = async function (req, signal) {
    var points = Array.isArray(req.points) && req.points.length >= 2
      ? req.points
      : [req.from].concat(Array.isArray(req.stops) ? req.stops : []).concat([req.to]).filter(Boolean);
    if (points.length < 2 || points.length > 10) throw new RoutingError("invalid_request", "routing needs 2 to 10 points");
    var response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify({ mode: req.mode, points: points.map(function (p) { return { lat: p.lat, lng: p.lng }; }) }),
        signal: signal
      });
    } catch (error) {
      throw new RoutingError(error && error.name === "AbortError" ? "timeout" : "network", "first-party routing request failed", error);
    }
    if (response.status === 429) throw new RoutingError("throttled", "routing service throttled the request");
    if (response.status >= 500) throw new RoutingError("upstream_5xx", "routing service failed");
    if (!response.ok) throw new RoutingError("upstream_http", "routing service returned " + response.status);
    var json;
    try { json = await response.json(); } catch (error) { throw new RoutingError("malformed_response", "routing response was not valid JSON", error); }
    if (!json || !json.geometry || !Number.isFinite(json.distance)) throw new RoutingError("no_route", (json && json.error) || "no route");
    return {
      geometry: json.geometry,
      distance: json.distance,
      duration: json.duration,
      legs: json.legs || [],
      warnings: json.warnings || [],
      confidence: json.confidence == null ? null : json.confidence,
      provenance: { provider: this.name, endpoint: this.endpoint, data: "OpenStreetMap" },
      waypoint_count: points.length
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

  function detourClass(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "unknown";
    if (seconds <= 600) return "10m";
    if (seconds <= 1800) return "30m";
    return "over30m";
  }

  Client.prototype.detour = async function (baseRequest, baseRoute, candidate) {
    if (!baseRoute || !Number.isFinite(baseRoute.duration)) throw new RoutingError("no_baseline", "detour scoring requires a timed base route");
    var stops = (baseRequest.stops || []).slice();
    var insertAt = Number.isInteger(baseRequest.insertAt) ? Math.max(0, Math.min(stops.length, baseRequest.insertAt)) : stops.length;
    stops.splice(insertAt, 0, candidate);
    var via = await this.route({
      mode: baseRequest.mode,
      points: [baseRequest.from].concat(stops).concat([baseRequest.to]),
    });
    var extraSeconds = Math.max(0, (via.duration || 0) - baseRoute.duration);
    var extraDistance = Math.max(0, (via.distance || 0) - baseRoute.distance);
    return {
      extra_seconds: extraSeconds,
      extra_distance_m: extraDistance,
      bucket: detourClass(extraSeconds),
      via_route: via,
    };
  };

  Client.prototype.routeWithStops = function (req) {
    return this.route({ mode: req.mode, points: [req.from].concat(req.stops || []).concat([req.to]) });
  };

  global.AafnaiRoutingV2 = {
    RoutingError: RoutingError,
    PublicFossgisProvider: PublicFossgisProvider,
    FirstPartyValhallaProvider: FirstPartyValhallaProvider,
    TokenBucket: TokenBucket,
    CircuitBreaker: CircuitBreaker,
    detourClass: detourClass,
    Client: Client
  };
})(typeof window !== "undefined" ? window : globalThis);
