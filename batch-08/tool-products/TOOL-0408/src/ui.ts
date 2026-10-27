import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"insideFilmR","label":"Interior surface-film R","type":"number","value":0.68,"min":0,"max":20,"step":0.01},{"name":"outsideFilmR","label":"Exterior surface-film R","type":"number","value":0.17,"min":0,"max":20,"step":0.01},{"name":"continuousR","label":"Continuous/common layers R","type":"number","value":5,"min":0,"max":200,"step":0.01},{"name":"cavityR","label":"Insulated cavity path R","type":"number","value":20,"min":0.01,"max":200,"step":0.01},{"name":"framingR","label":"Framing path R","type":"number","value":6,"min":0.01,"max":200,"step":0.01},{"name":"framingPct","label":"Framing area fraction (%)","type":"number","value":23,"min":0,"max":100,"step":0.1}],
  compute:calculate,
  resultTitle:"Wall & Roof U-Value / R-Value Builder results"
});
