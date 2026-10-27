import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"jurisdiction","label":"Jurisdiction code","type":"select","value":"UK","options":[{"value":"UK","label":"United Kingdom"},{"value":"CA","label":"Canada (most businesses)"},{"value":"AU","label":"Australia (business)"},{"value":"NZ","label":"New Zealand"},{"value":"SG","label":"Singapore"},{"value":"IN","label":"India general threshold reference"},{"value":"CUSTOM","label":"Custom"}]},{"name":"turnover","label":"Relevant turnover","type":"number","value":80000,"min":0,"max":1000000000000000},{"name":"customThreshold","label":"Custom threshold","type":"number","value":100000,"min":0,"max":1000000000000000},{"name":"currency","label":"Custom currency code","type":"text","value":"USD"}],
  compute:calculate,
  resultTitle:"VAT/GST Registration Threshold Tracker results"
});
