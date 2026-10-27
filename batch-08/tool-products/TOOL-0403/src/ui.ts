import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"totalRiseIn","label":"Finished-floor total rise (in)","type":"number","value":108,"min":1,"max":400,"step":0.01},{"name":"treadDepthIn","label":"Planned tread depth (in)","type":"number","value":10,"min":1,"max":30,"step":0.01},{"name":"headroomIn","label":"Available headroom (in)","type":"number","value":80,"min":0,"max":200},{"name":"maxRiserIn","label":"Max riser allowed (in)","type":"number","value":7.75,"min":1,"max":20,"step":0.01},{"name":"minTreadIn","label":"Min tread required (in)","type":"number","value":10,"min":1,"max":30,"step":0.01},{"name":"minHeadroomIn","label":"Min headroom required (in)","type":"number","value":80,"min":0,"max":200,"step":0.01}],
  compute:calculate,
  resultTitle:"Stair Rise/Run & Code Compliance Checker results"
});
