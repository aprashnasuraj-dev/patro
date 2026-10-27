import {transitions} from '../_vendor/timezone';export function findDst(year:number,zone:string){const rows=transitions(year,zone);return{year,zone,rows,hasChanges:rows.length>0}}
