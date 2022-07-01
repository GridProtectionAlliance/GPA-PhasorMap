import * as React from 'react';
import { Field, FieldType, getDisplayProcessor, PanelProps, Vector } from '@grafana/data';
import { CustomLayer, DataAggregation, DataVisualization, DisplaySettings, IDataVisualizationSettings, IGeoJson, IPanelOptions, ITileLayer, IWMSLayer, OffsetSettings } from './Settings';
import * as L from 'leaflet';
import { css, cx } from 'emotion';
import { stylesFactory } from '@grafana/ui';
import 'leaflet/dist/leaflet.css';
import _ from 'lodash';
import { PhasorClock } from './PhasorClock';

interface Props extends PanelProps<IPanelOptions> {}
interface IDataPoint { 
  Value: number, 
  Longitude: number, Latitude: number,
  Visualization: DataVisualization, Size: number, Color: string, Opacity: number,
  Showlabel: boolean, StickyLabel: boolean, Label?: string, 
  GeoJSON?: any, 
  Link?: string, 
  TargetBlank?: boolean,
  SVG?: string,
  Name?: string,
  Offset?: OffsetSettings
 }

interface Overlay {Layer: L.TileLayer|L.GeoJSON<any>, Enabled: boolean, Zoom: [number, number]}
export const PhasorMapPanel: React.FC<Props> = ({ options, data, width, height, replaceVariables }) => {
  const [guid, setGuid] = React.useState<string>('');
  const [map,setMap] = React.useState<L.Map|null>(null);
  const [dataLayer, setDataLayer] = React.useState<IDataPoint[]>([]);
  const [zoomlevel, setZoomLevel] = React.useState<number>(options.defaultZoom);
  const [overlays, setOverlays] = React.useState<Overlay[]>([])
  const [geoJsonFeatures,setGeoJsonFeatures] = React.useState<Map<string,any>>(new Map<string,any>());
  const [phasorClocks, setPhasorClocks] = React.useState<Map<string,PhasorClock>>(new Map<string,PhasorClock>());
  
  //const theme = useTheme();
  const styles = getStyles();

  React.useEffect(() => {
    setGuid('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }));
  }, []);

  React.useLayoutEffect(() => {
    if (guid === "")
      return;
    const mp = L.map(guid, {
            worldCopyJump: true,
            preferCanvas: true,
            center: [options.CenterLat,options.CenterLong],
			      zoom: options.defaultZoom,
			      zoomSnap: options.zoomSnap,
			      zoomDelta: options.zoomDelta
        });

    mp.createPane('overlays');
    const overlay = mp.getPane('overlays') 
    if (overlay != null) {
      overlay.style.zIndex = '350';
      overlay.style.pointerEvents = 'none';
    }

    mp.on('zoomend',() => { setZoomLevel(mp.getZoom())});
    setMap(mp)
    setZoomLevel(options.defaultZoom);
    return () => {mp.remove()}
  }, [width,height, guid])

  React.useEffect(() => {
    if (map == null)
      return;

    if (options.tiles == undefined)
      return;
    let layer = L.tileLayer(options.tiles.Host, {
			maxZoom: options.tiles.MaxZoom,
			subdomains:  options.tiles.SubDomain,
			detectRetina: true,
			attribution: options.tiles.Attribution,
		}).addTo(map);

    return () => { layer.remove(); }

  }, [options.tiles, map])


  React.useEffect(() => {
    if (map == null)
      return;
    map.setZoom(options.defaultZoom);
  }, [options.defaultZoom]);

  React.useEffect(() => {
    if (map == null)
      return;
    map.setView(new L.LatLng(options.CenterLat, options.CenterLong));
  }, [options.CenterLong, options.CenterLat]);

  React.useEffect(() => {
    if (map == null)
      return;

    const features: (L.CircleMarker<any> | L.Marker<any> | L.GeoJSON<any>)[] = dataLayer.map((d) => {
      const m = createMarker(d);
      createLink(m,d);
      if (d.Showlabel && d.Label !== undefined)
        createLabel(m,d);
      return m.addTo(map)
    });

    return () => {features.forEach(f => f.remove())}
    
  }, [map, dataLayer]);

  React.useEffect(() => {
    if (map == null)
      return;

    const clocks: PhasorClock[] = [];
    phasorClocks.forEach((c) => clocks.push(c))
    const features: (L.CircleMarker<any> | L.Marker<any> | L.GeoJSON<any>)[] = clocks.map((d) => {
      const m = createClock(d);
      return m.addTo(map)
    });

    return () => {features.forEach(f => f.remove())}
  },[ map, phasorClocks])

  React.useEffect(() => {
    const handle: JQuery.jqXHR<any>[] = [];

    let features = _.cloneDeep(geoJsonFeatures);

    let featureRequests: string[] = [];
    (options.Layers?.filter(item => item.type == 'geojson') ?? []).forEach((l) => {
      const link = replaceVariables((l as IGeoJson).link)
      if (featureRequests.includes(link))
        return;
      featureRequests.push(link);
      handle.push( $.getJSON(link).then(res => {
        features.set(link,res)
      }) as JQuery.jqXHR<any>);
    })

    if (data.state == 'Done')
      data.series.forEach((s) => {
        const valueField = s.fields.find((field) => field.type === FieldType.number);
        if (valueField == undefined)
          return;
        if ((valueField.config.custom["DataVis"] as IDataVisualizationSettings).type != 'custom') 
          return;

        let link = (valueField.config.custom["DataVis"] as IDataVisualizationSettings).link ?? "";
        link = link?.replace(/{Name}/gi, s.name??"");
        if (featureRequests.includes(link))
          return;
        featureRequests.push(link);
        handle.push( $.getJSON(link).then(res => {
          features.set(link,res)
        }) as JQuery.jqXHR<any>);
        
      });


    Promise.all(handle).then(() => setGeoJsonFeatures(features));

    return () => handle.forEach(h => {
      if (h != null && h.abort != null)
        h.abort();
    })

  },[options.Layers, data]);

  React.useEffect(() => {
    if (options.Layers == null)
      return;

    setOverlays(options.Layers.map(l => ({Enabled: l.minZoom <= zoomlevel && zoomlevel < l.maxZoom, Layer: GenerateLayer(l), Zoom: [l.minZoom,l.maxZoom]})))

  }, [options.Layers, geoJsonFeatures])

  /*
    Generates the Layer
  */
  function GenerateLayer(settings: CustomLayer): L.TileLayer|L.GeoJSON<any> {
    if (settings.type == 'tile') 
      return L.tileLayer((settings as ITileLayer).server.Host, {
          detectRetina: true,
          opacity: settings.opacity,
          pane: 'overlays',
          subdomains: (settings as ITileLayer).server.SubDomain,
      });
    if (settings.type == 'geojson')
    {
      const link = replaceVariables((settings as IGeoJson).link);
      let d;
      if (!geoJsonFeatures.has(link))
        d = $.getJSON(link).responseJSON
      else
        d = geoJsonFeatures.get(link);

      return L.geoJSON(d, {
        pane: 'overlays',
        style: function (feature) {
            let result: any = {};
            if (feature?.properties.stroke) {
                result["color"] = feature.properties.stroke;
                result["stroke"] = true;
            }
            else {
              result["color"] = (settings as IGeoJson).color;
              result["stroke"] = true;
            }
            if (feature?.properties.weight) {
                result["weight"] = feature.properties.weight;
                result["stroke"] = true;
            }
            else {
              result["weight"] = (settings as IGeoJson).stroke;
              result["stroke"] = true;
          }
            if (feature?.properties.fillColor) {
                result["fillColor"] = feature.properties.fillColor;
                result["fill"] = true;
            }
            else {
              result["fillColor"] = (settings as IGeoJson).color;
              result["fill"] = true;
          }
            if (feature?.properties.hasOwnProperty('fillOpacity')) {
                result["fillOpacity"] = feature.properties.fillOpacity;
                result["fill"] = true;

                if (feature.properties.fillOpacity === 0) {
                    result['fill'] = false;
                }
            }
            else
            {
              result["fillOpacity"] = settings.opacity;
              result["fill"] = true;

              if (settings.opacity === 0) {
                  result['fill'] = false;
              }
            }
            return result;
        }
    });
    }
    if (settings.type == 'wms') {
      const link = replaceVariables((settings as IWMSLayer).link);
      const layer = replaceVariables((settings as IWMSLayer).layer);

      return L.tileLayer.wms(link,{
        transparent: true,
        layers: layer,
        format: 'image/png',
        opacity: settings.opacity,
        pane: 'overlays',
    });
    }
    else
      return L.tileLayer((settings as ITileLayer).server.Host, {
        detectRetina: true,
        opacity: settings.opacity,
        pane: 'overlays',
        subdomains: (settings as ITileLayer).server.SubDomain,
    });

  }

  React.useEffect(() => {
    let updated = _.cloneDeep(overlays);

    updated.forEach((l) => {
      l.Enabled = l.Zoom[0] <= zoomlevel && zoomlevel < l.Zoom[1];
    })

    if (overlays.some((l,i) => l.Enabled !== updated[i].Enabled))
      setOverlays(updated);

  }, [zoomlevel]);

  React.useEffect(() => {
    if (map == null)
      return;
    
    overlays.forEach((l) => { if (l.Enabled) map.addLayer(l.Layer);});
    return () => { overlays.forEach(l => map.removeLayer(l.Layer))}
  }, [map, overlays])

  /*
    Create the correct Data markers on the map.
  */
  function createMarker(p: IDataPoint) {
    let long = p.Longitude;
    let lat = p.Latitude;
    let offsetX = 0;
    let offsetY = 0;

    if (p.Offset != null) {
      if (!p.Offset.isPixel) {
        long = p.Longitude - p.Offset.x;
        lat = p.Latitude + p.Offset.y;
      }
      else {
        offsetX = p.Offset.x;
        offsetY = p.Offset.y;
      }
    }

    if (p.Visualization == 'circle')
    return L.marker(
      [lat, long],
      { 
        icon: L.divIcon({className: cx(styles.wrapper, css`
        width: ${2*p.Size}px;
        height: ${2*p.Size}px;
        background: transparent;
        overflow: hidden;
        opacity: ${p.Opacity};
        margin-top: -${p.Size + offsetY}px;
        margin-left: -${p.Size + offsetX}px;
      `), html: `<svg style="width: 100%;height: 100%;"> <circle cx="${p.Size}" cy="${p.Size}" r="${p.Size}" fill="${p.Color}" /> </svg>`, iconSize: undefined
    })
      })

    if (p.Visualization == 'square')
      return  L.marker(
        [lat, long],
        { 
          icon: L.divIcon({className: cx(styles.wrapper, css`
          width: ${p.Size}px;
          height: ${p.Size}px;
          background-color: ${p.Color};
          overflow: hidden;
          opacity: ${p.Opacity};
          margin-top: -${0.5*p.Size + offsetY}px;
          margin-left: -${0.5*p.Size + offsetX}px;
        `
      ), iconSize: undefined, })
        }
      );
    if (p.Visualization == 'triangle')
      return L.marker(
        [lat, long],
        { 
          icon: L.divIcon({className: cx(styles.wrapper, css`
          width: ${p.Size}px;
          height: ${p.Size}px;
          background: transparent;
          overflow: hidden;
          border-left: ${p.Size}px solid transparent;
          border-right: ${p.Size}px solid transparent;
          border-bottom: ${p.Size}px solid ${p.Color};
          opacity: ${p.Opacity};
          margin-top: -${0.5*p.Size + offsetY}px;
          margin-left: -${p.Size + offsetX}px;
        `
      ), iconSize: undefined})
        }
      );
    if (p.Visualization == 'svg')
        return L.marker(
          [lat, long],
          { 
            icon: L.divIcon({className: cx(styles.wrapper, css`
            width: ${p.Size}px;
            height: ${p.Size}px;
            background: transparent;
            overflow: hidden;
            opacity: ${p.Opacity};
            margin-top: -${0.5*p.Size + offsetY}px;
            margin-left: -${0.5*p.Size + offsetX}px;
          `), html: ProcessUserSVG(p.SVG,p), iconSize: undefined
        })
          })
    else {
      return L.geoJSON(p.GeoJSON, {
        pane: 'overlays',
        style: function (feature) {
            let result: any = {};
            if (feature?.properties.stroke) {
                result["color"] = feature.properties.stroke;
                result["stroke"] = true;
            }
            else {
              result["color"] = p.Color;
              result["stroke"] = true;
            }
            if (feature?.properties.weight) {
                result["weight"] = feature.properties.weight;
                result["stroke"] = true;
            }
            else {
              result["weight"] = p.Size;
              result["stroke"] = true;
          }
            if (feature?.properties.fillColor) {
                result["fillColor"] = feature.properties.fillColor;
                result["fill"] = true;
            }
            else {
              result["fillColor"] = p.Color;
              result["fill"] = true;
          }
            if (feature?.properties.hasOwnProperty('fillOpacity')) {
                result["fillOpacity"] = feature.properties.fillOpacity;
                result["fill"] = true;

                if (feature.properties.fillOpacity === 0) {
                    result['fill'] = false;
                }
            }
            else
            {
              result["fillOpacity"] = p.Opacity;
              result["fill"] = true;

              if (p.Opacity) {
                  result['fill'] = false;
              }
            }
            return result;
        }
    });

    }
  }

  /*
    Parse JS from User Input.
  */
    function parseUserJS(obj: string,p: IDataPoint) {
      try {
        const preAmble = '"use strict";const Value='+ (p.Value.toString()) +';' + 'const Name=\'' + p.Name + '\';' + 'const Color=\'' + p.Color + '\';' + 'const Opacity=\'' + p.Opacity + '\';'
        return Function(preAmble+'return (' + obj + ')')();
      } catch (error) {
        console.error(error);
        return '';
      }
    }
  
    function ProcessUserSVG(txt: string|undefined,p: IDataPoint) {
      let parsed = txt ?? "";
      const regex = /\{([^\}]*)\}/g;
      const found = parsed.match(regex);

      if (found != null)
      	found.forEach(sec => {
        parsed = parsed.replace(sec, parseUserJS(sec.replace(/{/g,'').replace(/}/g,''),p))
        })
        
        return parsed
    }
  
 
   /*
    Create the Marker of the PhasoprClock on the map.
  */
    function createClock(p: PhasorClock) {

      return  L.marker(
        [p.Latitude, p.Longitude],
        { 
          icon: L.divIcon({className: cx(styles.wrapper, css`
          background-color: 'transparent';
          overflow: hidden;
          margin-top: 0px;
          margin-left: 0px;
        `
      ), html: p.DrawIcon(), 
      iconSize: new L.Point(2*p.Radius, 2*p.Radius)
    })
        }
        );
      
      
  
      
    }

    
  /*
    Generates the Leaflet Popup used as Datalabel if they are turned on.
  */
  function createLabel(m:(L.CircleMarker<any> | L.Marker<any> | L.GeoJSON<any>), d: IDataPoint ) {
        
    m.bindPopup(d.Label?? "", {
        offset: (window).L.point(0, -2),
        className: 'worldmap-popup',
        closeButton: d.StickyLabel,
    });

    m.on('mouseover', (evt: L.LeafletEvent) => {
            m.openPopup();
        });

    if (!d.StickyLabel)
      m.on('mouseout', function onMouseOut() {
        m.closePopup();
      });
        
  }

  function createLink(m:(L.CircleMarker<any> | L.Marker<any> | L.GeoJSON<any>), d: IDataPoint) {
    if (d.Link == undefined)
      return;

    if (d.TargetBlank ?? false)
    m.on('click', (evt: L.LeafletEvent) => {
      window.open(d.Link?? '', '_blank')
    });

    else
      m.on('click', (evt: L.LeafletEvent) => {
        window.location.href = d.Link?? '';

    });

  }

  React.useEffect(() => {
    if (data.state != 'Done')
      return;

    let minValue = Infinity; 
    let maxValue = -Infinity;

    data.series.forEach((s) => { 
      const valueField = s.fields.find((field) => field.type === FieldType.number);
      if (valueField == undefined)
        return;
      if (calcValue(valueField) < minValue)
        minValue = calcValue(valueField);
      if (calcValue(valueField)  > maxValue)
        maxValue = calcValue(valueField) ;
    });

    let updatedData: IDataPoint[] = data.series.filter((s) => {
      const valueField = s.fields.find((field) => field.type === FieldType.number);
      if (valueField == undefined)
        return true;
       return (valueField.config.custom["DataVis"] as IDataVisualizationSettings).type !== 'phasorMag' && (valueField.config.custom["DataVis"] as IDataVisualizationSettings).type !== 'phasorAng';
    }).map((s) => {
      const valueField = s.fields.find((field) => field.type === FieldType.number);
      if (valueField == undefined)
        return {Value: 0, Longitude: 0, Latitude: 0, Visualization: 'circle' , Size: 0, Color: '#ffffff', Opacity: 0.8, Showlabel: false, StickyLabel: false, GeoJSON: {}};

      
      const display = valueField?.display ?? getDisplayProcessor({ field: valueField  });
      const value = calcValue(valueField);

      const label = createLabelContent(valueField.config.custom["dataLabel"] as DisplaySettings, valueField, s.name?? "");
      let geoJson = null;
      let svg = null;

      if ((valueField.config.custom["DataVis"] as IDataVisualizationSettings).type == 'custom') {
        const dlink =  (valueField.config.custom["DataVis"] as IDataVisualizationSettings).link?.replace(/{Name}/gi, s.name?? "") ?? "";
        if (geoJsonFeatures.has(dlink))
          geoJson = geoJsonFeatures.get(dlink);
        else
          geoJson = $.getJSON(dlink).responseJSON
      }

      if ((valueField.config.custom["DataVis"] as IDataVisualizationSettings).type == 'svg') 
        svg =  (valueField.config.custom["DataVis"] as IDataVisualizationSettings).svgTxt ?? "";
      
      let dataLink = undefined;
      let targetBlank = false;
      if (valueField.config.links != undefined && valueField.config.links.length > 0){
        dataLink = valueField.config.links[0]["url"]?.replace(/{Name}/gi, s.name?? "") ?? "";;
        targetBlank = valueField.config.links[0]["targetBlank"] ?? false;
      }


      return {
        Value: value,
        Longitude: (s.meta?.custom?.Longitude ?? options.CenterLong), 
        Latitude: (s.meta?.custom?.Latitude ?? options.CenterLat), 
        Visualization: (valueField.config.custom["DataVis"] as IDataVisualizationSettings).type,
        Size: calcSize(minValue,maxValue,valueField.config.custom["MinSize"],valueField.config.custom["MaxSize"],value),
        Color: display(calcValue(valueField)).color ?? "#ffffff",
        Opacity: valueField.config.custom["opacity"],
        Showlabel: label.length > 0,
        Label: label,
        StickyLabel: valueField.config.custom["dataLabel"].Stick ?? false,
        GeoJSON: geoJson,
        Link: dataLink,
        TargetBlank: targetBlank,
        SVG: svg,
        Name: s.name ??'',
        Offset: valueField.config.custom["offset"],
        } as IDataPoint
    })
    setDataLayer(updatedData);

    let updatedClocks = new Map<string,PhasorClock>();
    data.series.filter((s) => {
      const valueField = s.fields.find((field) => field.type === FieldType.number);
      if (valueField == undefined)
        return false;
       return (valueField.config.custom["DataVis"] as IDataVisualizationSettings).type == 'phasorMag' || (valueField.config.custom["DataVis"] as IDataVisualizationSettings).type == 'phasorAng';
    }).forEach(s => {
      const valueField = s.fields.find((field) => field.type === FieldType.number);
      if (valueField == undefined)
        return;

      const long: number = s.meta?.custom?.Longitude ?? options.CenterLong;
      const lat: number = s.meta?.custom?.Latitude ?? options.CenterLat;
      const key = long.toFixed(9) + "*" + lat.toFixed(9);

      const val = calcValue(valueField);
      const size = calcSize(minValue,maxValue,valueField.config.custom["MinSize"],valueField.config.custom["MaxSize"],val)
      if (updatedClocks.has(key))
        updatedClocks.get(key)?.AddField(valueField,size,val);
      else
        updatedClocks.set(key, new PhasorClock(valueField, lat, long, size, val))
    })

    setPhasorClocks(updatedClocks);

  },[data,geoJsonFeatures])

  /*
    Creates the Content for the DataLabel based on the current Settings for each Series
  */
  function createLabelContent(settings: DisplaySettings, fld: Field<any, Vector<any>>, seriesName: string): string {


    if (!settings.Show)
      return "";
    
    const display = fld?.display ?? getDisplayProcessor({ field: fld  });
    const value = calcValue(fld);

    if (settings.TextMode == 'Custom')
     return settings.Text;
    if (settings.TextMode == "Value" )
      return (display(value).prefix) ?? "" + display(value).text + (display(value).suffix?? "");
    if (settings.TextMode == "Name")
      return seriesName;
  
    return seriesName + " " + (display(value).prefix ?? "") + display(value).text + (display(value).suffix?? "");


  }


  React.useEffect(() => {
    if (map == null)
      return;
    if (options.allowMouseZoom)
      map.scrollWheelZoom.enable();
    else
      map.scrollWheelZoom.disable();
  },[options.allowMouseZoom, map])

  /* 
    Calculate Sizing based on Min and Max Values
  */
  function calcSize(minValue: number, maxValue: number, minSize: number, maxSize: number, value: number): number {
   
    if (minValue == -Infinity)
      return maxSize;
    if (maxValue == Infinity)
      return minSize;
    
    
    const sizeRange = Math.abs(maxSize - minSize);
    const domain = Math.abs(maxValue - minValue);

    if (domain == 0)
      return (minSize + maxSize)*0.5;
    return sizeRange*(value-minValue)/domain + minSize;
  }

  /*
    Determines the value to use based on current Settings for each Series
  */
  function calcValue(fld: Field<any, Vector<any>>): number{
    const agg: DataAggregation = fld.config.custom["DataAgg"];

    if (agg == 'average')
      return fld.state?.calcs?.mean ?? 0;
    if (agg == 'min')
      return fld.state?.calcs?.min ?? 0;
    if (agg == 'max')
      return fld.state?.calcs?.max ?? 0;
    if (agg == 'sum')
      return fld.state?.calcs?.sum ?? 0;
    if (agg == 'count')
      return fld.state?.calcs?.count ?? 0;
    if (agg == 'last')
      return fld.state?.calcs?.lastNotNull ?? 0;
    
    return fld.values.get(0);
  }

  return ( <div id={guid} className={cx(styles.wrapper, css`
          width: ${width}px;
          height: ${height}px;
          background-color: transparent;
          overflow: hidden;
        `
      )}>

    </div>
  );
};

const getStyles = stylesFactory(() => {
  return {
    wrapper: css`
      position: relative;
    `,
  };
});
