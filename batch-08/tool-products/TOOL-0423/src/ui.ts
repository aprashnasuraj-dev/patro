import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0423",
  "name": "Rent Increase Cap & Notice Calculator",
  "variant": "timeline",
  "tagline": "Rent proposal compliance scenario",
  "action": "Check schedule",
  "fields": [
    {
      "key": "jurisdiction",
      "label": "Jurisdiction / local rule citation",
      "default": "User-verified rule",
      "type": "text",
      "help": ""
    },
    {
      "key": "current",
      "label": "Existing monthly rent",
      "default": 1500,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "proposed",
      "label": "Proposed monthly rent",
      "default": 1600,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "capPct",
      "label": "Verified maximum increase",
      "default": 5,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 200,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "minDays",
      "label": "Verified minimum calendar notice",
      "default": 60,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 366,
      "step": "any",
      "unit": "days"
    },
    {
      "key": "served",
      "label": "Notice effective service date",
      "default": "2026-11-01",
      "type": "date",
      "help": ""
    },
    {
      "key": "starts",
      "label": "Proposed increase start date",
      "default": "2027-01-01",
      "type": "date",
      "help": ""
    }
  ]
};
mount(config,calculate);
