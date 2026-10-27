import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0425",
  "name": "Landlord Notice Period & Service-Date Calculator",
  "variant": "timeline",
  "tagline": "Service-aware deadline planner",
  "action": "Check schedule",
  "fields": [
    {
      "key": "jurisdiction",
      "label": "Jurisdiction and ground",
      "default": "England - ground-specific",
      "type": "text",
      "help": ""
    },
    {
      "key": "served",
      "label": "Document date",
      "default": "2026-11-01",
      "type": "date",
      "help": ""
    },
    {
      "key": "serviceLag",
      "label": "Deemed service delay",
      "default": 2,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 60,
      "step": "any",
      "unit": "days"
    },
    {
      "key": "noticeDays",
      "label": "Verified minimum notice period",
      "default": 60,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 730,
      "step": "any",
      "unit": "calendar days"
    },
    {
      "key": "proposed",
      "label": "Proposed notice expiry",
      "default": "2027-01-10",
      "type": "date",
      "help": ""
    }
  ]
};
mount(config,calculate);
