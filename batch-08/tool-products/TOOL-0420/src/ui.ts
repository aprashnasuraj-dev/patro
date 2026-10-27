import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"priorBasis","label":"Prior-year nondeductible IRA basis ($)","type":"number","value":0,"min":0,"max":1000000000000000},{"name":"currentNondeductible","label":"Current-year nondeductible traditional IRA contribution ($)","type":"number","value":7000,"min":0,"max":1000000000000000},{"name":"conversion","label":"Traditional/SEP/SIMPLE amount converted to Roth ($)","type":"number","value":7000,"min":0,"max":1000000000000000},{"name":"otherDistributions","label":"Other traditional IRA distributions included in pro-rata calculation ($)","type":"number","value":0,"min":0,"max":1000000000000000},{"name":"yearEndTraditionalSepSimple","label":"Dec. 31 value of all traditional/SEP/SIMPLE IRAs + applicable outstanding rollovers ($)","type":"number","value":0,"min":0,"max":1000000000000000}],
  compute:calculate,
  resultTitle:"Backdoor Roth Pro-Rata Calculator results"
});
