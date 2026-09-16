export type InspectedUpload = {
  format:string;
  mime:string;
  signatureValid:boolean;
  pixelWidth:number;
  pixelHeight:number;
  embeddedDpi:number|null;
  hasAlpha:boolean|null;
  previewable:boolean;
};

function u32be(b:Uint8Array,o:number){return ((b[o]<<24)>>>0)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3];}
function png(b:Uint8Array):InspectedUpload|null{
  const sig=[137,80,78,71,13,10,26,10];if(b.length<26||!sig.every((v,i)=>b[i]===v))return null;
  const width=u32be(b,16),height=u32be(b,20),colorType=b[25];let dpi:number|null=null;
  let o=8;while(o+12<=b.length){const len=u32be(b,o);const type=String.fromCharCode(...b.slice(o+4,o+8));if(type==="pHYs"&&len>=9&&o+17<=b.length){const ppm=u32be(b,o+8);const unit=b[o+16];if(unit===1&&ppm>0)dpi=Math.round(ppm*0.0254*100)/100;}o+=12+len;if(o>b.length)break;}
  return {format:"png",mime:"image/png",signatureValid:true,pixelWidth:width,pixelHeight:height,embeddedDpi:dpi,hasAlpha:colorType===4||colorType===6,previewable:true};
}
function jpeg(b:Uint8Array):InspectedUpload|null{
  if(b.length<4||b[0]!==0xff||b[1]!==0xd8)return null;let o=2,width=0,height=0,dpi:number|null=null;
  while(o+4<=b.length){if(b[o]!==0xff){o++;continue;}const marker=b[o+1];if(marker===0xd9||marker===0xda)break;const len=(b[o+2]<<8)|b[o+3];if(len<2||o+2+len>b.length)break;
    if(marker===0xe0&&len>=14&&String.fromCharCode(...b.slice(o+4,o+9))==="JFIF\0"){const units=b[o+11],xd=(b[o+12]<<8)|b[o+13];if(xd>0)dpi=units===1?xd:units===2?Math.round(xd*2.54*100)/100:null;}
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&len>=7){height=(b[o+5]<<8)|b[o+6];width=(b[o+7]<<8)|b[o+8];break;}o+=2+len;
  }
  return {format:"jpg",mime:"image/jpeg",signatureValid:true,pixelWidth:width,pixelHeight:height,embeddedDpi:dpi,hasAlpha:false,previewable:true};
}
function webp(b:Uint8Array):InspectedUpload|null{
  if(b.length<30||String.fromCharCode(...b.slice(0,4))!=="RIFF"||String.fromCharCode(...b.slice(8,12))!=="WEBP")return null;
  const kind=String.fromCharCode(...b.slice(12,16));let width=0,height=0,alpha:null|boolean=null;
  if(kind==="VP8X"&&b.length>=30){alpha=Boolean(b[20]&0x10);width=1+b[24]+(b[25]<<8)+(b[26]<<16);height=1+b[27]+(b[28]<<8)+(b[29]<<16);}
  return {format:"webp",mime:"image/webp",signatureValid:true,pixelWidth:width,pixelHeight:height,embeddedDpi:null,hasAlpha:alpha,previewable:true};
}
function textType(b:Uint8Array):InspectedUpload|null{
  const head=new TextDecoder().decode(b.slice(0,Math.min(b.length,65536)));
  if(/^\s*%PDF-/i.test(head))return {format:"pdf",mime:"application/pdf",signatureValid:true,pixelWidth:0,pixelHeight:0,embeddedDpi:null,hasAlpha:null,previewable:true};
  if(/<svg[\s>]/i.test(head)){
    const tag=head.match(/<svg\b[^>]*>/i)?.[0]??"";const num=(name:string)=>{const m=tag.match(new RegExp(name+'\\s*=\\s*["\\\']([0-9.]+)',"i"));return m?Number(m[1]):0;};
    let width=num("width"),height=num("height");if((!width||!height)){const vb=tag.match(/viewBox\s*=\s*["']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)/i);if(vb){width=width||Number(vb[1]);height=height||Number(vb[2]);}}
    return {format:"svg",mime:"image/svg+xml",signatureValid:true,pixelWidth:Math.round(width),pixelHeight:Math.round(height),embeddedDpi:null,hasAlpha:true,previewable:true};
  }
  return null;
}
export function inspectUpload(bytes:ArrayBuffer):InspectedUpload{
  const b=new Uint8Array(bytes);return png(b)||jpeg(b)||webp(b)||textType(b)||{format:"unknown",mime:"application/octet-stream",signatureValid:false,pixelWidth:0,pixelHeight:0,embeddedDpi:null,hasAlpha:null,previewable:false};
}
