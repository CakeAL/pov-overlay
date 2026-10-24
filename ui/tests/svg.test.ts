// @vitest-environment jsdom
import {describe,it,expect} from 'vitest';
import {sanitizeSvg} from '../infrastructure/svg';
import {bindSvg} from '../domain/svgBindings';
import {TELEMETRY_STRIP} from '../domain/telemetryStrip';
describe('SVG templates',()=>{
 it('retains placeholders, local gradients and aspect ratio',()=>{const svg=sanitizeSvg('<svg viewBox="0 0 400 100"><defs><linearGradient id="g"/></defs><text fill="url(#g)">{$Speed}</text></svg>');expect(svg.aspectRatio).toBe(4);expect(svg.source).toContain('{$Speed}');expect(svg.source).toContain('url(#g)');});
 it('removes scripts, foreign HTML, external resources and event handlers',()=>{const svg=sanitizeSvg('<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(1)</script><foreignObject><div>bad</div></foreignObject><image href="https://example.com/a.png"/><rect style="fill:url(https://example.com/x)"/></svg>');expect(svg.source).not.toContain('alert');expect(svg.source).not.toContain('foreignObject');expect(svg.source).not.toContain('https://');});
 it('binds telemetry in text and transforms, and handles unavailable data',()=>{const svg=sanitizeSvg(TELEMETRY_STRIP);const value=bindSvg(svg.source,{timestampMs:0,latitude:31,longitude:121,elevation:20,speedMps:10,headingDeg:90,distanceMeters:1200,segment:0},5,'#ffffff');expect(value).toContain('36.0');expect(value).toContain('rotate(90.0');expect(value).toContain('1.20');expect(bindSvg(svg.source,null,0,'#ffffff')).toContain('—');});
 it('rejects malformed markup, invalid dimensions and unknown fields',()=>{expect(()=>sanitizeSvg('<html/>')).toThrow();expect(()=>sanitizeSvg('<svg viewBox="0 0 -1 1"/>')).toThrow();expect(()=>sanitizeSvg('<svg><text>{$Unknown}</text></svg>')).toThrow();});
});
