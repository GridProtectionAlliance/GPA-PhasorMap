import React from 'react';
import { FieldConfigEditorProps } from '@grafana/data';
import { Field, Input, Select, Switch } from '@grafana/ui';
import { DisplaySettings, TextMode} from '../Settings';

interface Props extends FieldConfigEditorProps<DisplaySettings,any> {}


export const DisplaySettingsEditor: React.FC<Props> = ({ item, value, onChange, context }) => {
   const [currentSettings, setCurrentSettings] = React.useState<DisplaySettings>(value);

  React.useEffect(() => { onChange(currentSettings);}, [currentSettings])
  
  
  return <> 
    <Field label={'Show Data Labels'} description={'Indicates whether the Data Labels should be shown.'}>
      <Switch value={currentSettings.Show} onChange={(v) => setCurrentSettings((d) => ({...d, Show: v.currentTarget.checked}))} css={undefined}/>
    </Field>
    {currentSettings.Show?
      <>
      <Field label={'Sticky Data Labels'} description={'If turned on the data labels will stick around if the user stops hovering.'}>
        <Switch value={currentSettings.Stick} onChange={(v) => setCurrentSettings((d) => ({...d, Stick: v.currentTarget.checked}))} css={undefined}/>
      </Field>
      <Field label={'Data Label Text mode'} description={'Text to show in the Data Label'}>
        <Select
            options={[{value: 'Value', label: 'Value'}, {value: 'Name', label: 'Name'}, {value: 'ValueName', label: 'Value and Name'}, {value: 'Custom', label: 'Custom'}]}
            value={currentSettings.TextMode}
            onChange={(v) => setCurrentSettings((d) => ({...d, TextMode: v.value as TextMode }))}
          />
        </Field>
        {currentSettings.TextMode == 'Custom'? <Field label={'Text'}  description={'The custom Text to be displayed in the Data Label.'}>
            <Input value={currentSettings.Text} onChange={(v) => { setCurrentSettings((d) => ({...d, Text: v.currentTarget?.value as string})) } } css={undefined}/>
          </Field> : null
        }
      </> : null
    }
  </>;
};
