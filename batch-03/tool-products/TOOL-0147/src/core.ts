import { loadPdfLib } from '../_vendor/pdf';
export async function flatten(file:File,updateAppearances=true):Promise<Blob>{const {doc}=await loadPdfLib(file);const form=doc.getForm();const fields=form.getFields();if(!fields.length)throw new Error('No AcroForm fields found.');if(updateAppearances){try{form.updateFieldAppearances()}catch{}}form.flatten();return new Blob([await doc.save()],{type:'application/pdf'});}

