import fs from "node:fs/promises";
const registry=JSON.parse(await fs.readFile(new URL("../../src/mm530/mm530-registry.json",import.meta.url),"utf8")).tools;
const broad=/(tax|gst|hst|vat|withholding|wage|overtime|leave|benefit|pension|visa|medicare|ira|roth|ifta|inherit|estate|statutory|employment|labor|labour|registration threshold|safe-harbor|section 24|long service|parental)/i;
const priority=/(form 2210|safe-harbor|gst\/hst quick|registration threshold|backdoor roth|occupancy tax|ifta|paid family|maternity leave|state overtime|digital nomad visa|mega-backdoor roth|inherited ira|state and employer withholding|medicare|inherited property|uk effective marginal tax|uk section 24|uk pension|uk inheritance tax|uk shared parental|australian long service|california meal|wage claim)/i;
const candidates=registry.filter(t=>broad.test(t.title));
const out={priority:candidates.filter(t=>priority.test(t.title)),formulaFirst:candidates.filter(t=>!priority.test(t.title))};
console.log(JSON.stringify({tools:registry.length,priority:out.priority.length,formulaFirst:out.formulaFirst.length},null,2));
