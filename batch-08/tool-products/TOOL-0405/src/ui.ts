import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"springDeg","label":"Crown spring angle from wall (°)","type":"number","value":38,"min":0.1,"max":89.9,"step":0.01},{"name":"cornerDeg","label":"Measured included wall corner (°)","type":"number","value":90,"min":1,"max":179,"step":0.01}],
  compute:calculate,
  resultTitle:"Crown Molding Angle Finder results"
});
