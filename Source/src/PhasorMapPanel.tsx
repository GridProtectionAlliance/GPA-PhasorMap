import * as React from 'react';
import { Field, FieldType, getDisplayProcessor, PanelProps, Vector } from '@grafana/data';
import { DataAggregation, DataVisualization, DisplaySettings, IPanelOptions } from 'Settings';
import * as L from 'leaflet';
import { css, cx } from 'emotion';
import { stylesFactory } from '@grafana/ui';
import 'leaflet/dist/leaflet.css';

interface Props extends PanelProps<IPanelOptions> {}
interface IDataPoint { Value: number, Longitude: number, Latitude: number, Visualization: DataVisualization, Size: number, Color: string, Opacity: number, Showlabel: boolean, StickyLabel: boolean, Label?: string }

export const PhasorMapPanel: React.FC<Props> = ({ options, data, width, height }) => {
  const [guid, setGuid] = React.useState<string>('');
  const [map,setMap] = React.useState<L.Map|null>(null);
  const [dataLayer, setDataLayer] = React.useState<IDataPoint[]>([]);

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
    setMap(mp)
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

    console.log('update features');

    const features: (L.CircleMarker<any> | L.Marker<any>)[] = dataLayer.map((d) => {
      const m = createMarker(d);
      if (d.Showlabel && d.Label !== undefined)
        createLabel(m,d);
      return m.addTo(map)
    });

    return () => {features.forEach(f => f.remove())}
    
  }, [map, dataLayer]);

  function createMarker(p: IDataPoint) {

    if (p.Visualization == 'circle')
      return L.circleMarker([p.Latitude, p.Longitude], {
        radius: p.Size,
        color: p.Color,
        fillColor: p.Color,
        fillOpacity: p.Opacity,
    })
    if (p.Visualization == 'square')
      return  L.marker(
        [p.Latitude, p.Longitude],
        { 
          icon: L.divIcon({className: cx(styles.wrapper, css`
          width: ${p.Size}px;
          height: ${p.Size}px;
          background-color: ${p.Color};
          overflow: hidden;
          opacity: ${p.Opacity}
        `
      )})
        }
      );
    else
      return L.marker(
        [p.Latitude, p.Longitude],
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
        `
      )})
        }
      );
  }

  function createLabel(m:(L.CircleMarker<any> | L.Marker<any>), d: IDataPoint ) {
        
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

  React.useEffect(() => {
    if (data.state != 'Done')
      return;

    let minValue = Infinity; 
    let maxValue = -Infinity;

    console.log(data);

    data.series.forEach((s) => { 
      const valueField = s.fields.find((field) => field.type === FieldType.number);
      if (valueField == undefined)
        return;
      if (calcValue(valueField) < minValue)
        minValue = calcValue(valueField);
      if (calcValue(valueField)  > maxValue)
        maxValue = calcValue(valueField) ;
    });

    let updatedData: IDataPoint[] = data.series.map((s) => {
      const valueField = s.fields.find((field) => field.type === FieldType.number);
      if (valueField == undefined)
        return {Value: 0, Longitude: 0, Latitude: 0, Visualization: 'circle' , Size: 0, Color: '#ffffff', Opacity: 0.8, Showlabel: false, StickyLabel: false};

      const display = valueField?.display ?? getDisplayProcessor({ field: valueField  });
      const value = calcValue(valueField);

      const label = createLabelContent(valueField.config.custom["dataLabel"] as DisplaySettings, valueField, s.name?? "");
      return {
        Value: value,
        Longitude: s.meta?.custom?.Longitude ?? options.CenterLong, 
        Latitude: s.meta?.custom?.Latitude ?? options.CenterLat, 
        Visualization: valueField.config.custom["DataVis"] as DataVisualization,
        Size: calcSize(minValue,maxValue,valueField.config.custom["MinSize"],valueField.config.custom["MaxSize"],value),
        Color: display(calcValue(valueField)).color ?? "#ffffff",
        Opacity: valueField.config.custom["opacity"],
        Showlabel: label.length > 0,
        Label: label,
        StickyLabel: valueField.config.custom["dataLabel"].Stick ?? false
        } as IDataPoint
    })
    setDataLayer(updatedData);
  },[data])

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
  
    return seriesName + " " + (display(value).prefix) ?? "" + display(value).text + (display(value).suffix?? "");


  }


  React.useEffect(() => {
    if (map == null)
      return;
    if (options.allowMouseZoom)
      map.scrollWheelZoom.enable();
    else
      map.scrollWheelZoom.disable();
  },[options.allowMouseZoom, map])

  /* Calculate Sizing based on Min and Max*/
  function calcSize(minValue: number, maxValue: number, minSize: number, maxSize: number, value: number): number {
   
    if (minValue == -Infinity)
      return maxSize;
    if (maxValue == Infinity)
      return minSize;
    const sizeRange = Math.abs(maxSize - minSize);
    const domain = Math.abs(maxValue - minValue);
    console.log('domain:' + domain);
    console.log(sizeRange*value/domain + minSize);
    if (domain == 0)
      return (minSize + maxSize)*0.5;
    return sizeRange*value/domain + minSize;
  }

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
