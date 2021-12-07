// ******************************************************************************************************
//  Settings.tsx - Gbtc
//
//  Copyright © 2021, Grid Protection Alliance.  All Rights Reserved.
//
//  Licensed to the Grid Protection Alliance (GPA) under one or more contributor license agreements. See
//  the NOTICE file distributed with this work for additional information regarding copyright ownership.
//  The GPA licenses this file to you under the MIT License (MIT), the "License"; you may not use this
//  file except in compliance with the License. You may obtain a copy of the License at:
//
//      http://opensource.org/licenses/MIT
//
//  Unless agreed to in writing, the subject software distributed under the License is distributed on an
//  "AS-IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. Refer to the
//  License for the specific language governing permissions and limitations.
//
//  Code Modification History:
//  ----------------------------------------------------------------------------------------------------
//  03/25/2021 - C Lackner
//       Generated original version of source code.
//

// ******************************************************************************************************
export interface IPanelOptions {
  CenterLong: number,
  CenterLat: number,
  tiles: TileServer,
  defaultZoom: number,
  zoomDelta: number,
  zoomSnap: number,
  allowMouseZoom: boolean,
  Layers: CustomLayer[]
}

/* Type Containing a single Tile Server */
export type TileServer = {
  Name: string,
  Host: string,
  SubDomain: string,
  Attribution: string,
  MinZoom: number,
  MaxZoom: number
}

export type DataAggregation = ('min'|'max'|'last'|'average'|'count'|'sum')
export type DataVisualization = ('circle'|'square'|'triangle'|'custom'|'phasorMag'|'phasorAng')
export interface IDataVisualizationSettings {
  type: DataVisualization,
  link?: string,
  angleSegments?: number,
  nominalVoltage?: number,
  startMagnitude?: number,
  stepMagnitude?: number,
  show?: ('value'|'heatmap'|'both'),
  secondaryColor?: string,
  phasorIndex?: number
}

export type DisplaySettings = {
  Show: boolean,
  Stick: boolean,
  TextMode: TextMode,
  Text: string,
}

export type TextMode = ('Value'|'Name'| 'ValueName'|'Custom')

export type LayerType = ('geojson'|'tile'|'wms'|'text')

export interface ILayer {
  type: LayerType,
  name: string,
  zIndex: number,
  minZoom: number, 
  maxZoom: number,
  opacity: number,
}

export interface ITileLayer extends ILayer  {
  server: TileServer,
}

export interface IGeoJson extends ILayer  {
  link: string,
  color: string,
  stroke: number
}

export interface IWMSLayer extends ILayer {
  link: string,
  layer: string
}

export type CustomLayer = (ITileLayer | IGeoJson | IWMSLayer)