import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0467",
  "name": "Professional Exam Study Schedule Generator",
  "variant": "timeline",
  "tagline": "Balanced countdown plan from available days and topic weights",
  "action": "Schedule study time",
  "fields": [
    {
      "key": "start",
      "label": "Study start date",
      "default": "2026-11-01",
      "type": "date",
      "help": ""
    },
    {
      "key": "exam",
      "label": "Exam date",
      "default": "2027-01-31",
      "type": "date",
      "help": ""
    },
    {
      "key": "weekdays",
      "label": "Study days, Monday=1 to Sunday=7",
      "default": "123456",
      "type": "text",
      "help": ""
    },
    {
      "key": "hours",
      "label": "Study hours on each eligible day",
      "default": 2,
      "type": "number",
      "help": "",
      "min": 0.25,
      "max": 12,
      "step": "any",
      "unit": "h"
    },
    {
      "key": "topic1",
      "label": "Module A weight",
      "default": 50,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "topic2",
      "label": "Module B weight",
      "default": 30,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "topic3",
      "label": "Module C weight",
      "default": 20,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "needed",
      "label": "Verified target study hours",
      "default": 120,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 5000,
      "step": "any",
      "unit": "h"
    }
  ]
};
mount(config,calculate);
