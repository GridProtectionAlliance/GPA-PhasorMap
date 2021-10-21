import React from 'react';
import { Field, Input } from '@grafana/ui';
import {TileServer} from '../Settings';

interface Props { 
  value: TileServer,
  onChange: (val: TileServer) => void
}

export const CustomTileServerUI: React.FC<Props> = ({value, onChange}) => {
  
  return <> 
      <Field label={'Host'}  description={'The URL for the TileServer to be used.'}>
        <Input value={value.Host} onChange={(v) => { onChange({...value, Host: v.currentTarget?.value as string}) } } css={undefined}/>
      </Field>
      <Field label={'Subdomain'} description={'The Subdomain available on this TileServer.'}>
        <Input onChange={(v) => onChange({...value, SubDomain: v.currentTarget?.value as string})} value={value.SubDomain} css={undefined}/>
      </Field>
    </>
};
