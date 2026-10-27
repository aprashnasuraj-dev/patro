import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0434",
  "name": "EV Home Charging Cost & Circuit Sizing",
  "variant": "gauge",
  "tagline": "Plan charging kWh, cost and electrical envelope",
  "action": "Check scenario",
  "fields": [
    {
      "key": "miles",
      "label": "Travel miles per day",
      "default": 40,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 2000,
      "step": "any",
      "unit": "mi"
    },
    {
      "key": "vehicleKwh100",
      "label": "Battery energy per 100 miles",
      "default": 30,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 150,
      "step": "any",
      "unit": "kWh/100 mi"
    },
    {
      "key": "effPct",
      "label": "Charging efficiency estimate",
      "default": 88,
      "type": "number",
      "help": "",
      "min": 50,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "price",
      "label": "All-in energy tariff",
      "default": 0.2,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 20,
      "step": "any",
      "unit": "$/kWh"
    },
    {
      "key": "chargerKw",
      "label": "Rated charger output",
      "default": 7.2,
      "type": "number",
      "help": "",
      "min": 0.1,
      "max": 50,
      "step": "any",
      "unit": "kW"
    },
    {
      "key": "voltage",
      "label": "Nominal supply voltage",
      "default": 240,
      "type": "number",
      "help": "",
      "min": 100,
      "max": 500,
      "step": "any",
      "unit": "V"
    },
    {
      "key": "breakerAmps",
      "label": "Existing circuit rating",
      "default": 40,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 500,
      "step": "any",
      "unit": "A"
    }
  ]
};
mount(config,calculate);
