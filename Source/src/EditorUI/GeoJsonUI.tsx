import React from 'react';
import { Field, Input, ColorPicker } from '@grafana/ui';

interface S {
  link: string,
  opacity: number,
  color: string,
  stroke: number
}
interface Props<T extends S> { 
  value: T,
  onChange: (val: T) => void
}

export function GeoJsonUI<T extends S>(props: Props<T>) {
  
  return <> 
      <Field label={'Link'}  description={'The URL for the GeoJSON File to be used.'}>
        <Input value={props.value.link} onChange={(v) => { props.onChange({...props.value, link: v.currentTarget?.value as string}) } } css={undefined}/>
      </Field>
      <Field label={'Stroke'} description={'Stroke Width if it is not defined in the GeoJSON.'}>
        <Input value={props.value.stroke} onChange={(v) => props.onChange({...props.value, stroke: parseFloat(v.currentTarget?.value ?? '1')})} css={undefined} type={'number'} min={0} max={20}/>
      </Field>
      <Field label={'Fill Color'} description={'Fill Color if it is not defined in the GeoJSON.'}>
        <ColorPicker color={props.value.color} onChange={(c) => props.onChange({...props.value, color: c}) }/>
      </Field>
    </>
};
