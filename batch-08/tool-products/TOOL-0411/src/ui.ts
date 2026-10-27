import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"city","label":"City / project label","type":"text","value":"Custom NOAA PFDS location"},{"name":"roofAreaSqFt","label":"Horizontal design roof area (ft²)","type":"number","value":2000,"min":1,"max":1000000},{"name":"rainInPerHr","label":"Design rainfall intensity (in/hr)","type":"number","value":4,"min":0.01,"max":30,"step":0.01,"help":"Use current NOAA PFDS or local authority intensity for the required duration/return period."},{"name":"downspouts","label":"Planned downspouts","type":"number","value":4,"min":1,"max":1000,"step":1},{"name":"downspoutCapacityGpm","label":"Verified capacity per downspout (gpm)","type":"number","value":30,"min":0.1,"max":10000,"step":0.1,"help":"Enter a capacity from your chosen profile/manufacturer/standard table."}],
  compute:calculate,
  resultTitle:"Gutter & Downspout Sizing by City Rainfall results"
});
