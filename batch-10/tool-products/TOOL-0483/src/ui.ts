import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0483",
  "name": "Event Space Capacity Calculator",
  "variant": "gauge",
  "tagline": "Occupant-load screening and layout limits",
  "action": "Screen event-space capacity",
  "fields": [
    {
      "key": "length",
      "label": "Room length",
      "default": 60,
      "type": "number",
      "min": 1,
      "max": 2000,
      "step": "any",
      "unit": "ft",
      "help": ""
    },
    {
      "key": "width",
      "label": "Room width",
      "default": 40,
      "type": "number",
      "min": 1,
      "max": 2000,
      "step": "any",
      "unit": "ft",
      "help": ""
    },
    {
      "key": "unavailable",
      "label": "Stage, service area and obstacles",
      "default": 300,
      "type": "number",
      "min": 0,
      "max": 1000000.0,
      "step": "any",
      "unit": "ft²",
      "help": ""
    },
    {
      "key": "layout",
      "label": "Event arrangement",
      "default": "Tables and chairs",
      "type": "select",
      "options": [
        "Standing concentrated",
        "Chairs only",
        "Tables and chairs"
      ],
      "help": ""
    },
    {
      "key": "planning",
      "label": "Realistic planning area per guest",
      "default": 18,
      "type": "number",
      "min": 2,
      "max": 100,
      "step": "any",
      "unit": "ft²/person",
      "help": ""
    },
    {
      "key": "approved",
      "label": "Approved occupancy from venue (0 = unknown)",
      "default": 0,
      "type": "number",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "persons",
      "help": ""
    }
  ]
};
mount(config,calculate);
import {installView} from './view';
installView();
