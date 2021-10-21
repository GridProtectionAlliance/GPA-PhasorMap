import React from 'react';
import { StandardEditorProps, SelectableValue } from '@grafana/data';
import { Field, Input, Select } from '@grafana/ui';
import {IPanelOptions, TileServer} from '../Settings';
import { CustomTileServerUI } from './CustomTileServerUI';

interface Props extends StandardEditorProps<TileServer,{showCustomOnly?: boolean},IPanelOptions> {}

const standardOptions: TileServer[] = [
  { 
    Name: 'CartoDB Positron',
    Attribution:  '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <br> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    Host: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    SubDomain: 'abcd',
    MinZoom: 0,
    MaxZoom: 19 
  },
  {
    Name:  'CartoDB Dark',
    Attribution:  '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <br> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    Host: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    SubDomain: 'abcd',
    MinZoom: 0,
    MaxZoom: 19  
  },
  {
    Name: 'OpenStreetMap Mapnik',
    Attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', 
    Host: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    SubDomain: 'abcd',
    MinZoom: 0,
    MaxZoom: 19 
  },
  {
    Name: 'Open Topo Map',
    Attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <br>' +
      '&copy; <a href="http://viewfinderpanoramas.org"> SRTM </a> <br>' +
      '&copy; <a href="https://opentopomap.org"> OpenTopoMap </a> <br>' +
      '&copy; (<a href="https://creativecommons.org/licenses/by-sa/3.0/"> CC-BY-SA </a>)',
    Host: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    SubDomain: 'abc',
    MinZoom: 0,
    MaxZoom: 17
  },
  {
    Name: 'Esri WorldPhysical',
    Attribution: 'Tiles &copy Esri — Source: US National Park Service',
    Host: 'https://se{s}ver.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
    SubDomain: 'r',
    MinZoom: 0,
    MaxZoom: 8
  },
  {
    Name: 'Esri NatGeo',
    Attribution: 'Tiles &copy Esri —  National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
    Host: 'https://se{s}ver.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
    SubDomain: 'r',
    MinZoom: 0,
     MaxZoom: 16
  },
  {
    Name: 'Esri WorldShaded',
    Attribution: 'Tiles &copy; Esri &mdash; Source: Esri',
    Host: 'https://se{s}ver.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    SubDomain: 'r',
    MinZoom: 0,
    MaxZoom: 13
  },
  {
    Name: 'Stamen Toner',
    Attribution: 'Map tiles by Stamen Design, under CC BY 3.0.<br> Data by OpenStreetMap, under CC BY SA',
    Host: 'http://til{s}.stamen.com/toner/{z}/{x}/{y}.png',
    SubDomain: 'e',
    MinZoom: 0,
    MaxZoom: 13
  },
  {
    Name: 'Stamen Terrain',
    Attribution: 'Tiles by Stamen Design, under CC BY 3.0. <br> Data by OpenStreetMap, under ODbL.',
    Host: 'http://til{s}.stamen.com/terrain/{z}/{x}/{y}.jpg',
    SubDomain: 'e',
    MinZoom: 0,
    MaxZoom: 13
  },
  {
    Name: 'Stamen Watercolor',
    Attribution: 'Tiles by Stamen Design, under CC BY 3.0. <br> Data by OpenStreetMap, under ODbL.',
    Host: 'http://til{s}.stamen.com/watercolor/{z}/{x}/{y}.jpg',
    SubDomain: 'e',
    MinZoom: 0,
    MaxZoom: 13
  }
];

export const TileServerSelector: React.FC<Props> = ({ item, value, onChange, context }) => {
   const availableOptions: SelectableValue<string>[] = standardOptions.map(item => ({value: item.Name, label: item.Name})).concat({value: "Custom", label: "Custom"});
   const [selectedServer, setSelectedServer] = React.useState<TileServer>(value);

   React.useEffect(() => { onChange(selectedServer);}, [selectedServer])
  
   function changedSelection(val: string|undefined){
     
    if (val == undefined) {
      setSelectedServer({Attribution: 'Contact your Grafana Admin for Copyright Information', Host: "", SubDomain: "", Name: "Custom", MinZoom: 0, MaxZoom: 20});
      return
    }
    const index = standardOptions.findIndex(ts => ts.Name == val);
    if (index == -1)
      setSelectedServer({Attribution: 'Contact your Grafana Admin for Copyright Information', Host: "", SubDomain: "", Name: "Custom", MinZoom: 0, MaxZoom: 20});
    else
      setSelectedServer(standardOptions[index]);
   }

  
  return <> 
    {(item.settings?.showCustomOnly ?? false)? <Select options={availableOptions} value={selectedServer?.Name ?? "Custom"} onChange={(s) => changedSelection(s.value)} /> : null}
    {selectedServer.Name == 'Custom'?
      <CustomTileServerUI value={selectedServer} onChange={(d) => setSelectedServer(d)} />
    : null}
  </>;
};
