import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0449",
  "name": "COBRA Election & Payment Deadline Calculator",
  "variant": "timeline",
  "tagline": "Federal COBRA clocks with the later-event election trigger",
  "action": "Find COBRA deadlines",
  "fields": [
    {
      "key": "coverageEnd",
      "label": "Date health coverage ended",
      "default": "2026-10-31",
      "type": "date",
      "help": ""
    },
    {
      "key": "notice",
      "label": "Election notice provided or mailed",
      "default": "2026-11-10",
      "type": "date",
      "help": ""
    },
    {
      "key": "elect",
      "label": "Date coverage was elected (optional)",
      "default": "",
      "type": "date-optional",
      "help": ""
    },
    {
      "key": "noticeRule",
      "label": "Federal COBRA applicability confirmed?",
      "default": "yes",
      "type": "select",
      "help": "",
      "options": [
        "yes",
        "unknown"
      ]
    }
  ]
};
mount(config,calculate);
