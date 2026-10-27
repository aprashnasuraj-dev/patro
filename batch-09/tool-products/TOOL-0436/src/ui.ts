import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0436",
  "name": "Hours-of-Service Planner (US FMCSA & UK/EU)",
  "variant": "timeline",
  "tagline": "Compliance window planning",
  "action": "Check schedule",
  "fields": [
    {
      "key": "regime",
      "label": "Regulation set",
      "default": "US",
      "type": "select",
      "help": "",
      "options": [
        "US",
        "EU",
        "UK_EU"
      ]
    },
    {
      "key": "driveToday",
      "label": "Driving already completed today",
      "default": 6,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 24,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "sinceBreak",
      "label": "Driving since qualifying rest/break",
      "default": 3,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 24,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "shiftElapsed",
      "label": "US consecutive hours since duty start",
      "default": 9,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 48,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "dutyCycleBefore",
      "label": "US prior 8-day on-duty hours (before this shift)",
      "default": 42,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "dutyThisShift",
      "label": "US on-duty hours this shift",
      "default": 9,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 24,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "weekDrive",
      "label": "EU week total including today",
      "default": 29,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "fortnightDrive",
      "label": "EU 2-week total including today",
      "default": 64,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 150,
      "step": "any",
      "unit": "hours"
    }
  ]
};
mount(config,calculate);
