import React from 'react';
import { FieldConfigEditorProps } from '@grafana/data';
import { Field, Input, Select } from '@grafana/ui';
import { DataVisualization, IDataVisualizationSettings} from '../Settings';

interface Props extends FieldConfigEditorProps<IDataVisualizationSettings,any> {}


export const DataDisplayUIEditor: React.FC<Props> = ({ item, value, onChange, context }) => {
   const [currentSettings, setCurrentSettings] = React.useState<IDataVisualizationSettings>(value);

  React.useEffect(() => { onChange(currentSettings);}, [currentSettings])
  
  
  return <> 
    <Field label={'Data Marker'} description={'Marker used to display Data PointText to show in the Data Label'}>
        <Select
            options={[
            {value: 'circle' as DataVisualization, label: 'Circle' },
            {value: 'triangle' as DataVisualization, label: 'Triangle' },
            {value: 'square' as DataVisualization, label: 'Square' },
            {value: 'custom' as DataVisualization, label: 'Custom GeoJSON' }
            ]}
            value={currentSettings.type}
            onChange={(v) => setCurrentSettings((d) => ({...d, type: v.value as DataVisualization }))}
          />
        </Field>
    {currentSettings.type == 'custom'?
      <Field label={'Link'}  description={'The URL for a custom GeoJson Feature. This Fields substitutes {Name} with the Name of the Signal. Color, Stroke width and Opacity are based on the Data.'}>
            <Input value={currentSettings.link} onChange={(v) => { setCurrentSettings((d) => ({...d, link: v.currentTarget?.value as string})) } } css={undefined}/>
      </Field>
        
       : null
    }
  </>;
};
