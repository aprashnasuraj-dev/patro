import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"filingStatus","label":"Filing status","type":"select","value":"single","options":[{"value":"single","label":"Single / HOH / MFJ"},{"value":"mfs","label":"Married filing separately"}]},{"name":"currentTax","label":"Expected 2026 total tax ($)","type":"number","value":20000,"min":0,"max":10000000000},{"name":"priorTax","label":"2025 total tax ($)","type":"number","value":18000,"min":0,"max":10000000000},{"name":"priorAgi","label":"2025 AGI ($)","type":"number","value":120000,"min":0,"max":10000000000},{"name":"withholding","label":"Expected 2026 withholding/credits counted as prepayments ($)","type":"number","value":8000,"min":0,"max":10000000000}],
  compute:calculate,
  resultTitle:"Estimated Tax Safe-Harbor Planner results"
});
