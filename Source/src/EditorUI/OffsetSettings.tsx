import React from 'react';
import { FieldConfigEditorProps } from '@grafana/data';
import { Field, Input, Select, Switch } from '@grafana/ui';
import { OffsetSettings, TextMode} from '../Settings';

interface Props extends FieldConfigEditorProps<OffsetSettings,any> {}


export const OffsetSettingsEditor: React.FC<Props> = ({ item, value, onChange, context }) => {
   const [currentSettings, setCurrentSettings] = React.useState<OffsetSettings>(value);

  React.useEffect(() => { onChange(currentSettings);}, [currentSettings])
  
  
  return <> 
          <Field label={'X Offset'}  description={'The horizontal offset. Poisitve is to the left, negative to the right.'}>
            <Input value={props.value.x}onChange={(v) => props.onChange({...props.value, x: parseFloat(v.currentTarget?.value ?? '0')})} css={undefined} type={'number'} min={-99999} max={99999}/>
          </Field>
          <Field label={'Y Offset'}  description={'The vertical offset. Poisitve is up (north), negative down (South).'}>
            <Input value={props.value.y}onChange={(v) => props.onChange({...props.value, y: parseFloat(v.currentTarget?.value ?? '0')})} css={undefined} type={'number'} min={-99999} max={99999}/>
          </Field>
        <Field label={'Screen based'} description={'Indicates whether the offset is based on screen measurments (px) or long/lat.'}>
          <Switch value={currentSettings.isPixel} onChange={(v) => setCurrentSettings((d) => ({...d, isPixel: v.currentTarget.checked}))} css={undefined}/>
        </Field>
  </>;
};
