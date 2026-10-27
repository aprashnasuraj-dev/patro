import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"areaSqFt","label":"Installed area (ft²)","type":"number","value":200,"min":0.01,"max":1000000},{"name":"pieceLengthIn","label":"Tile/plank length (in)","type":"number","value":24,"min":0.1,"max":240},{"name":"pieceWidthIn","label":"Tile/plank width (in)","type":"number","value":6,"min":0.1,"max":240},{"name":"pattern","label":"Pattern","type":"select","value":"herringbone","options":[{"value":"straight","label":"Straight"},{"value":"diagonal","label":"Diagonal"},{"value":"herringbone","label":"Herringbone"}]},{"name":"useSuggested","label":"Use planning waste preset","type":"checkbox","value":true},{"name":"wastePct","label":"Custom waste (%)","type":"number","value":15,"min":0,"max":100}],
  compute:calculate,
  resultTitle:"Herringbone/Diagonal Tile & Plank Waste Calculator results"
});
