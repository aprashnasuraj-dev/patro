import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"wallWidthFt","label":"Wall width (ft)","type":"number","value":15,"min":0.1,"max":1000},{"name":"wallHeightFt","label":"Wall height (ft)","type":"number","value":8,"min":0.1,"max":100},{"name":"rollWidthIn","label":"Roll width (in)","type":"number","value":20.5,"min":1,"max":120},{"name":"rollLengthFt","label":"Roll length (ft)","type":"number","value":33,"min":1,"max":1000},{"name":"repeatIn","label":"Vertical pattern repeat (in)","type":"number","value":21,"min":0.01,"max":120},{"name":"dropOffsetIn","label":"Drop-match offset allowance (in)","type":"number","value":0,"min":0,"max":120,"help":"Use half-repeat for a half-drop if the product instructions call for it."},{"name":"trimIn","label":"Top/bottom trim allowance total (in)","type":"number","value":4,"min":0,"max":24}],
  compute:calculate,
  resultTitle:"Pattern Repeat & Drop Match Calculator results"
});
