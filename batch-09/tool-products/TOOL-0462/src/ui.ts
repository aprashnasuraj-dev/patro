import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0462",
  "name": "Statute of Limitations Deadline Calculator",
  "variant": "timeline",
  "tagline": "User-defined limitations period; no invented state law",
  "action": "Estimate civil deadline",
  "fields": [
    {
      "key": "jurisdiction",
      "label": "Court, jurisdiction and cause of action",
      "default": "Jurisdiction + claim type (verify law)",
      "type": "text",
      "help": ""
    },
    {
      "key": "accrual",
      "label": "Accrual or legally applicable start date",
      "default": "2025-01-15",
      "type": "date",
      "help": ""
    },
    {
      "key": "years",
      "label": "Verified statutory calendar years",
      "default": 2,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "years"
    },
    {
      "key": "months",
      "label": "Additional calendar months",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 119,
      "step": "any",
      "unit": "months"
    },
    {
      "key": "days",
      "label": "Additional calendar days",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 365,
      "step": "any",
      "unit": "days"
    },
    {
      "key": "tolling",
      "label": "Verified tolled calendar days",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 3650,
      "step": "any",
      "unit": "days"
    },
    {
      "key": "filingRule",
      "label": "Verified deadline adjustment",
      "default": "none",
      "type": "select",
      "help": "",
      "options": [
        "none",
        "next-weekday illustrative"
      ]
    }
  ]
};
mount(config,calculate);
