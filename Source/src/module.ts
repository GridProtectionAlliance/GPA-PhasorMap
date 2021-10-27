import { PanelPlugin } from '@grafana/data';
import { PhasorMapPanel } from './PhasorMapPanel';
import { DataAggregation, DataVisualization, DisplaySettings, IPanelOptions } from './Settings';
import { BaseLayerSelect } from './EditorUI/BaseLayerSelect'
import { DisplaySettingsEditor } from 'EditorUI/DisplaySettings';
import { CustomLayerList } from 'EditorUI/CustomLayerUI';

export const plugin = new PanelPlugin<IPanelOptions>(PhasorMapPanel).useFieldConfig({
  disableStandardOptions: [],
  useCustomConfig: (builder) => {
    builder.addNumberInput({
      path: 'MinSize',
      name: 'Minimum size',
      description: 'Minimum Size of the Icon',
      defaultValue: 1,
      settings: {
        min: 0,
        max: 100
      }
    }).addNumberInput({
      path: 'MaxSize',
      name: 'Maximum size',
      description: 'Maximum Size of the Icon',
      defaultValue: 10,
      settings: {
        min: 0,
        max: 100
      }
    }).addSelect({
      path: 'DataVis',
      name: 'Data Marker',
      description: "Marker used to display Data Point",
      defaultValue: 'circle'as DataVisualization,
      settings: { 
        options:[
          {value: 'circle' as DataVisualization, label: 'Circle' },
          {value: 'triangle' as DataVisualization, label: 'Triangle' },
          {value: 'square' as DataVisualization, label: 'Square' }
       ]}
    }).addNumberInput({
      path: 'opacity',
      name: 'Opacity',
      description: 'Opacity of the Icon',
      defaultValue: 0.8,
      settings: {
        min: 0,
        max: 1.0
      }
    }).addSelect({
      path: 'DataAgg',
      name: 'Data Aggregation',
      description: "Method used to Aggregate the TimeSeries Data",
      defaultValue: 'average' as DataAggregation,
      settings: { 
        options:[
          {value: 'average' as DataAggregation, label: 'Average' },
          {value: 'last' as DataAggregation, label: 'Last Not Null' },
          {value: 'min' as DataAggregation, label: 'Min' },
          {value: 'max' as DataAggregation, label: 'Max' },
          {value: 'sum' as DataAggregation, label: 'Sum' },
          {value: 'count' as DataAggregation, label: 'Count' }
       ]}
    }).addCustomEditor({
      path: 'dataLabel',
      name: 'dataLabel',
      id: 'dataLabel',
      shouldApply: () => true,
      process: (v) => v as DisplaySettings, 
      override: DisplaySettingsEditor,
      defaultValue: {Show: false, Stick: false, Text: '', TextMode: 'Value'} as DisplaySettings,
      editor: DisplaySettingsEditor,
    });

  }
}).setPanelOptions(builder => {
  return builder
    .addNumberInput({
      path: 'CenterLat',
      name: 'Center Lat',
      description: 'Default Latitude the meap is centered on',
      category: ['Map Settings'],
      defaultValue: 35,
      settings: {
        max: 180,
        min: -180
      }
    }).addNumberInput({
      path: 'CenterLong',
      name: 'Center Long',
      description: 'Default Longitude the map is centered on',
      category: ['Map Settings'],
      defaultValue: -85,
      settings: {
        max: 180,
        min: -180
      }
    }).addNumberInput({
      path: 'defaultZoom',
      name: 'Zoom Level',
      description: 'Default Zoom level of the map',
      defaultValue: 3,
      category: ['Map Settings'],
      settings: {
        max: 20,
        min: 0
      }
  }).addNumberInput({
    path: 'zoomSnap',
    name: 'Zoom Snap',
    description: 'Zoom will be restricted to multiples of this number.',
    defaultValue: 1.0,
    category: ['Map Settings'],
    settings: {
      max: 5.0,
      min: 0
    }
}).addNumberInput({
  path: 'zoomDelta',
  name: 'Change in Zoom',
  description: 'This determines the change n zoom',
  defaultValue: 1.0,
  category: ['Map Settings'],
  settings: {
    max: 5.0,
    min: 0
  }
}).addBooleanSwitch({
  path:'allowMouseZoom',
  name: 'Allow Mousewheel Zoom',
  defaultValue: true,
  category: ['Map Settings']

}).addCustomEditor({
    id: 'tiles',
    path: 'tiles',
    name: 'Base Layer Map',
    category: ['Background Layer'],
    editor: BaseLayerSelect,
  }).addCustomEditor({
    id: 'layer',
    path: 'Layers',
    name: 'Additional Layers',
    category: ['Additional Layer'],
    editor: CustomLayerList,
  });

});