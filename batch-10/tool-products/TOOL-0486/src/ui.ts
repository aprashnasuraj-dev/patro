import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0486",
  "name": "Digital Nomad Visa Eligibility Matcher",
  "variant": "compare",
  "tagline": "Country-specific remote-work screening · 2026",
  "action": "Match programme requirements",
  "fields": [
    {
      "key": "country",
      "label": "Country programme",
      "default": "Spain",
      "type": "select",
      "options": [
        "Spain",
        "Estonia",
        "Portugal"
      ],
      "help": ""
    },
    {
      "key": "employment",
      "label": "Remote work arrangement",
      "default": "Employee",
      "type": "select",
      "options": [
        "Employee",
        "Independent professional"
      ],
      "help": ""
    },
    {
      "key": "external",
      "label": "Work performed remotely for organisations abroad",
      "default": "Yes",
      "type": "select",
      "options": [
        "Yes",
        "No",
        "Not sure"
      ],
      "help": ""
    },
    {
      "key": "monthly",
      "label": "Documented monthly income in EUR",
      "default": 4200,
      "type": "number",
      "min": 0,
      "max": 1000000,
      "step": "any",
      "unit": "EUR/month",
      "help": ""
    },
    {
      "key": "dependents",
      "label": "Accompanying family members",
      "default": 0,
      "type": "number",
      "min": 0,
      "max": 20,
      "step": "any",
      "unit": "count",
      "help": ""
    },
    {
      "key": "spainClient",
      "label": "Spanish-client share, if independent professional",
      "default": 0,
      "type": "number",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%",
      "help": ""
    },
    {
      "key": "months",
      "label": "Months of relevant existing work relationship",
      "default": 12,
      "type": "number",
      "min": 0,
      "max": 240,
      "step": "any",
      "unit": "months",
      "help": ""
    },
    {
      "key": "portugalThreshold",
      "label": "Portugal verified minimum income (enter current EUR)",
      "default": 0,
      "type": "number",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "EUR/month",
      "help": "Confirm current Portuguese minimum via consulate; sample value is not an official threshold."
    }
  ]
};
mount(config,calculate);
