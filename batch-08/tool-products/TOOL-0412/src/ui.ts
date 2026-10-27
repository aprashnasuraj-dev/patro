import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"filingStatus","label":"2026 filing status","type":"select","value":"single","options":[{"value":"single","label":"Single"},{"value":"mfj","label":"Married filing jointly / qualifying surviving spouse"},{"value":"mfs","label":"Married filing separately"},{"value":"hoh","label":"Head of household"}]},{"name":"cumulativeAgi","label":"Cumulative AGI: Mar, May, Aug, Dec","type":"text","value":"15000,30000,60000,100000"},{"name":"cumulativeDeductions","label":"Cumulative itemized deductions for same periods","type":"text","value":"3000,5000,8000,12000"},{"name":"standardDeduction","label":"Full-year standard deduction to compare (user-entered)","type":"number","value":0,"min":0,"max":200000,"help":"Enter the applicable 2026 amount if you want the model to compare it with annualized itemized deductions; 0 means itemized-only planning."},{"name":"annualizedCredits","label":"Credits after annualization, 4 values","type":"text","value":"0,0,0,0"},{"name":"annualizedOtherTaxes","label":"SE/AMT/other tax for each annualized period, 4 values","type":"text","value":"0,0,0,0"},{"name":"requiredAnnualPayment","label":"Regular-method required annual payment ($)","type":"number","value":18000,"min":0,"max":1000000000}],
  compute:calculate,
  resultTitle:"Form 2210 Annualized Income Installment Calculator results"
});
