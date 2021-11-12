import React from 'react';
import { Field, Input } from '@grafana/ui';

interface S {
  link: string,
  layer: string
}
interface Props<T extends S> { 
  value: T,
  onChange: (val: T) => void
}

export function WmsUI<T extends S>(props: Props<T>) {
  
  return <> 
      <Field label={'Link'}  description={'The URL for the WMS Layer to be used.'}>
        <Input value={props.value.link} onChange={(v) => { props.onChange({...props.value, link: v.currentTarget?.value as string}) } } css={undefined}/>
      </Field>
      <Field label={'Layer'} description={'The identifier of the layer to be used.'}>
      <Input value={props.value.layer} onChange={(v) => { props.onChange({...props.value, layer: v.currentTarget?.value as string}) } } css={undefined}/>
      </Field>
      
    </>
};
