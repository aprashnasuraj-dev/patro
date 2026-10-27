import {validateEndpoint,parseProtocols} from './core.js';
const form=document.getElementById('tool-form'),output=document.getElementById('output'),status=document.getElementById('status');
const connect=document.getElementById('connect'),send=document.getElementById('send'),disconnect=document.getElementById('disconnect');
const copy=document.getElementById('copy'),download=document.getElementById('download');
form.addEventListener('submit',e=>e.preventDefault());
let socket=null,lines=[],idle=null,session=0; const limitMessages=200;
function append(kind,data){const text=typeof data==='string'?data:JSON.stringify(data);const line=`${new Date().toISOString()}  ${kind}  ${text.slice(0,8192)}`;lines.push(line);if(lines.length>limitMessages)lines.shift();output.textContent=lines.join('\n');output.scrollTop=output.scrollHeight;copy.disabled=download.disabled=!lines.length;}
function state(connected){connect.disabled=connected;send.disabled=!connected;disconnect.disabled=!connected;}
function close(reason){session++;clearTimeout(idle);if(socket){try{socket.close(1000,'Client closed');}catch{}socket=null;}state(false);status.textContent=reason;}
connect.addEventListener('click',()=>{try{if(socket)close('Previous connection closed.');const url=validateEndpoint(form.elements.namedItem('endpoint').value),protocols=parseProtocols(form.elements.namedItem('protocols').value);const id=++session;socket=new WebSocket(url,protocols);socket.binaryType='arraybuffer';state(false);connect.disabled=true;disconnect.disabled=false;status.textContent='Connecting to selected endpoint…';append('CONNECT',url);
socket.addEventListener('open',()=>{if(id!==session)return;state(true);append('OPEN',`subprotocol=${socket.protocol||'(none)'}`);status.textContent='Connected; messages are sent only when Send is clicked.';});
socket.addEventListener('message',e=>{if(id!==session)return;if(typeof e.data==='string')append('RECEIVED',e.data);else append('BINARY',`${e.data.byteLength} bytes (content not displayed)`);});
socket.addEventListener('error',()=>{if(id===session){append('ERROR','Browser reported a connection error (inspect endpoint and browser devtools).');status.textContent='Connection error; browsers hide some details.';}});
socket.addEventListener('close',e=>{if(id!==session)return;append('CLOSE',`code=${e.code} clean=${e.wasClean}`);close('Disconnected.');});
idle=setTimeout(()=>{append('LIMIT','Five-minute connection limit.');close('Connection automatically closed after five minutes.');},300000);
}catch(e){status.textContent=e.message;append('ERROR',e.message);state(false);}});
send.addEventListener('click',()=>{const data=form.elements.namedItem('message').value;if(!socket||socket.readyState!==WebSocket.OPEN){status.textContent='Connect before sending.';return;}if(new TextEncoder().encode(data).length>16384){status.textContent='Text frame exceeds 16 KiB limit.';return;}if(socket.bufferedAmount>1048576){status.textContent='Outgoing buffer exceeds 1 MiB; wait for the socket to drain.';return;}socket.send(data);append('SENT',data);});
disconnect.addEventListener('click',()=>{append('CLOSE','User requested disconnect.');close('Disconnected by user.');});
document.getElementById('clear').addEventListener('click',()=>{lines=[];output.textContent='Log cleared.';copy.disabled=download.disabled=true;});
copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(lines.join('\n'));status.textContent='Log copied.';}catch{status.textContent='Copy blocked; select the log manually.';}});
download.addEventListener('click',()=>{const b=new Blob([lines.join('\n')],{type:'text/plain'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='websocket-log.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);});
window.addEventListener('pagehide',()=>close('Page closed.'));
