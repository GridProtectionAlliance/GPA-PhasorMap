import React from 'react';
import { FieldConfigEditorProps } from '@grafana/data';
import { ColorPicker, Field, Input, Select } from '@grafana/ui';
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
            {value: 'custom' as DataVisualization, label: 'Custom GeoJSON' },
            {value: 'phasorAng' as DataVisualization, label: 'Phasor Clock Angle' },
            {value: 'phasorMag' as DataVisualization, label: 'Phasor Clock Magnitude' }
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
    {currentSettings.type == 'phasorMag'?
    <>
      <Field label={'Nominal Voltage'}  description={'The nominal Voltage used in the Phasor Clock.'}>
            <Input value={currentSettings.nominalVoltage} type='number' onChange={(v) => { setCurrentSettings((d) => ({...d, nominalVoltage: parseFloat(v.currentTarget?.value as string ?? '161')})) } } css={undefined}/>
      </Field>
      <Field label={'Inner most Magnitude'}  description={'The Minimum Voltage that is being displayed.'}>
            <Input value={currentSettings.startMagnitude} type='number' onChange={(v) => { setCurrentSettings((d) => ({...d, startMagnitude: parseFloat(v.currentTarget?.value as string ?? '140')})) } } css={undefined}/>
      </Field>
      <Field label={'Magnitude Steps'}  description={'The steps in Magnitude displayed on the Clock.'}>
            <Input value={currentSettings.stepMagnitude} type='number' onChange={(v) => { setCurrentSettings((d) => ({...d, stepMagnitude: parseFloat(v.currentTarget?.value as string ?? '10')})) } } css={undefined}/>
      </Field>
    </> : null}
    {currentSettings.type == 'phasorAng'?
    <>
      <Field label={'Number of Segments'}  description={'The number of Angle Segments shown.'}>
            <Input value={currentSettings.angleSegments} type='number' onChange={(v) => { setCurrentSettings((d) => ({...d, angleSegments: parseInt(v.currentTarget?.value as string ?? '4')})) } } css={undefined}/>
      </Field>
      <Field label={'Phasor Visualization'}  description={'The visualization shown on the Phasor Clock.'}>
      <Select
            options={[
            {value: 'value' as ('value'|'heatmap'|'both'), label: 'Arrow' },
            {value: 'heatmap' as ('value'|'heatmap'|'both'), label: 'HeatMap' },
            {value: 'both' as ('value'|'heatmap'|'both'), label: 'Both' }           
            ]}
            value={currentSettings.show}
            onChange={(v) => { setCurrentSettings((d) => ({...d, show: v.value as ('value'|'heatmap'|'both') ?? 'value'})) } } />
      </Field>
      {currentSettings.show == 'both' || currentSettings.show == 'heatmap'? 
      <Field label={'Section border Color'}  description={'The color of the angle and magnitude lines.'}>
            <ColorPicker color={currentSettings?.secondaryColor ?? "#ffffff"} onChange={(v) => { setCurrentSettings((d) => ({...d, secondaryColor: v as string ?? 'black'})) } } />
      </Field> : null }value
    </> : null}
  </>;
};
