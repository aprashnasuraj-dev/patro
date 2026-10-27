import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"lengthFt","label":"Slab length (ft)","type":"number","value":20,"min":0.1,"max":1000},{"name":"widthFt","label":"Slab width (ft)","type":"number","value":12,"min":0.1,"max":1000},{"name":"spacingIn","label":"Rebar spacing each way (in)","type":"number","value":12,"min":1,"max":60},{"name":"coverIn","label":"Edge cover allowance (in)","type":"number","value":3,"min":0,"max":12},{"name":"stockBarFt","label":"Stock bar length (ft)","type":"number","value":20,"min":1,"max":100},{"name":"meshLengthFt","label":"Mesh sheet length (ft)","type":"number","value":10,"min":1,"max":100},{"name":"meshWidthFt","label":"Mesh sheet width (ft)","type":"number","value":5,"min":1,"max":100},{"name":"wastePct","label":"Waste (%)","type":"number","value":8,"min":0,"max":100}],
  compute:calculate,
  resultTitle:"Rebar & Welded Mesh Slab Takeoff results"
});
