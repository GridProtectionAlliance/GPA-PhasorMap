import { Field, getDisplayProcessor } from '@grafana/data';
import { IDataVisualizationSettings } from 'Settings';
import chroma from 'chroma-js';
import _ from 'lodash';

export class PhasorClock {
  private baseColor: string;
  private arrowColor: Map<number,string>;
  private secondaryColor: string;
  private showArrow: boolean;
  private showHeatmap: boolean;
  private heatMapData: Map<string, number>;
  private value: Map<number,[number, number]>;
  private arrowWidth: number;
  private angLines: number[];
  private scale: number;
  private circleRadius: number[];
  private nominal: number;

  private magnitudes: Map<number,number[]>;
  private angles: Map<number,number[]>;

  private phasorIndices: number[];
  Radius: number;
  Longitude: number;
  Latitude: number;

  constructor(fld: Field|undefined, lat: number, long: number, size: number, value: number ) {
    this.baseColor = "white";
    this.arrowColor = new Map<number,string>()
    this.arrowColor.set(1,"red");
    this.secondaryColor = "black";
    this.showArrow = true;
    this.showHeatmap = false;
    this.heatMapData = new Map<string,number>();

    this.phasorIndices = [1];
    this.value = new Map<number,[number,number]>();
    this.value.set(1,[0,10]);
    this.Radius = 10;
    this.scale = 1;
    this.nominal = 1.0;
    this.arrowWidth = 1;
    this.angLines = [];
    this.circleRadius = [];

    this.magnitudes = new Map<number,number[]>();
    this.angles = new Map<number,number[]>();

    this.Longitude = long;
    this.Latitude = lat;
    this.ProcessField(fld, size, value);
  }

  AddField(fld: Field|undefined, size: number, value: number) {
    if (fld == undefined)
      return;
    this.ProcessField(fld,size, value);
  }
  DrawIcon(): string {
    let magCircles = this.circleRadius.map((r,i) => `<circle cx="${this.Radius}" cy="${this.Radius}" stroke-width="1" stroke="${this.secondaryColor}" r="${this.scale*r}" fill='none'/>`).join(" ");
    magCircles = magCircles + ` <circle cx="${this.Radius}" cy="${this.Radius}" stroke-width="1" stroke="${this.secondaryColor}" r="${this.scale*this.nominal}" fill='none'/>`
    

    const angLines = this.angLines.map((a,i) => `<g transform="${`rotate(-${a}, ${this.Radius} ${this.Radius})`}"><line x1="${this.Radius}" y1="${this.Radius}" x2="${2*this.Radius}" y2="${this.Radius}" stroke-width="1" stroke="${this.secondaryColor}"/></g>`).join(" ");
 
    // Generate Arrow
    const arrow = this.generateArrow();
    const heatmap = this.generateHeatmap();

    return `<svg style="width: ${2*this.Radius}px; height: ${2*this.Radius}px"> <circle r="${this.Radius}" fill='${this.baseColor}' cx="${this.Radius}" cy="${this.Radius}"/> ${this.showHeatmap? heatmap : ""} ${magCircles} ${angLines} ${this.showArrow? arrow : ""} </svg>`;
  }

  private generateArrow() {
    const arrowLength = Math.min(this.arrowWidth*10,this.Radius*0.2);
    const arrowHeight = 0.7*arrowLength*0.5;

    let result = "";
    this.phasorIndices.forEach(pi => {
      let val: [number,number] = this.value.get(pi) ?? [0,0];
      let arrowColor: string = this.arrowColor.get(pi) ?? "red";

      result += `<g transform="rotate(-${val[1]}, ${this.Radius} ${this.Radius})">`;
      result += `<line x1="${this.Radius}" y1="${this.Radius}" x2="${this.Radius + this.scale*val[0] - arrowLength}" y2="${this.Radius}" stroke-width="${this.arrowWidth}" stroke="${arrowColor}"/>`
      result +=`<polygon points="${this.Radius + this.scale*val[0]} ${this.Radius}, ${this.Radius + this.scale*val[0] - arrowLength} ${this.Radius - arrowHeight}, ${this.Radius + this.scale*val[0] - arrowLength} ${this.Radius + arrowHeight}" fill="${arrowColor}"/>`
      result += "</g>";
    });

    return result;
  }

  private generateHeatmap() {
    let heatMapMax = 2;
    this.heatMapData.forEach(item => {if (item > heatMapMax) heatMapMax = item;});

    const color = chroma.scale('RdYlBu').domain([1,heatMapMax], 7, 'quantiles')

    let result = "";
    if (this.heatMapData.has("0"))
      result = result + `<circle cx="${this.Radius}" cy="${this.Radius}" strokeWidth="0" fillOpacity="1" r="${this.scale*(this.circleRadius[0]?? 0)}" fill="${color(this.heatMapData.get("0")).toString()}"/>`

    this.heatMapData.forEach((val, key) => {
        if (key == "0")
          return;
        let s = key.split("-");
        const iPhase = parseInt(s[0]);
        const iMag = parseInt(s[1]);
        const ri = this.scale*this.circleRadius[iMag - 1];
        const ro = this.scale*(iMag < this.circleRadius.length? this.circleRadius[iMag] : this.Radius/this.scale);
        const ang = iPhase > 0? this.angLines[iPhase -1] : this.angLines[this.angLines.length -1];
        //const dr = ro - ri;
        const dt = this.angLines[0] - this.angLines[1];
        const xEndI = this.Radius + ri*Math.cos(dt*Math.PI/180.0);
        const yEndI = this.Radius + ri*Math.sin(dt*Math.PI/180.0);
        const xEndO = this.Radius + ro*Math.cos(dt*Math.PI/180.0);
        const yEndO = this.Radius + ro*Math.sin(dt*Math.PI/180.0);
        result = result + ` <path `
        result = result + `d="M ${this.Radius + ri} ${this.Radius} A ${ri} ${ri} 0 0 0 ${xEndI} ${yEndI} L ${xEndO} ${yEndO} A ${ro} ${ro} 0 0 1 ${this.Radius + ro} ${this.Radius} Z"`;
        result = result + `  fill="${color(val).toString()}"`
        result = result + `  transform="rotate(-${ang}, ${this.Radius} ${this.Radius})"`
        result = result + ` />`
  
      });
    return result;
  }

  private ProcessField(fld: Field| undefined, size: number, value: number) {
    if (fld == undefined)
      return;

    if ((fld.config.custom["DataVis"] as IDataVisualizationSettings).type == 'phasorMag')
      this.ProcessMagnitudeField(fld, size, value);
    if ((fld.config.custom["DataVis"] as IDataVisualizationSettings).type == 'phasorAng')
      this.ProcessPhaseField(fld, size, value);

    this.ProcessHeatMaps();
  }

  private ProcessMagnitudeField(fld: Field, size: number, value: number) {
    const options = (fld.config.custom["DataVis"] as IDataVisualizationSettings)
    const display = fld?.display ?? getDisplayProcessor({ field: fld  });

    const phasorIndex = options.phasorIndex ?? 1;

    let v = this.value.get(phasorIndex) ?? [0, 0];
    v[0] = value;
    this.value.set(phasorIndex,v);

    if (!this.phasorIndices.includes(phasorIndex))
      this.phasorIndices.push(phasorIndex);
    
    this.magnitudes.set(phasorIndex, fld.values.toArray());
    // Compute Radius and Circle color based on Field
    this.Radius = size;
    this.nominal = options.nominalVoltage ?? 161;
    this.baseColor = display(value).color ?? "#000000";

    // Add Mangitude Rings
    let vmax = 0;
    this.phasorIndices.map(pi => (this.value.get(pi) ?? [0,0])[0] as number).forEach(v => { if (vmax < v) vmax = v;});

    this.circleRadius = [];

    for (let r = (options.startMagnitude?? 140); r < Math.max(vmax, this.nominal); r = r + (options.stepMagnitude ?? 10)) {
      this.circleRadius.push(r);
      if (this.circleRadius.length > 100)
        break;
    }

    // Compute Scaling:
    this.scale = this.Radius / Math.max(vmax, this.nominal);

  }

  private ProcessPhaseField(fld: Field, size: number, value: number) {
    const options = (fld.config.custom["DataVis"] as IDataVisualizationSettings)
    const display = fld?.display ?? getDisplayProcessor({ field: fld  });

    const phasorIndex = options.phasorIndex ?? 1;

    this.secondaryColor = options.secondaryColor ?? "#ffffff";
    this.showArrow = false;
    if (options.show == undefined || options.show == 'both' || options.show == 'value')
      this.showArrow = true;
    this.showHeatmap = false;
      if (options.show == 'both' || options.show == 'heatmap')
        this.showHeatmap = true;

    let ang = value;
    while (ang < 0)
      ang = ang + 360;

    let v = this.value.get(phasorIndex) ?? [0, 0];
    v[1] = ang;
    this.value.set(phasorIndex,v);

    if (!this.phasorIndices.includes(phasorIndex))
      this.phasorIndices.push(phasorIndex);

    this.angles.set(phasorIndex,fld.values.toArray().map((v) => {
      let ang = v;
      while (ang < 0)
        ang = ang + 360;
      return ang;
    }))

    //Compute Color and size of Arrow
    this.arrowWidth = size*0.1;
    this.arrowColor.set(phasorIndex, display(value).color ?? "#ffffff");

    // Add Phase Lines
    this.angLines = [];
    const step = 360.0/(options.angleSegments ?? 4);
    for (let r = 0; r < 360.0; r = r + step) {
      this.angLines.push(r);
    }
   
    
  }

  private ProcessHeatMaps() {

    this.heatMapData = new Map<string, number>();


    if (this.magnitudes.size == 0 && this.angles.size == 0) 
      return;
    
    this.phasorIndices.forEach(pI => {
     
      let m = this.magnitudes.get(pI) ?? [];
      let p = this.angles.get(pI) ?? [];
      if (m.length == 0 && p.length == 0)
        return;
          
      if (m.length > p.length)
        p = m.map((v,i) => i >= p.length? 0 : p[i]);
      if (p.length > m.length)
        m = p.map((v,i) => i >= m.length? this.nominal : m[i]);

    p.forEach((v,i) => {
      let iPhase = this.angLines.findIndex( a => a > v);

      if (iPhase == -1)
        iPhase = 0;

      let iMag = this.circleRadius.findIndex(r => r > m[i]);
      if (iMag == -1)
        iMag = this.circleRadius.length;

      let key: string;

      if (m[i] < (this.circleRadius[0] ?? 100 ))
        key = "0";
      else
        key = iPhase.toString() + "-" + iMag.toString();

        this.heatMapData.set(key,(this.heatMapData.get(key)?? 0) + 1);
    })

    })
  }
}