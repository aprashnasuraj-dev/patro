import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0455",
  "name": "Clear Aligner Schedule Planner",
  "variant": "timeline",
  "tagline": "Dentist-approved clear aligner change calendar",
  "action": "Build tray calendar",
  "fields": [
    {
      "key": "start",
      "label": "First tray start date",
      "default": "2026-11-01",
      "type": "date",
      "help": ""
    },
    {
      "key": "trays",
      "label": "Total aligner trays",
      "default": 18,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 60,
      "step": "any",
      "unit": ""
    },
    {
      "key": "days",
      "label": "Prescribed whole days per tray",
      "default": 10,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 60,
      "step": "any",
      "unit": ""
    },
    {
      "key": "pause",
      "label": "Confirmed non-wear pause days before finish",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 90,
      "step": "any",
      "unit": ""
    },
    {
      "key": "wearHours",
      "label": "Hours worn daily under treatment plan",
      "default": 22,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 24,
      "step": "any",
      "unit": "hours"
    }
  ]
};
mount(config,calculate);
