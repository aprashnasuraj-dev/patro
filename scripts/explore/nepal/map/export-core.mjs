const escXml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;" })[c]);

const featurePoint = (p, role) => ({
  type:"Feature",
  properties:{ role, name:p.label || role },
  geometry:{ type:"Point", coordinates:[p.lng,p.lat] },
});

export function routeFeatureCollection(input) {
  const features=[];
  if(input.route?.geometry) features.push({
    type:"Feature",
    properties:{
      role:"route",
      distance_m:input.route.distance ?? null,
      duration_s:input.route.duration ?? null,
      attribution:"© OpenStreetMap contributors, ODbL 1.0",
    },
    geometry:input.route.geometry,
  });
  if(input.from) features.push(featurePoint(input.from,"start"));
  (input.stops||[]).forEach((p,i)=>features.push(featurePoint(p,"stop-"+(i+1))));
  if(input.to) features.push(featurePoint(input.to,"destination"));
  (input.places||[]).forEach((p)=>features.push(featurePoint(p,"place")));
  return {
    type:"FeatureCollection",
    properties:{
      generator:"AafnaiPatro Nepal Map",
      attribution:"© OpenStreetMap contributors, ODbL 1.0",
      license:"https://opendatacommons.org/licenses/odbl/1-0/",
    },
    features,
  };
}

export function routeGeoJson(input) {
  return JSON.stringify(routeFeatureCollection(input),null,2)+"\n";
}

export function routeGpx(input) {
  const coords=input.route?.geometry?.coordinates||[];
  const wpts=[
    ...(input.from?[{...input.from,role:"Start"}]:[]),
    ...(input.stops||[]).map((p,i)=>({...p,role:"Stop "+(i+1)})),
    ...(input.to?[{...input.to,role:"Destination"}]:[]),
    ...(input.places||[]).map((p)=>({...p,role:"Place"})),
  ];
  const points=wpts.map((p)=>`<wpt lat="${Number(p.lat).toFixed(6)}" lon="${Number(p.lng).toFixed(6)}"><name>${escXml(p.label||p.role)}</name><type>${escXml(p.role)}</type></wpt>`).join("");
  const trk=coords.length?`<trk><name>AafnaiPatro route</name><trkseg>${coords.map((c)=>`<trkpt lat="${Number(c[1]).toFixed(6)}" lon="${Number(c[0]).toFixed(6)}"></trkpt>`).join("")}</trkseg></trk>`:"";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="AafnaiPatro Nepal Map" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>AafnaiPatro Nepal route</name><desc>Map data © OpenStreetMap contributors, ODbL 1.0.</desc><copyright author="OpenStreetMap contributors"><license>https://opendatacommons.org/licenses/odbl/1-0/</license></copyright></metadata>${points}${trk}</gpx>\n`;
}

export function routeKml(input) {
  const coords=input.route?.geometry?.coordinates||[];
  const placemarks=[];
  const point=(p,name)=>`<Placemark><name>${escXml(p.label||name)}</name><Point><coordinates>${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)},0</coordinates></Point></Placemark>`;
  if(input.from) placemarks.push(point(input.from,"Start"));
  (input.stops||[]).forEach((p,i)=>placemarks.push(point(p,"Stop "+(i+1))));
  if(input.to) placemarks.push(point(input.to,"Destination"));
  (input.places||[]).forEach((p)=>placemarks.push(point(p,"Place")));
  if(coords.length) placemarks.unshift(`<Placemark><name>AafnaiPatro route</name><description>Map data © OpenStreetMap contributors, ODbL 1.0.</description><LineString><tessellate>1</tessellate><coordinates>${coords.map((c)=>`${Number(c[0]).toFixed(6)},${Number(c[1]).toFixed(6)},0`).join(" ")}</coordinates></LineString></Placemark>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>AafnaiPatro Nepal route</name><description>Map data © OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright</description>${placemarks.join("")}</Document></kml>\n`;
}
