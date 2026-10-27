import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0437",
  "name": "Quarterly IFTA Fuel Tax Calculator",
  "variant": "ledger",
  "tagline": "Quarterly fuel allocation ledger",
  "action": "Check scenario",
  "fields": [
    {
      "key": "quarter",
      "label": "Reporting year and quarter",
      "default": "2026-Q3",
      "type": "text",
      "help": ""
    },
    {
      "key": "fuelGallons",
      "label": "Total fuel consumed in quarter (US gallons)",
      "default": 1000,
      "type": "number",
      "help": "",
      "min": 0.01,
      "max": 100000000.0,
      "step": "any",
      "unit": "gal"
    },
    {
      "key": "records",
      "label": "Jurisdictions JSON: code, miles, ratePerGallon, taxedGallonsPurchased",
      "default": "[{\"code\":\"A\",\"miles\":3000,\"ratePerGallon\":0.4,\"taxedGallonsPurchased\":300},{\"code\":\"B\",\"miles\":4000,\"ratePerGallon\":0.5,\"taxedGallonsPurchased\":700}]",
      "type": "textarea",
      "help": ""
    }
  ]
};
mount(config,calculate);
