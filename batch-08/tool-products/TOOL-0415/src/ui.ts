import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"grossEligibleInclTax","label":"Eligible supplies including GST/HST (CAD)","type":"number","value":100000,"min":0,"max":1000000000000},{"name":"taxRatePct","label":"GST/HST charged (%)","type":"select","value":"13","options":[{"value":"5","label":"5% GST"},{"value":"13","label":"13% HST"},{"value":"14","label":"14% HST (Nova Scotia current)"},{"value":"15","label":"15% HST"}]},{"name":"quickRatePct","label":"Applicable Quick Method remittance rate (%)","type":"number","value":8.8,"min":0,"max":30,"step":0.1,"help":"Use the CRA table for your business type, PE location and supply location."},{"name":"itcs","label":"Regular-method eligible ITCs (CAD)","type":"number","value":7000,"min":0,"max":1000000000000},{"name":"ineligibleTax","label":"Full tax on supplies excluded from Quick Method (CAD)","type":"number","value":0,"min":0,"max":1000000000000},{"name":"creditEligibleRevenue","label":"Revenue still eligible for 1% first-$30k credit (CAD)","type":"number","value":30000,"min":0,"max":30000}],
  compute:calculate,
  resultTitle:"GST/HST Quick Method vs Regular Method results"
});
