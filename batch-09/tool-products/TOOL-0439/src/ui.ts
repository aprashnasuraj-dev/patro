import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0439",
  "name": "Money Factor to APR & True Lease Cost",
  "variant": "ledger",
  "tagline": "Automotive lease payment waterfall",
  "action": "Check scenario",
  "fields": [
    {
      "key": "cap",
      "label": "Adjusted capitalized cost after reductions",
      "default": 36000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "residual",
      "label": "Contract residual value",
      "default": 24000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "factor",
      "label": "Monthly money factor",
      "default": 0.002,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 0.1,
      "step": "any",
      "unit": ""
    },
    {
      "key": "months",
      "label": "Lease term months",
      "default": 36,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 120,
      "step": "any",
      "unit": "mo"
    },
    {
      "key": "taxPct",
      "label": "Sales/use tax applied on monthly payment",
      "default": 8,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 50,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "upfront",
      "label": "Cash paid at signing not capitalized",
      "default": 2500,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "endFee",
      "label": "Expected end-of-lease fee",
      "default": 395,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    }
  ]
};
mount(config,calculate);
