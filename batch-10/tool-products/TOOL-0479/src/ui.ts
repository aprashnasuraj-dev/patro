import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {attachSpecial} from './special';
const config:Config={
  "id": "TOOL-0479",
  "name": "Commercial Invoice & CN22/CN23 Generator",
  "variant": "ledger",
  "tagline": "Local printable commercial invoice and customs worksheet",
  "action": "Prepare customs totals",
  "fields": [
    {
      "key": "sender",
      "label": "Exporter name and address",
      "default": "Exporter Ltd; Address; Country",
      "type": "text",
      "help": ""
    },
    {
      "key": "recipient",
      "label": "Consignee name and address",
      "default": "Importer Inc; Address; Country",
      "type": "text",
      "help": ""
    },
    {
      "key": "currency",
      "label": "ISO currency code",
      "default": "USD",
      "type": "text",
      "help": ""
    },
    {
      "key": "invoice",
      "label": "Invoice number",
      "default": "INV-001",
      "type": "text",
      "help": ""
    },
    {
      "key": "items",
      "label": "Description|quantity|unit price|HS code|origin ISO2|net kg",
      "default": "Cotton shirt|3|12.5|610910|NP|0.75",
      "type": "textarea",
      "help": ""
    },
    {
      "key": "reason",
      "label": "Shipment type",
      "default": "sale",
      "type": "select",
      "help": "",
      "options": [
        "sale",
        "gift",
        "sample",
        "return"
      ]
    }
  ]
};
mount(config,calculate);
attachSpecial(config.id);
