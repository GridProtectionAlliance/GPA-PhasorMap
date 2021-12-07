import { Field, getDisplayProcessor } from '@grafana/data';
import { IDataVisualizationSettings } from 'Settings';
import chroma from 'chroma-js';

export class PhasorClock {
  private baseColor: string;
  private arrowColor: string;
  private secondaryColor: string;
  private showArrow: boolean;
  private showHeatmap: boolean;
  private heatMapData: Map<string, number>;
  private value: [number, number];
  private arrowWidth: number;
  private angLines: number[];
  private scale: number;
  private circleRadius: number[];
  private nominal: number;

  private magnitudes: number[];
  private angles: number[];

  Radius: number;
  Longitude: number;
  Latitude: number;

  constructor(fld: Field|undefined, lat: number, long: number, size: number, value: number ) {
    this.baseColor = "white";
    this.arrowColor = "red";
    this.secondaryColor = "black";
    this.showArrow = true;
    this.showHeatmap = false;
    this.heatMapData = new Map<string,number>();

    this.value = [0,10];
    this.Radius = 10;
    this.scale = 1;
    this.nominal = 1.0;
    this.arrowWidth = 1;
    this.angLines = [];
    this.circleRadius = [];

    this.magnitudes = [];
    this.angles = [];

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

    let result = `<g transform="rotate(-${this.value[1]}, ${this.Radius} ${this.Radius})">`;
    result += `<line x1="${this.Radius}" y1="${this.Radius}" x2="${this.Radius + this.scale*this.value[0] - arrowLength}" y2="${this.Radius}" stroke-width="${this.arrowWidth}" stroke="${this.arrowColor}"/>`
    result +=`<polygon points="${this.Radius + this.scale*this.value[0]} ${this.Radius}, ${this.Radius + this.scale*this.value[0] - arrowLength} ${this.Radius - arrowHeight}, ${this.Radius + this.scale*this.value[0] - arrowLength} ${this.Radius + arrowHeight}" fill="${this.arrowColor}"/>`
    result += "</g>";

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

    this.value[0] = value;
    this.magnitudes = fld.values.toArray();
    // Compute Radius and Circle color based on Field
    this.Radius = size;
    this.nominal = options.nominalVoltage ?? 161;
    this.baseColor = display(value).color ?? "#000000";

    // Add Mangitude Rings
    this.circleRadius = [];

    for (let r = (options.startMagnitude?? 140); r < Math.max(this.value[0], this.nominal); r = r + (options.stepMagnitude ?? 10)) {
      this.circleRadius.push(r);
      if (this.circleRadius.length > 100)
        break;
    }

    // Compute Scaling:
    this.scale = this.Radius / Math.max(this.value[0], this.nominal);

  }

  private ProcessPhaseField(fld: Field, size: number, value: number) {
    const options = (fld.config.custom["DataVis"] as IDataVisualizationSettings)
    const display = fld?.display ?? getDisplayProcessor({ field: fld  });

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
    this.value[1] = ang;

    this.angles = fld.values.toArray().map((v) => {
      let ang = v;
      while (ang < 0)
        ang = ang + 360;
      return ang;
    })

    //Compute Color and size of Arrow
    this.arrowWidth = size*0.1;
    this.arrowColor = display(value).color ?? "#ffffff";

    // Add Phase Lines
    this.angLines = [];
    const step = 360.0/(options.angleSegments ?? 4);
    for (let r = 0; r < 360.0; r = r + step) {
      this.angLines.push(r);
    }
   
    
  }

  private ProcessHeatMaps() {

    this.heatMapData = new Map<string, number>();

    if (this.magnitudes.length == 0 && this.angles.length == 0) 
      return;
    
      
    if (this.magnitudes.length > this.angles.length)
      this.angles = this.magnitudes.map((v,i) => i >= this.angles.length? 0 : this.angles[i]);
    if (this.angles.length > this.magnitudes.length)
      this.magnitudes = this.angles.map((v,i) => i >= this.magnitudes.length? this.nominal : this.magnitudes[i]);

    this.angles.forEach((v,i) => {
      let iPhase = this.angLines.findIndex( a => a > v);

      if (iPhase == -1)
        iPhase = 0;

      let iMag = this.circleRadius.findIndex(r => r > this.magnitudes[i]);
      if (iMag == -1)
        iMag = this.circleRadius.length;

      let key: string;

      if (this.magnitudes[i] < (this.circleRadius[0] ?? 100 ))
        key = "0";
      else
        key = iPhase.toString() + "-" + iMag.toString();

        this.heatMapData.set(key,(this.heatMapData.get(key)?? 0) + 1);
    })
  }
}