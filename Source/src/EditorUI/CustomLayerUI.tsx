import React from 'react';
import { Button, CollapsableSection, Field, Input, Select } from '@grafana/ui';
import {CustomLayer, ILayer, IPanelOptions, LayerType} from '../Settings';
import { StandardEditorProps } from '@grafana/data';
import _ from 'lodash';
import { CustomTileServerUI } from './CustomTileServerUI';

interface Props extends StandardEditorProps<CustomLayer[],any,IPanelOptions> {}

export const CustomLayerList: React.FC<Props> = ({ item, value, onChange, context }) => {
  
  function ChangedLayer(index: number, layer: CustomLayer){
    const newList = _.cloneDeep(value);
    newList[index] = layer;
    onChange(newList);

  }

  function AddLayer() {

    let newList: CustomLayer[];
    if (value == null)
      newList = [];
    else
      newList = _.cloneDeep(value);

    let n = 1;
    while (newList.findIndex(item => item.name == ('Layer ' + n)) > -1 && newList.length > 0)
      n = n + 1;
    newList.push( {
      name: 'Layer ' + n,
      zIndex: 1,
      minZoom:  0,
      maxZoom: 20,
      type: 'tile',
      opacity: 1,
      server: {
        Attribution: 'Contact your Grafana Admin for Copyright Information',
        Host: "", 
        SubDomain: "",
        Name: "Custom",
        MinZoom: 0,
        MaxZoom: 20
      }
     })
    onChange(newList);
  }

  function RemoveLayer(index: number) {
    let newList: CustomLayer[];
    if (value == null)
      newList = [];
    else
      newList = _.cloneDeep(value);

    newList.splice(index,1);
    onChange(newList);
  }

  return <> 
    {value?.map((layer,i) => <> 
      <CollapsableSection label={layer?.name?? ""} isOpen={false} >
        <CustomLayerUI value={layer} onChange={(d) => ChangedLayer(i,d)} validateName={(n) => value.findIndex(item => item.name == n) == -1} remove={() => RemoveLayer(i)}/>
      </CollapsableSection>
    </>) ?? null}
    <Button variant={'primary'} key={'addLayer'} onClick={() => AddLayer()}>Add Layer</Button>
    </>
};

interface CustomLayerProps { value: CustomLayer, onChange: (val: CustomLayer) => void, validateName: (name: string) => boolean, remove: () => void }

const CustomLayerUI: React.FC<CustomLayerProps> = (props) => {
  const [name, setName] = React.useState<string>(props.value?.name ?? "Layer");
  const [validName, setValidName] = React.useState<boolean>(props.validateName(name));

  React.useEffect(() => {
    
    if (props.value?.name == name) {
      setValidName(true);
      return;
    }
      
    if (props.validateName(name)) {
      props.onChange({...props.value, name})
      setValidName(true);
    }
    else
      setValidName(false);
  }, [name])

  function ChangeType(val: LayerType) {
    if (val == props.value?.type)
      return;
    let newLayer: ILayer = {
      name: props.value?.name ?? '',
      zIndex: props.value?.zIndex ?? 1,
      minZoom: props.value?.minZoom ?? 0,
      maxZoom: props.value?.maxZoom ?? 20,
      type: val
     }

    if (val == 'tile')
      props.onChange({...newLayer, opacity: 1, server: {
        Attribution: 'Contact your Grafana Admin for Copyright Information',
        Host: "", 
        SubDomain: "",
        Name: "Custom",
        MinZoom: 0,
        MaxZoom: 20
      }})
  }

  return <>
  <Field label={'Layer Name'} description={'The name of the Layer showing up in the controls if applicable.'}>
    <Input value={name} onChange={(v) => setName(v.currentTarget?.value as string)} css={undefined} invalid={validName}/>
  </Field>
  <Field label={'Max Zoom'} description={'At any Zoom above this the Layer will be disabled.'}>
    <Input value={props.value.maxZoom}onChange={(v) => props.onChange({...props.value, maxZoom: parseFloat(v.currentTarget?.value ?? '20')})} css={undefined} type={'number'} min={0} max={20}/>
  </Field>
  <Field label={'Min Zoom'} description={'At any Zoom below this the Layer will be disabled.'}>
    <Input value={props.value.minZoom} onChange={(v) => props.onChange({...props.value, minZoom: parseFloat(v.currentTarget?.value ?? '0')})} css={undefined} type={'number'} min={0} max={20}/>
  </Field>
  <Field label={'Layer Type'} description={'The Type of Layer.'}>
    <Select options={[{value: 'tile', label: 'Tile Layer'}]} value={props.value?.type ?? "tile"} onChange={(s) => ChangeType((s.value ?? 'tile') as LayerType)} />
  </Field>
  {props.value.type == 'tile'?
  <CustomTileServerUI value={props.value.server} onChange={(d) => props.onChange({...props.value, server: d})}/>
  : null}

  <Button variant={'destructive'} key={props.value.name + 'remove'} onClick={() => props.remove()}>Delete {props.value.name}</Button>

   </>
}