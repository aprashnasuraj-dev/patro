import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0457",
  "name": "Final Paycheck & PTO Payout Deadline Calculator",
  "variant": "timeline",
  "tagline": "Final pay amount plus jurisdiction-confirmed deadline",
  "action": "Check final-pay scenario",
  "fields": [
    {
      "key": "jurisdiction",
      "label": "State/territory and policy reference",
      "default": "User verified",
      "type": "text",
      "help": ""
    },
    {
      "key": "end",
      "label": "Last employment date",
      "default": "2026-10-31",
      "type": "date",
      "help": ""
    },
    {
      "key": "method",
      "label": "Verified due-date rule",
      "default": "regular-payday",
      "type": "select",
      "help": "",
      "options": [
        "regular-payday",
        "calendar-days"
      ]
    },
    {
      "key": "payday",
      "label": "Next normal payday",
      "default": "2026-11-06",
      "type": "date",
      "help": ""
    },
    {
      "key": "days",
      "label": "Calendar days after separation if verified",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 180,
      "step": "any",
      "unit": ""
    },
    {
      "key": "unpaid",
      "label": "Unpaid final gross wages",
      "default": 2000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000000.0,
      "step": "any",
      "unit": "currency"
    },
    {
      "key": "ptoHours",
      "label": "Earned payable unused PTO hours",
      "default": 20,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 2000,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "ptoRate",
      "label": "PTO hourly conversion rate",
      "default": 25,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10000,
      "step": "any",
      "unit": "currency/hour"
    }
  ]
};
mount(config,calculate);
