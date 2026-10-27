import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0459",
  "name": "I-9 Reverification & Retention Date Tracker",
  "variant": "timeline",
  "tagline": "I-9 retention and exception-aware reverification checklist",
  "action": "Review I-9 dates",
  "fields": [
    {
      "key": "hire",
      "label": "Original employment start date",
      "default": "2022-04-15",
      "type": "date",
      "help": ""
    },
    {
      "key": "termination",
      "label": "Termination date or blank for active employee",
      "default": "2026-10-20",
      "type": "date-optional",
      "help": ""
    },
    {
      "key": "category",
      "label": "Document/status category",
      "default": "EAD / expiring employment authorization",
      "type": "select",
      "help": "",
      "options": [
        "EAD / expiring employment authorization",
        "Temporary I-551 evidence",
        "Permanent resident card",
        "US citizen / passport",
        "List B identity document",
        "Other / unknown"
      ]
    },
    {
      "key": "expires",
      "label": "Employment authorization expiration if applicable",
      "default": "2026-12-01",
      "type": "date-optional",
      "help": ""
    }
  ]
};
mount(config,calculate);
