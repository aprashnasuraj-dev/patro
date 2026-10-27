import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"state","label":"State code","type":"text","value":"CA","help":"Built-in dated reference: AL, AK, AZ, AR, CA, CO, IL, IN, MA, NC, NY, SD, TX, UT, WI, WY. Other states use custom fields."},{"name":"sales","label":"Sales counted under that state's rule ($)","type":"number","value":120000,"min":0,"max":1000000000000000},{"name":"transactions","label":"Transactions counted under that state's rule","type":"number","value":150,"min":0,"max":1000000000},{"name":"customSalesThreshold","label":"Custom sales threshold if state not built in ($)","type":"number","value":100000,"min":0,"max":1000000000000000},{"name":"customTransactionThreshold","label":"Custom transaction threshold if applicable","type":"number","value":0,"min":0,"max":1000000000},{"name":"customLogic","label":"Custom threshold logic","type":"select","value":"or","options":[{"value":"or","label":"sales OR transactions"},{"value":"and","label":"sales AND transactions"}]}],
  compute:calculate,
  resultTitle:"US Economic Nexus Tracker results"
});
