import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0485",
  "name": "BBQ Reverse Cook Schedule Planner",
  "variant": "timeline",
  "tagline": "Work backward from serving time",
  "action": "Plan backwards from serving",
  "fields": [
    {
      "key": "protein",
      "label": "Meat/cut",
      "default": "Whole pork roast",
      "type": "select",
      "options": [
        "Whole pork roast",
        "Whole beef brisket",
        "Ground meat",
        "Poultry"
      ],
      "help": ""
    },
    {
      "key": "serve",
      "label": "Serve at local date/time",
      "default": "2026-11-01T18:00",
      "type": "datetime-local",
      "help": "Local wall-clock time; review daylight-saving transitions."
    },
    {
      "key": "cookHours",
      "label": "Estimated active cook duration",
      "default": 8,
      "type": "number",
      "min": 0.25,
      "max": 72,
      "step": "any",
      "unit": "hours",
      "help": ""
    },
    {
      "key": "prep",
      "label": "Prep and smoker warm-up",
      "default": 45,
      "type": "number",
      "min": 0,
      "max": 480,
      "step": "any",
      "unit": "min",
      "help": ""
    },
    {
      "key": "rest",
      "label": "Rest / hold time",
      "default": 60,
      "type": "number",
      "min": 3,
      "max": 1440,
      "step": "any",
      "unit": "min",
      "help": ""
    },
    {
      "key": "buffer",
      "label": "Contingency buffer",
      "default": 90,
      "type": "number",
      "min": 0,
      "max": 720,
      "step": "any",
      "unit": "min",
      "help": ""
    },
    {
      "key": "target",
      "label": "Target internal temperature",
      "default": 203,
      "type": "number",
      "min": 32,
      "max": 250,
      "step": "any",
      "unit": "°F",
      "help": ""
    }
  ]
};
// Use next-day 18:00 local as an evergreen, non-stale example.
const day=new Date();day.setDate(day.getDate()+1);day.setHours(18,0,0,0);const local=(n:number)=>String(n).padStart(2,'0');
const dateInput=config.fields.find(f=>f.key==='serve');if(dateInput)dateInput.default=`${day.getFullYear()}-${local(day.getMonth()+1)}-${local(day.getDate())}T18:00`;
mount(config,calculate);
