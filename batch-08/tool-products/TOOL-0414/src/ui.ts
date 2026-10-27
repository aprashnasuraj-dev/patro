import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"lastYearRelevantTax","label":"Last year's tax used for payments on account (£)","type":"number","value":3000,"min":0,"max":10000000000},{"name":"outsideSaTax","label":"Amount of that tax paid outside Self Assessment (£)","type":"number","value":0,"min":0,"max":10000000000},{"name":"projectedCurrentTax","label":"Projected current-year Self Assessment tax (£)","type":"number","value":3600,"min":0,"max":10000000000},{"name":"poaPaid","label":"Payments on account already made (£)","type":"number","value":0,"min":0,"max":10000000000}],
  compute:calculate,
  resultTitle:"UK Payments on Account Planner results"
});
