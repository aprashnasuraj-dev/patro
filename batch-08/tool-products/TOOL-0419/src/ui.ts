import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"originalBuyDate","label":"Original lot purchase date","type":"text","value":"2026-01-15"},{"name":"saleDate","label":"Loss sale date","type":"text","value":"2026-10-01"},{"name":"replacementDate","label":"Replacement acquisition date","type":"text","value":"2026-10-20"},{"name":"sharesSold","label":"Shares sold at loss","type":"number","value":100,"min":1e-06,"max":1000000000000},{"name":"replacementShares","label":"Replacement shares acquired","type":"number","value":60,"min":0,"max":1000000000000},{"name":"lossAmount","label":"Total realized loss ($, positive magnitude)","type":"number","value":2000,"min":0,"max":1000000000000000}],
  compute:calculate,
  resultTitle:"Wash Sale & Holding Period Date Calculator results"
});
