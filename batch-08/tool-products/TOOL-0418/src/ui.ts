import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"basis","label":"Depreciable basis after §179 and other basis adjustments ($)","type":"number","value":10000,"min":0,"max":1000000000000000},{"name":"propertyClass","label":"GDS property class (half-year table)","type":"select","value":"7","options":[{"value":"3","label":"3-year"},{"value":"5","label":"5-year"},{"value":"7","label":"7-year"},{"value":"10","label":"10-year"}]},{"name":"bonusPct","label":"Special depreciation allowance / bonus (%)","type":"number","value":0,"min":0,"max":100,"help":"Enter only after determining eligibility and applicable acquisition/placed-in-service rule."}],
  compute:calculate,
  resultTitle:"MACRS Depreciation Schedule Generator results"
});
