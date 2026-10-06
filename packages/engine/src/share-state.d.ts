export const JANMAPATRO_SHARE_VERSION:number;
export const JANMAPATRO_SHARE_PARAM:string;
export const JANMAPATRO_MAX_SHARE_BYTES:number;
export function encodeJanmaPatroShareState(state:Record<string,unknown>):string;
export function decodeJanmaPatroShareState(token:string):Record<string,unknown>;
export function createJanmaPatroShareHash(state:Record<string,unknown>):string;
export function createJanmaPatroShareUrl(baseUrl:string,state:Record<string,unknown>):string;
export function readJanmaPatroShareState(input:string|{hash:string}):Record<string,unknown>|null;
