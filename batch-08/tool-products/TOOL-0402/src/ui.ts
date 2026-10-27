import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"species","label":"Joist species group","type":"select","value":"southern-pine","options":[{"value":"southern-pine","label":"Southern Pine"},{"value":"df-hf-spf","label":"Douglas Fir-Larch / Hem-Fir / SPF"},{"value":"cedar-redwood","label":"Redwood / Western Cedar / Ponderosa / Red Pine"}]},{"name":"joistSize","label":"Joist size","type":"select","value":"2x8","options":[{"value":"2x6","label":"2x6"},{"value":"2x8","label":"2x8"},{"value":"2x10","label":"2x10"},{"value":"2x12","label":"2x12"}]},{"name":"spacing","label":"Joist spacing o.c. (in)","type":"select","value":"16","options":[{"value":"12","label":"12"},{"value":"16","label":"16"},{"value":"24","label":"24"}]},{"name":"joistSpanFt","label":"Actual joist clear span (ft)","type":"number","value":10,"min":0.1,"max":30,"step":0.01},{"name":"beamSize","label":"Southern Pine beam","type":"select","value":"2-2x10","options":[{"value":"2-2x6","label":"2-2x6"},{"value":"2-2x8","label":"2-2x8"},{"value":"2-2x10","label":"2-2x10"},{"value":"2-2x12","label":"2-2x12"},{"value":"3-2x6","label":"3-2x6"},{"value":"3-2x8","label":"3-2x8"},{"value":"3-2x10","label":"3-2x10"},{"value":"3-2x12","label":"3-2x12"}]},{"name":"beamSpanFt","label":"Actual beam post-to-post span (ft)","type":"number","value":8,"min":0.1,"max":30,"step":0.01}],
  compute:calculate,
  resultTitle:"Deck Joist & Beam Span Checker results"
});
