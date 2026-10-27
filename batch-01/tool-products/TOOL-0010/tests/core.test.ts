import { describe, it, expect } from 'vitest';
import { convert } from '../src/core';

describe('Compose -> docker run subset',()=>{
 it('converts basic image service, ports, env safely',()=>{const out=convert('services:\n  web:\n    image: nginx:alpine\n    ports: ["8080:80"]\n    environment:\n      PORT: 80\n').text;expect(out).toContain('docker run');expect(out).toContain('--publish');expect(out).toContain("'PORT=80'");});
 it('rejects advanced services instead of inventing equivalence',()=>expect(()=>convert('services:\n  db:\n    build: .\n')).toThrow(/unsupported Compose key/));
 it('rejects interpolation and invalid port syntax',()=>{expect(()=>convert('services:\n  x:\n    image: "${IMAGE}"')).toThrow();expect(()=>convert('services:\n  x:\n    image: alpine\n    ports: ["random"]')).toThrow();});
 it('rejects duplicate YAML keys',()=>expect(()=>convert('services:\n  x: {image: alpine}\n  x: {image: redis}')).toThrow());
});
